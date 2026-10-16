-- Run this in Supabase SQL Editor to see ACTUAL schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'customer_orders'
ORDER BY ordinal_position;
