-- ============================================
-- QUICK FIX FOR BLANK CUSTOMER PAGES
-- ============================================
-- Run this to diagnose and fix the issue
-- ============================================

-- Step 1: Check if medicines exist
SELECT 
    'Checking medicines...' as step,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN '❌ NO MEDICINES - This is why pages are blank!'
        ELSE '✅ Medicines exist'
    END as status
FROM medicines;

-- Step 2: Check if batches exist with stock
SELECT 
    'Checking medicine batches...' as step,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN '❌ NO BATCHES - This is why store is empty!'
        ELSE '✅ Batches exist'
    END as status
FROM medicine_batches
WHERE current_quantity > 0 
AND expiry_date > NOW();

-- Step 3: Check RLS policies on medicines
SELECT 
    'Checking medicines RLS...' as step,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'medicines';

-- Step 4: Check RLS policies on medicine_batches
SELECT 
    'Checking medicine_batches RLS...' as step,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'medicine_batches';

-- Step 5: Test if authenticated users can read medicines
-- (This will only work if you run it while logged in)
DO $$
BEGIN
    RAISE NOTICE '=== DIAGNOSIS COMPLETE ===';
    RAISE NOTICE 'Check the results above to identify the issue';
    RAISE NOTICE '';
    RAISE NOTICE 'Common issues:';
    RAISE NOTICE '1. No medicines in database → Run seed-data-safe.sql';
    RAISE NOTICE '2. No RLS policies → Medicines table needs RLS setup';
    RAISE NOTICE '3. RLS blocking reads → Check auth.role() in policies';
END $$;

-- Quick fix: If no medicines exist, insert a test medicine
DO $$
DECLARE
    med_id UUID;
    batch_id UUID;
BEGIN
    -- Only insert if no medicines exist
    IF NOT EXISTS (SELECT 1 FROM medicines LIMIT 1) THEN
        RAISE NOTICE 'Inserting test medicine...';
        
        -- Insert a test medicine
        INSERT INTO medicines (
            name, generic_name, manufacturer, category, dosage_form,
            strength, prescription_required, gst_percentage, status
        ) VALUES (
            'Paracetamol 500mg',
            'Paracetamol',
            'Test Pharma',
            'Pain Relief',
            'Tablet',
            '500mg',
            false,
            12.00,
            'active'
        ) RETURNING id INTO med_id;

        -- Insert a test batch
        INSERT INTO medicine_batches (
            medicine_id, batch_number, manufacturing_date, expiry_date,
            purchase_price, mrp, selling_price, gst_percentage,
            initial_quantity, current_quantity, rack_location
        ) VALUES (
            med_id,
            'TEST-BATCH-001',
            NOW() - INTERVAL '6 months',
            NOW() + INTERVAL '2 years',
            8.00,
            15.00,
            12.00,
            12.00,
            100,
            100,
            'A1'
        );

        RAISE NOTICE '✅ Test medicine inserted successfully!';
        RAISE NOTICE 'Try refreshing the store page now.';
    ELSE
        RAISE NOTICE '✅ Medicines already exist in database';
    END IF;
END $$;
