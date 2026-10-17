-- Diagnose and fix payment_status constraint issue
-- Run this in Supabase SQL Editor

-- Step 1: Check current constraint on payment_status
SELECT 
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'customer_orders'
AND con.conname LIKE '%payment_status%';

-- Step 2: Check what values currently exist in the table
SELECT DISTINCT payment_status 
FROM customer_orders 
ORDER BY payment_status;

-- Step 3: Drop the old constraint if it exists
ALTER TABLE customer_orders 
DROP CONSTRAINT IF EXISTS customer_orders_payment_status_check;

-- Step 4: Add a new constraint with correct values
ALTER TABLE customer_orders 
ADD CONSTRAINT customer_orders_payment_status_check 
CHECK (payment_status IN ('pending', 'paid', 'failed'));

-- Step 5: Verify the constraint was added
SELECT 
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'customer_orders'
AND con.conname = 'customer_orders_payment_status_check';

-- Step 6: Test update on a specific order
-- Replace the order_id with the actual UUID from your order
-- UPDATE customer_orders 
-- SET payment_status = 'paid' 
-- WHERE order_number = 'ORD-20261017-0005';

SELECT 'Constraint recreated successfully! Now try updating payment status from the UI.' AS status;
