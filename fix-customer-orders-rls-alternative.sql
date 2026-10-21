-- Alternative fix: More permissive admin policy for customer_orders
-- Run this if the previous fix didn't work

-- Drop existing admin update policy
DROP POLICY IF EXISTS customer_orders_update_admin ON customer_orders;

-- Create a more permissive policy for admins
-- This allows admins to update ANY order regardless of customer_id
CREATE POLICY customer_orders_update_admin ON customer_orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    -- Allow admin to update to any valid value
    true
  );

-- Also add a policy for customers to update their own orders (if they need to)
DROP POLICY IF EXISTS customer_orders_update_own ON customer_orders;

CREATE POLICY customer_orders_update_own ON customer_orders
  FOR UPDATE
  TO authenticated
  USING (
    customer_id = auth.uid()
  )
  WITH CHECK (
    customer_id = auth.uid()
  );

-- Verify the policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd
FROM pg_policies 
WHERE tablename = 'customer_orders'
ORDER BY policyname;

SELECT 'Alternative RLS policy created successfully!' AS status;
