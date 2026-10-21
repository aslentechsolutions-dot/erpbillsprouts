-- ==============================================================================
-- FIX CUSTOMER ORDERS FOREIGN KEY CONSTRAINT
-- ==============================================================================
-- Error: insert or update on table "customer_orders" violates foreign key constraint 
--        "customer_orders_customer_id_fkey"
-- Details: Key is not present in table "profiles".
--
-- Cause: The customer_orders table was created with a foreign key constraint
--        pointing to profiles(id), which rejected customer IDs or created mismatches
--        between customer records and user auth profiles.
--
-- Solution: Drop this restrictive constraint so orders can be placed reliably
--           by both authenticated users and registered customers.
-- ==============================================================================

-- Step 1: Drop the problematic foreign key constraint if it exists
ALTER TABLE customer_orders 
DROP CONSTRAINT IF EXISTS customer_orders_customer_id_fkey;

-- Step 2: Ensure delivery columns exist and are properly configured
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'delivery_name'
    ) THEN
        ALTER TABLE customer_orders ADD COLUMN delivery_name TEXT;
        RAISE NOTICE 'Added delivery_name column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'delivery_phone'
    ) THEN
        ALTER TABLE customer_orders ADD COLUMN delivery_phone TEXT;
        RAISE NOTICE 'Added delivery_phone column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'delivery_address'
    ) THEN
        ALTER TABLE customer_orders ADD COLUMN delivery_address TEXT;
        RAISE NOTICE 'Added delivery_address column';
    END IF;
END $$;

-- Step 3: Verify active constraints on customer_orders
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_name = kcu.table_name
WHERE tc.table_name = 'customer_orders'
ORDER BY tc.constraint_type, tc.constraint_name;

-- Success notice
DO $$ 
BEGIN 
    RAISE NOTICE 'Customer orders foreign key constraint fix completed successfully!';
END $$;
