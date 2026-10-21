-- ============================================
-- FIX DELIVERY FIELDS IN CUSTOMER_ORDERS TABLE
-- ============================================
-- This migration ensures delivery_name, delivery_phone, 
-- and delivery_email columns exist and are properly configured
-- ============================================

-- Step 1: Check current structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'customer_orders'
  AND column_name LIKE 'delivery_%'
ORDER BY column_name;

-- Step 2: Add delivery columns if they don't exist
DO $$ 
BEGIN
    -- Add delivery_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'delivery_name'
    ) THEN
        ALTER TABLE customer_orders 
        ADD COLUMN delivery_name TEXT;
        RAISE NOTICE '✅ Added delivery_name column';
    END IF;

    -- Add delivery_phone column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'delivery_phone'
    ) THEN
        ALTER TABLE customer_orders 
        ADD COLUMN delivery_phone TEXT;
        RAISE NOTICE '✅ Added delivery_phone column';
    END IF;

    -- Add delivery_email column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'delivery_email'
    ) THEN
        ALTER TABLE customer_orders 
        ADD COLUMN delivery_email TEXT;
        RAISE NOTICE '✅ Added delivery_email column';
    END IF;

    -- Add delivery_address column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'delivery_address'
    ) THEN
        ALTER TABLE customer_orders 
        ADD COLUMN delivery_address TEXT;
        RAISE NOTICE '✅ Added delivery_address column';
    END IF;
END $$;

-- Step 3: Update any existing NULL values with placeholder
-- (This prevents NOT NULL constraint violations on existing data)
UPDATE customer_orders 
SET 
    delivery_name = COALESCE(delivery_name, 'Not Provided'),
    delivery_phone = COALESCE(delivery_phone, 'Not Provided'),
    delivery_email = COALESCE(delivery_email, 'Not Provided'),
    delivery_address = COALESCE(delivery_address, 'Not Provided')
WHERE 
    delivery_name IS NULL 
    OR delivery_phone IS NULL 
    OR delivery_email IS NULL 
    OR delivery_address IS NULL;

-- Step 4: Make delivery fields NOT NULL (required for orders)
DO $$ 
BEGIN
    -- Make delivery_name NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' 
        AND column_name = 'delivery_name'
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE customer_orders 
        ALTER COLUMN delivery_name SET NOT NULL;
        RAISE NOTICE '✅ Set delivery_name as NOT NULL';
    END IF;

    -- Make delivery_phone NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' 
        AND column_name = 'delivery_phone'
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE customer_orders 
        ALTER COLUMN delivery_phone SET NOT NULL;
        RAISE NOTICE '✅ Set delivery_phone as NOT NULL';
    END IF;

    -- Make delivery_email NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' 
        AND column_name = 'delivery_email'
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE customer_orders 
        ALTER COLUMN delivery_email SET NOT NULL;
        RAISE NOTICE '✅ Set delivery_email as NOT NULL';
    END IF;

    -- Keep delivery_address as nullable (customer might use profile address)
END $$;

-- Step 5: Verify the final structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    '✅ Delivery field properly configured' as status
FROM information_schema.columns
WHERE table_name = 'customer_orders'
  AND column_name IN ('delivery_name', 'delivery_phone', 'delivery_email', 'delivery_address')
ORDER BY column_name;

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE '🎉 Delivery fields migration completed!';
    RAISE NOTICE '✅ delivery_name, delivery_phone, delivery_email are now NOT NULL';
    RAISE NOTICE '✅ All delivery fields are ready for COD orders';
    RAISE NOTICE '📝 The CheckoutPage now correctly maps customer data to these fields';
END $$;
