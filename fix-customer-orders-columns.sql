-- ============================================
-- FIX CUSTOMER_ORDERS TABLE COLUMNS
-- ============================================

-- Step 1: Check what columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'customer_orders'
ORDER BY ordinal_position;

-- Step 2: Drop the NOT NULL constraint on delivery_name if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'delivery_name'
    ) THEN
        ALTER TABLE customer_orders ALTER COLUMN delivery_name DROP NOT NULL;
        RAISE NOTICE '✅ Removed NOT NULL constraint from delivery_name';
    END IF;
END $$;

-- Step 3: Add delivery_address column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'delivery_address'
    ) THEN
        ALTER TABLE customer_orders ADD COLUMN delivery_address TEXT;
        RAISE NOTICE '✅ Added delivery_address column';
    END IF;
END $$;

-- Step 4: Show the final structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    CASE 
        WHEN column_name IN ('delivery_name', 'delivery_address', 'delivery_phone', 'delivery_email') 
        THEN '👉 DELIVERY FIELD'
        ELSE ''
    END as note
FROM information_schema.columns
WHERE table_name = 'customer_orders'
ORDER BY ordinal_position;

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE '🎉 Customer orders columns fixed!';
    RAISE NOTICE 'You can now use either delivery_name or delivery_address';
END $$;
