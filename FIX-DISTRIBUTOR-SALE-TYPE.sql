-- ============================================================================
-- FIX: Add 'distributor' to sale_type constraint
-- ============================================================================
-- If you already ran DEPLOY-FIXES-FIRST.sql, run this to add distributor support
-- If you haven't run DEPLOY-FIXES-FIRST.sql yet, just use the updated version

-- Drop and recreate the constraint on sales table
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_sale_type_check;
ALTER TABLE sales ADD CONSTRAINT sales_sale_type_check 
  CHECK (sale_type IN ('retail', 'wholesale', 'distributor'));

-- Drop and recreate the constraint on invoices table
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_sale_type_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_sale_type_check 
  CHECK (sale_type IN ('retail', 'wholesale', 'distributor'));

-- Recreate the RPC function with distributor support
DROP FUNCTION IF EXISTS create_invoice(text, uuid, decimal, decimal, decimal, decimal, decimal, decimal, text, text, text, jsonb, uuid, text, text);

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
  p_idempotency_key TEXT,
  p_notes TEXT
)
RETURNS TABLE (
  invoice_id UUID,
  sale_id_out UUID,
  created_invoice_number TEXT,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_sale_id UUID;
  v_batch_id UUID;
  v_item_quantity INTEGER;
  v_item_price DECIMAL;
  v_item_record RECORD;
BEGIN
  -- Validate inputs
  IF p_invoice_number IS NULL OR p_invoice_number = '' THEN
    RAISE EXCEPTION 'Invoice number cannot be empty';
  END IF;

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

  -- Create sale record
  INSERT INTO sales (
    customer_id,
    sale_type,
    subtotal,
    discount,
    discount_percentage,
    gst_amount,
    total,
    payment_method,
    payment_status,
    paid_amount,
    due_amount,
    notes,
    created_by,
    created_at,
    invoice_number
  ) VALUES (
    p_customer_id,
    p_sale_type,
    p_subtotal,
    p_discount,
    0,
    p_gst_amount,
    p_total,
    p_payment_method,
    p_payment_status,
    p_paid_amount,
    p_due_amount,
    p_notes,
    p_created_by,
    NOW(),
    p_invoice_number
  ) RETURNING id INTO v_sale_id;

  -- Create sale items
  FOR v_item_record IN SELECT * FROM jsonb_to_recordset(p_sale_items) AS x(
    medicine_id UUID,
    medicine_batch_id UUID,
    quantity INTEGER,
    price DECIMAL
  ) LOOP
    INSERT INTO sale_items (
      sale_id,
      medicine_id,
      medicine_batch_id,
      quantity,
      price,
      created_at
    ) VALUES (
      v_sale_id,
      v_item_record.medicine_id,
      v_item_record.medicine_batch_id,
      v_item_record.quantity,
      v_item_record.price,
      NOW()
    );

    -- Deduct stock
    UPDATE medicine_batches
    SET current_quantity = current_quantity - v_item_record.quantity
    WHERE id = v_item_record.medicine_batch_id;
  END LOOP;

  -- Create invoice record
  INSERT INTO invoices (
    sale_id,
    invoice_number,
    customer_id,
    subtotal,
    discount,
    discount_percentage,
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
    updated_at,
    idempotency_key
  ) VALUES (
    v_sale_id,
    p_invoice_number,
    p_customer_id,
    p_subtotal,
    p_discount,
    0,
    p_subtotal - p_discount,
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
    NOW(),
    p_idempotency_key
  );

  -- Return success
  RETURN QUERY SELECT
    v_sale_id::UUID as invoice_id,
    v_sale_id::UUID as sale_id_out,
    p_invoice_number as created_invoice_number,
    TRUE as success,
    'Invoice created successfully'::TEXT as message;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT
    NULL::UUID as invoice_id,
    NULL::UUID as sale_id_out,
    p_invoice_number as created_invoice_number,
    FALSE as success,
    SQLERRM as message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Done
SELECT 'Distributor sale type support added successfully' as status;
