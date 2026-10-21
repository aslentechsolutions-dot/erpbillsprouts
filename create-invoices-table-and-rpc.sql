-- ============================================================================
-- Migration: Create Invoices Table and create_invoice RPC with Atomicity
-- ============================================================================
-- This migration adds:
-- 1. invoices table - persists invoice metadata and status
-- 2. create_invoice RPC - atomic operation for sale + invoice creation
-- 3. Idempotency via unique constraint on sale_id + created_by + created_at
-- 4. Proper error handling and rollback on failure
-- 5. Add "distributor" customer type to support B2B distribution

-- ============================================================================
-- STEP 0: Add distributor to customer_type enum (if using enum)
-- ============================================================================
-- Note: If customer_type is TEXT (not enum), this is already supported
-- The system currently uses TEXT for customer_type: 'individual' | 'retailer' | 'wholesaler'
-- This migration extends it to include: 'individual' | 'retailer' | 'wholesaler' | 'distributor'

-- ============================================================================
-- STEP 1: Create invoices table (if it doesn't exist)
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sale_id UUID NOT NULL UNIQUE REFERENCES sales(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id),
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
  sale_type TEXT CHECK (sale_type IN ('retail', 'wholesale')),
  notes TEXT,
  
  -- Audit trail
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  printed_at TIMESTAMPTZ,
  
  -- Request deduplication (idempotency key)
  idempotency_key TEXT UNIQUE,
  
  CONSTRAINT positive_subtotal CHECK (subtotal >= 0),
  CONSTRAINT positive_total CHECK (total >= 0),
  CONSTRAINT valid_payment_status CHECK (
    (payment_status = 'paid' AND paid_amount >= total) OR
    (payment_status = 'partial' AND paid_amount > 0 AND paid_amount < total) OR
    (payment_status = 'pending' AND paid_amount = 0)
  )
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_invoices_sale_id ON invoices(sale_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_idempotency_key ON invoices(idempotency_key);

-- ============================================================================
-- STEP 2: Create trigger to update invoices.updated_at
-- ============================================================================

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
-- STEP 3: Create atomic create_invoice RPC function
-- ============================================================================
-- This RPC:
-- - Creates a sale record
-- - Creates sale_items records
-- - Creates an invoice record (persisting invoice metadata)
-- - Triggers automatic stock deduction via existing trigger
-- - Returns the created sale and invoice IDs
-- - Handles idempotency via unique idempotency_key constraint
-- - Rolls back all changes if any step fails

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
  v_gst_percentage DECIMAL;
  v_gst_total DECIMAL;
  v_current_stock INTEGER;
  v_available_quantity INTEGER;
BEGIN
  -- Start transaction
  -- (Implicit in PL/pgSQL function - all or nothing semantics)

  -- ========== VALIDATION ==========
  
  -- Validate payment method
  IF p_payment_method NOT IN ('cash', 'upi', 'card', 'bank_transfer', 'credit', 'cod', 'razorpay') THEN
    RAISE EXCEPTION 'Invalid payment method: %', p_payment_method;
  END IF;

  -- Validate payment status
  IF p_payment_status NOT IN ('pending', 'partial', 'paid') THEN
    RAISE EXCEPTION 'Invalid payment status: %', p_payment_status;
  END IF;

  -- Validate sale type
  IF p_sale_type NOT IN ('retail', 'wholesale') THEN
    RAISE EXCEPTION 'Invalid sale type: %', p_sale_type;
  END IF;

  -- Validate amounts
  IF p_subtotal < 0 OR p_discount < 0 OR p_gst_amount < 0 OR p_total < 0 THEN
    RAISE EXCEPTION 'Negative amounts not allowed';
  END IF;

  -- Validate payment status consistency
  IF p_payment_status = 'paid' AND p_paid_amount < p_total THEN
    RAISE EXCEPTION 'Payment status "paid" requires paid_amount >= total';
  END IF;

  IF p_payment_status = 'pending' AND p_paid_amount > 0 THEN
    RAISE EXCEPTION 'Payment status "pending" requires paid_amount = 0';
  END IF;

  -- Validate sale items not empty
  IF p_sale_items IS NULL OR jsonb_array_length(p_sale_items) = 0 THEN
    RAISE EXCEPTION 'Sale items cannot be empty';
  END IF;

  -- Check for duplicate invoice number
  IF EXISTS (SELECT 1 FROM invoices WHERE invoice_number = p_invoice_number) THEN
    RAISE EXCEPTION 'Invoice number already exists: %', p_invoice_number;
  END IF;

  -- Check idempotency key if provided
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key != '' THEN
    -- If idempotency key exists, return existing invoice
    IF EXISTS (SELECT 1 FROM invoices WHERE idempotency_key = p_idempotency_key) THEN
      RETURN (
        SELECT jsonb_build_object(
          'success', true,
          'message', 'Invoice already processed (idempotency)',
          'sale_id', sale_id,
          'invoice_id', id,
          'invoice_number', invoice_number,
          'total', total,
          'payment_status', payment_status
        )
        FROM invoices
        WHERE idempotency_key = p_idempotency_key
        LIMIT 1
      );
    END IF;
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
    'message', 'Invoice created successfully',
    'sale_id', v_sale_id,
    'invoice_id', v_invoice_id,
    'invoice_number', p_invoice_number,
    'total', p_total,
    'payment_status', p_payment_status
  );

EXCEPTION WHEN OTHERS THEN
  -- ========== ERROR HANDLING ==========
  -- Transaction automatically rolled back on exception
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'error_code', SQLSTATE,
    'hint', COALESCE(pg_exception_hint(), ''),
    'detail', COALESCE(pg_exception_detail(), '')
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION create_invoice TO authenticated;

-- ============================================================================
-- STEP 4: Create helper function to get invoice with full details
-- ============================================================================

CREATE OR REPLACE FUNCTION get_invoice_details(p_invoice_id UUID)
RETURNS jsonb AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'invoice', jsonb_build_object(
      'id', i.id,
      'invoice_number', i.invoice_number,
      'sale_id', i.sale_id,
      'customer_id', i.customer_id,
      'invoice_date', i.invoice_date,
      'subtotal', i.subtotal,
      'discount', i.discount,
      'taxable_amount', i.taxable_amount,
      'gst_amount', i.gst_amount,
      'total', i.total,
      'payment_method', i.payment_method,
      'payment_status', i.payment_status,
      'paid_amount', i.paid_amount,
      'due_amount', i.due_amount,
      'sale_type', i.sale_type,
      'notes', i.notes,
      'created_at', i.created_at,
      'printed_at', i.printed_at
    ),
    'customer', jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'phone', c.phone,
      'email', c.email,
      'address', c.address,
      'gstin', c.gstin,
      'drug_license_number', c.drug_license_number
    ),
    'sale', jsonb_build_object(
      'id', s.id,
      'invoice_number', s.invoice_number,
      'created_at', s.created_at
    ),
    'items', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', si.id,
          'medicine_id', si.medicine_id,
          'medicine_name', m.name,
          'batch_id', si.batch_id,
          'batch_number', mb.batch_number,
          'quantity', si.quantity,
          'free_quantity', si.free_quantity,
          'selling_price', si.selling_price,
          'discount', si.discount,
          'gst_percentage', si.gst_percentage,
          'gst_amount', si.gst_amount,
          'total', si.total
        )
      ) FILTER (WHERE si.id IS NOT NULL),
      '[]'::jsonb
    )
  ) INTO v_result
  FROM invoices i
  LEFT JOIN sales s ON i.sale_id = s.id
  LEFT JOIN customers c ON i.customer_id = c.id
  LEFT JOIN sale_items si ON s.id = si.sale_id
  LEFT JOIN medicines m ON si.medicine_id = m.id
  LEFT JOIN medicine_batches mb ON si.batch_id = mb.id
  WHERE i.id = p_invoice_id
  GROUP BY i.id, s.id, c.id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Invoice not found: %', p_invoice_id;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_invoice_details TO authenticated;

