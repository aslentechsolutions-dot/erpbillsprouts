-- Handle stock restoration when order is cancelled
-- Stock reduction happens in the app code after order items are created

-- Create function to restore stock when order is cancelled
CREATE OR REPLACE FUNCTION restore_stock_on_order_cancel()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
BEGIN
  -- If order status changes to 'cancelled', restore the stock
  IF NEW.order_status = 'cancelled' AND OLD.order_status != 'cancelled' THEN
    -- Get all items from this order and restore their stock
    FOR item IN
      SELECT batch_id, quantity
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

SELECT '✅ Stock restoration on cancel is now active!' AS status;
SELECT '📋 Stock is reduced in app when order is placed' AS info1;
SELECT '📋 Stock is restored in DB when order is cancelled' AS info2;
