-- ============================================================================
-- CRITICAL FIX: Deploy this FIRST to fix the database errors
-- ============================================================================
-- Error: column "sale_id" does not exist in invoices table
-- Reason: invoices table creation failed or was incomplete
-- Solution: Recreate invoices table and RPC function properly

-- ============================================================================
-- STEP 1: Drop problematic tables/functions (if they exist with errors)
-- ============================================================================

DROP TABLE IF EXISTS invoices CASCADE;
DROP FUNCTION IF EXISTS create_invoice(text, uuid, decimal, decimal, decimal, decimal, decimal, decimal, text, text, text, jsonb, uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS get_invoice_details(uuid) CASCADE;
DROP FUNCTION IF EXISTS mark_invoice_printed(uuid) CASCADE;

-- ============================================================================
-- STEP 2: Create invoices table CORRECTLY
-- ============================================================================

CREATE TABLE invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sale_id UUID NOT NULL UNIQUE,
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id UUID,
  invoice_date TIMESTAMPTZ DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  
  -- Invoice totals
  subtotal DECIMAL(12, 2) NOT NULL,
  discount DECIMAL(12, 2) DEFAULT 0,
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  taxable_amount DECIMAL(12, 2) NOT NULL,
  gst_amount DECIMAL(12, 2) NOT NULL,
  total DECIMAL(12, 2) NOT NULL,
  
  -- Payment info
  payment_method TEXT CHECK (payment_method IN ('cash', 'upi', 'card', 'bank_transfer', 'credit', 'cod', 'razorpay')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
  paid_amount DECIMAL(12, 2) DEFAULT 0,
  due_amount DECIMAL(12, 2) DEFAULT 0,
  
  -- Invoice details
  sale_type TEXT CHECK (sale_type IN ('retail', 'wholesale', 'distributor')),
  notes TEXT,
  
  -- Audit trail
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  printed_at TIMESTAMPTZ,
  
  -- Request deduplication
  idempotency_key TEXT UNIQUE,
  
  -- Constraints
  CONSTRAINT positive_subtotal CHECK (subtotal >= 0),
  CONSTRAINT positive_total CHECK (total >= 0)
);

-- Create indexes
CREATE INDEX idx_invoices_sale_id ON invoices(sale_id);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_created_at ON invoices(created_at);
CREATE INDEX idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX idx_invoices_idempotency_key ON invoices(idempotency_key);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoices_updated_at_trigger ON invoices;
CREATE TRIGGER invoices_updated_at_trigger
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_invoices_updated_at();

-- ============================================================================
-- STEP 3: Create the create_invoice RPC function
-- ============================================================================

CREATE OR REPLACE FUNCTION create_invoice(
  p_invoice_number TEXT,
  p_customer_id UUID,
  p_subtotal DECIMAL,
  p_discount DECIMAL,
  p_gst_amount DECIMAL,
  p_total DECIMAL,
  p_paid_amount DECIMAL,
  p_due_amount DECIMAL,
  p_payment_method TEXT,
  p_payment_status TEXT,
  p_sale_type TEXT,
  p_sale_items JSONB,
  p_created_by UUID,
  p_idempotency_key TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_sale_id UUID;
  v_invoice_id UUID;
  v_sale_item JSONB;
  v_current_stock INTEGER;
  v_available_quantity INTEGER;
BEGIN
  -- ========== VALIDATION ==========
  
  IF p_payment_method NOT IN ('cash', 'upi', 'card', 'bank_transfer', 'credit', 'cod', 'razorpay') THEN
    RAISE EXCEPTION 'Invalid payment method: %', p_payment_method;
  END IF;

  IF p_payment_status NOT IN ('pending', 'partial', 'paid') THEN
    RAISE EXCEPTION 'Invalid payment status: %', p_payment_status;
  END IF;

  IF p_sale_type NOT IN ('retail', 'wholesale', 'distributor') THEN
    RAISE EXCEPTION 'Invalid sale type: %', p_sale_type;
  END IF;

  IF p_subtotal < 0 OR p_discount < 0 OR p_gst_amount < 0 OR p_total < 0 THEN
    RAISE EXCEPTION 'Negative amounts not allowed';
  END IF;

  IF p_payment_status = 'paid' AND p_paid_amount < p_total THEN
    RAISE EXCEPTION 'Payment status "paid" requires paid_amount >= total';
  END IF;

  IF p_payment_status = 'pending' AND p_paid_amount > 0 THEN
    RAISE EXCEPTION 'Payment status "pending" requires paid_amount = 0';
  END IF;

  IF p_sale_items IS NULL OR jsonb_array_length(p_sale_items) = 0 THEN
    RAISE EXCEPTION 'Sale items cannot be empty';
  END IF;

  IF EXISTS (SELECT 1 FROM sales WHERE invoice_number = p_invoice_number) THEN
    RAISE EXCEPTION 'Invoice number already exists: %', p_invoice_number;
  END IF;

  -- ========== PRE-CHECK: VERIFY STOCK AVAILABILITY ==========
  
  FOR v_sale_item IN SELECT * FROM jsonb_array_elements(p_sale_items)
  LOOP
    SELECT COALESCE(current_quantity, 0) INTO v_current_stock
    FROM medicine_batches
    WHERE id = (v_sale_item->>'batch_id')::UUID;

    v_available_quantity := (v_sale_item->>'quantity')::INTEGER + COALESCE((v_sale_item->>'free_quantity')::INTEGER, 0);

    IF v_current_stock < v_available_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for batch %. Available: %, Required: %',
        v_sale_item->>'batch_id',
        v_current_stock,
        v_available_quantity;
    END IF;
  END LOOP;

  -- ========== CREATE SALE ==========
  
  INSERT INTO sales (
    invoice_number,
    customer_id,
    subtotal,
    discount,
    gst_amount,
    total,
    paid_amount,
    due_amount,
    payment_method,
    payment_status,
    sale_type,
    created_by,
    created_at
  )
  VALUES (
    p_invoice_number,
    p_customer_id,
    p_subtotal,
    p_discount,
    p_gst_amount,
    p_total,
    p_paid_amount,
    p_due_amount,
    p_payment_method,
    p_payment_status,
    p_sale_type,
    p_created_by,
    NOW()
  )
  RETURNING id INTO v_sale_id;

  -- ========== CREATE SALE ITEMS (triggers stock deduction) ==========
  
  FOR v_sale_item IN SELECT * FROM jsonb_array_elements(p_sale_items)
  LOOP
    INSERT INTO sale_items (
      sale_id,
      medicine_id,
      batch_id,
      quantity,
      free_quantity,
      selling_price,
      discount,
      gst_percentage,
      gst_amount,
      total,
      created_at
    )
    VALUES (
      v_sale_id,
      (v_sale_item->>'medicine_id')::UUID,
      (v_sale_item->>'batch_id')::UUID,
      (v_sale_item->>'quantity')::INTEGER,
      COALESCE((v_sale_item->>'free_quantity')::INTEGER, 0),
      (v_sale_item->>'selling_price')::DECIMAL,
      COALESCE((v_sale_item->>'discount')::DECIMAL, 0),
      COALESCE((v_sale_item->>'gst_percentage')::DECIMAL, 0),
      COALESCE((v_sale_item->>'gst_amount')::DECIMAL, 0),
      COALESCE((v_sale_item->>'total')::DECIMAL, 0),
      NOW()
    );
  END LOOP;

  -- ========== CREATE INVOICE ==========
  
  INSERT INTO invoices (
    sale_id,
    invoice_number,
    customer_id,
    invoice_date,
    subtotal,
    discount,
    taxable_amount,
    gst_amount,
    total,
    payment_method,
    payment_status,
    paid_amount,
    due_amount,
    sale_type,
    notes,
    created_by,
    created_at,
    idempotency_key
  )
  VALUES (
    v_sale_id,
    p_invoice_number,
    p_customer_id,
    NOW(),
    p_subtotal,
    p_discount,
    (p_subtotal - p_discount),
    p_gst_amount,
    p_total,
    p_payment_method,
    p_payment_status,
    p_paid_amount,
    p_due_amount,
    p_sale_type,
    p_notes,
    p_created_by,
    NOW(),
    p_idempotency_key
  )
  RETURNING id INTO v_invoice_id;

  -- ========== SUCCESS RESPONSE ==========
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Sale created successfully',
    'sale_id', v_sale_id,
    'invoice_id', v_invoice_id,
    'invoice_number', p_invoice_number,
    'total', p_total,
    'payment_status', p_payment_status
  );

EXCEPTION WHEN OTHERS THEN
  -- ========== ERROR HANDLING ==========
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'error_code', SQLSTATE
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_invoice TO authenticated;

-- ============================================================================
-- STEP 4: Add distributor customer type
-- ============================================================================

-- Drop old constraint
ALTER TABLE customers
  DROP CONSTRAINT IF EXISTS customers_customer_type_check;

-- Add new constraint with distributor
ALTER TABLE customers
  ADD CONSTRAINT customers_customer_type_check 
  CHECK (customer_type IN ('individual', 'retailer', 'wholesaler', 'distributor'));

-- Create index for customer_type filtering
CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON customers(customer_type);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if invoices table was created
SELECT 'invoices table' as check_item, COUNT(*) as count FROM information_schema.tables WHERE table_name = 'invoices'
UNION ALL
-- Check if RPC function exists
SELECT 'create_invoice function' as check_item, COUNT(*) as count FROM information_schema.routines WHERE routine_name = 'create_invoice' AND routine_schema = 'public'
UNION ALL
-- Check if customer_type accepts distributor
SELECT 'distributor type' as check_item, CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END as count FROM pg_constraint WHERE conname = 'customers_customer_type_check';

-- ============================================================================
-- END OF CRITICAL FIX
-- ============================================================================


-- ============================================================================
-- USER PROFILES TABLE - Deploy this to enable user management
-- ============================================================================

-- Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'pharmacist', 'staff', 'patient', 'retailer', 'wholesaler')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- Create index on role for filtering
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read all profiles (for admin dashboard)
CREATE POLICY "Allow authenticated users to read all profiles" 
ON public.user_profiles 
FOR SELECT 
TO authenticated 
USING (true);

-- Create policy to allow users to update their own profile
CREATE POLICY "Allow users to update their own profile" 
ON public.user_profiles 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- Create policy to allow admins to insert new profiles
CREATE POLICY "Allow admins to insert profiles" 
ON public.user_profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Create policy to allow admins to delete profiles
CREATE POLICY "Allow admins to delete profiles" 
ON public.user_profiles 
FOR DELETE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Create trigger function to automatically create user_profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, phone, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'staff')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Insert current authenticated user as admin if not exists
-- This should be run manually with the actual user ID
-- Example: INSERT INTO public.user_profiles (id, email, full_name, role) 
--          VALUES ('4760bc38-23a0-452a-b741-576ec16faedd', 'aslentechsolutions@gmail.com', 'Admin User', 'admin')
--          ON CONFLICT (id) DO UPDATE SET role = 'admin';

COMMENT ON TABLE public.user_profiles IS 'User profile information for all system users';
COMMENT ON COLUMN public.user_profiles.role IS 'User role: admin, pharmacist, staff, patient, retailer, wholesaler';
COMMENT ON COLUMN public.user_profiles.status IS 'User account status: active, inactive, suspended';