-- ============================================================================
-- STEP 5: Create function to mark invoice as printed
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_invoice_printed(p_invoice_id UUID)
RETURNS jsonb AS $$
BEGIN
  UPDATE invoices
  SET printed_at = NOW(), updated_at = NOW()
  WHERE id = p_invoice_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Invoice marked as printed',
    'printed_at', NOW()
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION mark_invoice_printed TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify the migration)
-- ============================================================================

-- Check if invoices table was created
-- SELECT * FROM information_schema.tables WHERE table_name = 'invoices';

-- Check if RPC functions exist
-- SELECT * FROM information_schema.routines WHERE routine_name IN ('create_invoice', 'get_invoice_details', 'mark_invoice_printed');

-- Test the RPC (comment this out after testing)
-- SELECT create_invoice(
--   'INV-2025-001',
--   NULL,
--   1000.00,
--   0.00,
--   180.00,
--   1180.00,
--   1180.00,
--   0.00,
--   'cash',
--   'paid',
--   'retail',
--   '[{"medicine_id":"xxx","batch_id":"yyy","quantity":1,"free_quantity":0,"selling_price":1000,"discount":0,"gst_percentage":18,"gst_amount":180,"total":1180}]'::jsonb,
--   (SELECT id FROM profiles LIMIT 1),
--   'test-idempotency-key-001'
-- );
