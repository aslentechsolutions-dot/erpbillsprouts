-- Add stock restoration logic based on order status changes
-- When order is cancelled, add products back to stock

-- Create function to handle stock restoration when order is cancelled
CREATE OR REPLACE FUNCTION restore_stock_on_order_cancel()
RETURNS TRIGGER AS $$
BEGIN
  -- If order status changes to 'cancelled', restore the stock
  IF NEW.order_status = 'cancelled' AND OLD.order_status != 'cancelled' THEN
    -- Get all items from this order and restore their stock
    FOR item IN
      SELECT medicine_id, batch_id, quantity
      FROM customer_order_items
      WHERE order_id = NEW.id
    LOOP
      -- Restore stock by adding back the quantity
      PERFORM update_batch_stock(
        p_batch_id := item.batch_id,
        p_quantity_change := item.quantity  -- Positive number to ADD back
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_restore_stock_on_cancel ON customer_orders;

-- Create trigger that fires when order_status is updated
CREATE TRIGGER trigger_restore_stock_on_cancel
  AFTER UPDATE ON customer_orders
  FOR EACH ROW
  EXECUTE FUNCTION restore_stock_on_order_cancel();

-- Also update the stock reduction to happen on ORDER PLACED (in case it wasn't)
-- When order is created, reduce stock
CREATE OR REPLACE FUNCTION reduce_stock_on_order_create()
RETURNS TRIGGER AS $$
BEGIN
  -- Get all items for this new order and reduce stock
  FOR item IN
    SELECT medicine_id, batch_id, quantity
    FROM customer_order_items
    WHERE order_id = NEW.id
  LOOP
    -- Reduce stock
    PERFORM update_batch_stock(
      p_batch_id := item.batch_id,
      p_quantity_change := -(item.quantity)  -- Negative number to REDUCE
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_reduce_stock_on_order_create ON customer_orders;

-- Create trigger that fires when order is created
CREATE TRIGGER trigger_reduce_stock_on_order_create
  AFTER INSERT ON customer_orders
  FOR EACH ROW
  EXECUTE FUNCTION reduce_stock_on_order_create();

SELECT '✅ Stock restoration logic added!' AS status;
SELECT '📋 Stock is now reduced when order is placed' AS info1;
SELECT '📋 Stock is restored when order is cancelled' AS info2;
