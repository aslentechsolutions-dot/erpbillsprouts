-- Create RPC function to update batch stock quantities
CREATE OR REPLACE FUNCTION update_batch_stock(
  p_batch_id UUID,
  p_quantity_change INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_current_stock INTEGER;
  v_new_stock INTEGER;
BEGIN
  -- Get current stock
  SELECT stock_quantity INTO v_current_stock
  FROM batch_details
  WHERE id = p_batch_id;

  IF v_current_stock IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Batch not found'
    );
  END IF;

  -- Calculate new stock
  v_new_stock := v_current_stock + p_quantity_change;

  -- Prevent negative stock
  IF v_new_stock < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient stock'
    );
  END IF;

  -- Update stock
  UPDATE batch_details
  SET stock_quantity = v_new_stock
  WHERE id = p_batch_id;

  RETURN jsonb_build_object(
    'success', true,
    'previous_stock', v_current_stock,
    'new_stock', v_new_stock,
    'change', p_quantity_change
  );
END;
$$ LANGUAGE plpgsql;

SELECT '✅ update_batch_stock RPC function created!' AS status;
