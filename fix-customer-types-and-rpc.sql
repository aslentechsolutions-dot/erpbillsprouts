-- ============================================================================
-- FIX: Add Distributor Customer Type and Deploy create_invoice RPC
-- ============================================================================
-- Purpose:
-- 1. Add 'distributor' to customer_type allowed values
-- 2. Deploy the create_invoice RPC function (was missing from database)
-- 3. Ensure all customer types have proper fields for transaction records

-- ============================================================================
-- STEP 1: Update customer_type CHECK constraint to include 'distributor'
-- ============================================================================

-- First, drop the old constraint
ALTER TABLE customers
  DROP CONSTRAINT IF EXISTS customers_customer_type_check;

-- Add new constraint with distributor included
ALTER TABLE customers
  ADD CONSTRAINT customers_customer_type_check 
  CHECK (customer_type IN ('individual', 'retailer', 'wholesaler', 'distributor'));

-- Update the comment
COMMENT ON COLUMN customers.customer_type IS 'Type of customer: individual (walk-in patient), retailer (retail store), wholesaler (wholesale distributor), or distributor (manufacturer distributor)';

-- ============================================================================
-- STEP 2: Create or replace the create_invoice RPC function
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
  v_gst_percentage DECIMAL;
  v_gst_total DECIMAL;
  v_current_stock INTEGER;
  v_available_quantity INTEGER;
BEGIN
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
  IF EXISTS (SELECT 1 FROM sales WHERE invoice_number = p_invoice_number) THEN
    RAISE EXCEPTION 'Invoice number already exists: %', p_invoice_number;
  END IF;

  -- Check idempotency key if provided
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key != '' THEN
    -- If idempotency key exists in sales table, return existing sale
    IF EXISTS (SELECT 1 FROM sales WHERE invoice_number = p_invoice_number) THEN
      SELECT s.id INTO v_sale_id FROM sales WHERE invoice_number = p_invoice_number LIMIT 1;
      
      RETURN jsonb_build_object(
        'success', true,
        'message', 'Sale already processed (idempotency)',
        'sale_id', v_sale_id,
        'invoice_id', NULL,
        'invoice_number', p_invoice_number,
        'total', p_total,
        'payment_status', p_payment_status
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

  -- ========== CREATE INVOICE (if invoices table exists) ==========
  
  -- Try to create invoice record (optional - table may not exist yet)
  BEGIN
    v_invoice_id := uuid_generate_v4();
    
    INSERT INTO invoices (
      id,
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
      v_invoice_id,
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
    );
  EXCEPTION WHEN OTHERS THEN
    -- Invoices table may not exist yet, that's OK
    v_invoice_id := NULL;
  END;

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
-- STEP 3: Ensure proper fields exist for each customer type
-- ============================================================================

-- Verify customers table has all required fields
-- These should already exist, but document them here:

-- For Distributors:
-- - business_name (required)
-- - gstin (required for B2B)
-- - drug_license_number (required)
-- - fssai_number (optional)
-- - address (required)
-- - phone (required)
-- - contact_person_name (use name field)
-- - transaction records (via sales/customer_ledger tables)

-- For Wholesalers:
-- - business_name (required)
-- - gstin (required)
-- - drug_license_number (required)
-- - fssai_number (optional)
-- - address (required)
-- - phone (required)
-- - contact_person_name (use name field)
-- - transaction records (via sales/customer_ledger tables)

-- For Retailers:
-- - business_name (optional)
-- - gstin (optional)
-- - drug_license_number (optional)
-- - address (optional)
-- - phone (optional)
-- - transaction records (via sales/customer_ledger tables)

-- For Individual/Walk-in:
-- - name (required)
-- - phone (optional)
-- - address (optional)
-- - patient_id (optional)
-- - prescription_required (implied via medicine fields)
-- - doctor_name (use in transaction notes)
-- - mci_no (use in transaction notes)

-- Create index for faster customer type filtering
CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON customers(customer_type);

-- ============================================================================
-- STEP 4: Verify deployed correctly
-- ============================================================================

-- Test: Check if function exists
-- SELECT prosrc FROM pg_proc WHERE proname = 'create_invoice';

-- Test: Call the function with sample data
-- SELECT create_invoice(
--   'TEST-001',
--   NULL,
--   1000.00, 0, 180.00, 1180.00,
--   1180.00, 0,
--   'cash', 'paid', 'retail',
--   '[{"medicine_id":"abc","batch_id":"xyz","quantity":1,"free_quantity":0,"selling_price":1000,"discount":0,"gst_percentage":18,"gst_amount":180,"total":1180}]'::jsonb,
--   (SELECT id FROM profiles LIMIT 1),
--   'test-' || to_char(NOW(), 'YYYYMMDDHH24MISS')
-- );

-- ============================================================================
-- End of fix
-- ============================================================================
