-- Fix customer_orders RLS and constraints for admin updates
-- Run this in Supabase SQL Editor

-- First, let's make sure the admin update policy allows updates with CHECK
DROP POLICY IF EXISTS customer_orders_update_admin ON customer_orders;

CREATE POLICY customer_orders_update_admin ON customer_orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Also ensure the trigger doesn't cause issues
CREATE OR REPLACE FUNCTION update_customer_order_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set updated_at if column exists
  IF TG_OP = 'UPDATE' THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'customer_orders' 
      AND column_name = 'updated_at'
    ) THEN
      NEW.updated_at = NOW();
    END IF;
    
    -- Set paid_at when payment status changes to paid
    IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' 
        AND column_name = 'paid_at'
      ) THEN
        NEW.paid_at = NOW();
      END IF;
    END IF;
    
    -- Set delivered_at when order status changes to delivered
    IF NEW.order_status = 'delivered' AND (OLD.order_status IS NULL OR OLD.order_status != 'delivered') THEN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' 
        AND column_name = 'delivered_at'
      ) THEN
        NEW.delivered_at = NOW();
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_update_customer_order_timestamp ON customer_orders;
CREATE TRIGGER trigger_update_customer_order_timestamp
  BEFORE UPDATE ON customer_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_order_timestamp();

-- Grant UPDATE permission explicitly
GRANT UPDATE ON customer_orders TO authenticated;

SELECT 'RLS policies and trigger updated successfully!' AS status;
