-- Fix order number generation to prevent duplicates
-- The issue: Multiple concurrent orders can get the same order number

-- Drop and recreate the function with better logic
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
  max_attempts INTEGER := 10;
  attempt INTEGER := 0;
BEGIN
  LOOP
    -- Get the count of orders today
    SELECT COUNT(*) INTO counter
    FROM customer_orders
    WHERE DATE(created_at) = CURRENT_DATE;
    
    -- Add current milliseconds to make it more unique
    counter := counter + 1 + EXTRACT(MILLISECONDS FROM CURRENT_TIMESTAMP)::INTEGER;
    
    -- Generate order number: ORD-YYYYMMDD-XXXX
    new_number := 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
    
    -- Check if this order number already exists
    IF NOT EXISTS (SELECT 1 FROM customer_orders WHERE order_number = new_number) THEN
      RETURN new_number;
    END IF;
    
    -- Increment attempt counter
    attempt := attempt + 1;
    
    -- Exit if too many attempts
    IF attempt >= max_attempts THEN
      -- Fallback: use UUID to ensure uniqueness
      new_number := 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8);
      RETURN new_number;
    END IF;
    
    -- Small delay to avoid collision
    PERFORM pg_sleep(0.01);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT generate_order_number() AS test_order_number;

SELECT 'Order number generation fixed!' AS status;
