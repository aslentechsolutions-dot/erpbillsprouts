-- ============================================
-- DIAGNOSTIC: CUSTOMER_ORDERS TABLE SCHEMA
-- ============================================
-- Run this in Supabase SQL Editor to see the ACTUAL production schema
-- ============================================

-- Step 1: Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'customer_orders'
) as table_exists;

-- Step 2: Get complete column list with all details
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    CASE 
        WHEN is_nullable = 'NO' THEN '🔴 REQUIRED'
        ELSE '✅ OPTIONAL'
    END as requirement_status,
    CASE 
        WHEN column_name LIKE 'delivery_%' THEN '📦 DELIVERY FIELD'
        WHEN column_name IN ('subtotal', 'discount', 'gst_amount', 'total') THEN '💰 FINANCIAL'
        WHEN column_name IN ('payment_method', 'payment_status', 'razorpay%') THEN '💳 PAYMENT'
        WHEN column_name IN ('order_status') THEN '📋 STATUS'
        ELSE '📄 OTHER'
    END as field_category
FROM information_schema.columns
WHERE table_name = 'customer_orders'
ORDER BY 
    CASE 
        WHEN column_name = 'id' THEN 1
        WHEN column_name = 'order_number' THEN 2
        WHEN column_name = 'customer_id' THEN 3
        WHEN column_name LIKE 'delivery_%' THEN 4
        WHEN column_name IN ('subtotal', 'discount', 'gst_amount', 'total') THEN 5
        WHEN column_name LIKE '%payment%' OR column_name LIKE 'razorpay%' THEN 6
        WHEN column_name LIKE '%status%' THEN 7
        ELSE 8
    END,
    column_name;

-- Step 3: Check constraints on the table
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    CASE 
        WHEN tc.constraint_type = 'PRIMARY KEY' THEN '🔑 Primary Key'
        WHEN tc.constraint_type = 'FOREIGN KEY' THEN '🔗 Foreign Key'
        WHEN tc.constraint_type = 'UNIQUE' THEN '⭐ Unique'
        WHEN tc.constraint_type = 'CHECK' THEN '✓ Check Constraint'
        ELSE tc.constraint_type
    END as constraint_description
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_name = kcu.table_name
WHERE tc.table_name = 'customer_orders'
ORDER BY 
    CASE tc.constraint_type
        WHEN 'PRIMARY KEY' THEN 1
        WHEN 'FOREIGN KEY' THEN 2
        WHEN 'UNIQUE' THEN 3
        ELSE 4
    END,
    tc.constraint_name;

-- Step 4: Check CHECK constraints details
SELECT
    con.conname as constraint_name,
    pg_get_constraintdef(con.oid) as constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'customer_orders'
  AND con.contype = 'c';

-- Step 5: Check foreign key relationships
SELECT
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    '🔗 ' || kcu.column_name || ' → ' || ccu.table_name || '.' || ccu.column_name as relationship
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'customer_orders';

-- Step 6: Check RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'customer_orders'
ORDER BY policyname;

-- Step 7: Sample recent order (if any exist) - SAFE QUERY
SELECT 
    order_number,
    customer_id,
    CASE WHEN delivery_name IS NULL THEN '❌ NULL' ELSE '✅ HAS VALUE' END as has_delivery_name,
    CASE WHEN delivery_phone IS NULL THEN '❌ NULL' ELSE '✅ HAS VALUE' END as has_delivery_phone,
    CASE WHEN delivery_email IS NULL THEN '❌ NULL' ELSE '✅ HAS VALUE' END as has_delivery_email,
    CASE WHEN delivery_address IS NULL THEN '❌ NULL' ELSE '✅ HAS VALUE' END as has_delivery_address,
    payment_method,
    payment_status,
    order_status,
    created_at
FROM customer_orders
ORDER BY created_at DESC
LIMIT 5;

-- Step 8: Check if delivery columns exist (explicit check)
DO $$ 
DECLARE
    delivery_name_exists BOOLEAN;
    delivery_phone_exists BOOLEAN;
    delivery_email_exists BOOLEAN;
    delivery_address_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'delivery_name'
    ) INTO delivery_name_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'delivery_phone'
    ) INTO delivery_phone_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'delivery_email'
    ) INTO delivery_email_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'delivery_address'
    ) INTO delivery_address_exists;
    
    RAISE NOTICE '====================================';
    RAISE NOTICE 'DELIVERY COLUMNS EXISTENCE CHECK:';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'delivery_name: %', CASE WHEN delivery_name_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE 'delivery_phone: %', CASE WHEN delivery_phone_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE 'delivery_email: %', CASE WHEN delivery_email_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE 'delivery_address: %', CASE WHEN delivery_address_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE '====================================';
END $$;

-- Step 9: Generate sample INSERT statement
SELECT 
    'INSERT INTO customer_orders (' || 
    string_agg(column_name, ', ' ORDER BY ordinal_position) || 
    ') VALUES (...);' as sample_insert_statement
FROM information_schema.columns
WHERE table_name = 'customer_orders'
  AND column_name NOT IN ('id', 'created_at', 'updated_at');

-- Step 10: Summary
DO $$ 
BEGIN 
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ DIAGNOSTIC COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Review the results above to understand:';
    RAISE NOTICE '1. Which columns exist in customer_orders';
    RAISE NOTICE '2. Which columns are NOT NULL (required)';
    RAISE NOTICE '3. What constraints are enforced';
    RAISE NOTICE '4. What foreign keys are configured';
    RAISE NOTICE '5. What RLS policies are active';
    RAISE NOTICE '';
    RAISE NOTICE 'Compare this with your code payload to fix mismatches.';
    RAISE NOTICE '========================================';
END $$;
