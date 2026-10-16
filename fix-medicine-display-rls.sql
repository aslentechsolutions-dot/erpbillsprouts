-- ============================================
-- FIX MEDICINE DISPLAY FOR CUSTOMER PORTAL
-- ============================================
-- This fixes RLS policies to allow customers to view medicines
-- ============================================

-- Step 1: Check current RLS policies on medicines
SELECT 
    'Current medicines policies' as info,
    policyname,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'medicines';

-- Step 2: Check current RLS policies on medicine_batches
SELECT 
    'Current medicine_batches policies' as info,
    policyname,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'medicine_batches';

-- Step 3: Drop restrictive policies and create patient-friendly ones
-- Drop old policies (all possible variations)
DROP POLICY IF EXISTS "All users can view medicines" ON medicines;
DROP POLICY IF EXISTS "medicines_select_authenticated" ON medicines;
DROP POLICY IF EXISTS "medicines_select_all_authenticated" ON medicines;
DROP POLICY IF EXISTS "All users can view batches" ON medicine_batches;
DROP POLICY IF EXISTS "medicine_batches_select_authenticated" ON medicine_batches;
DROP POLICY IF EXISTS "medicine_batches_select_all_authenticated" ON medicine_batches;

-- Create new open policies for viewing medicines (customers need this!)
CREATE POLICY "medicines_select_all_authenticated" ON medicines
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "medicine_batches_select_all_authenticated" ON medicine_batches
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Step 4: Verify medicines exist
SELECT 
    COUNT(*) as total_medicines,
    COUNT(*) FILTER (WHERE status = 'active') as active_medicines
FROM medicines;

-- Step 5: Verify batches with stock exist
SELECT 
    COUNT(*) as total_batches,
    COUNT(*) FILTER (WHERE current_quantity > 0) as batches_with_stock,
    COUNT(*) FILTER (WHERE current_quantity > 0 AND expiry_date > NOW()) as available_batches
FROM medicine_batches;

-- Step 6: Show sample medicines that should be visible
SELECT 
    m.id,
    m.name,
    m.category,
    m.status,
    COUNT(mb.id) as batch_count,
    SUM(mb.current_quantity) as total_stock
FROM medicines m
LEFT JOIN medicine_batches mb ON m.id = mb.medicine_id 
    AND mb.current_quantity > 0 
    AND mb.expiry_date > NOW()
WHERE m.status = 'active'
GROUP BY m.id, m.name, m.category, m.status
LIMIT 10;

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE '✅ RLS policies updated for customer medicine viewing!';
    RAISE NOTICE 'Customers (patient role) can now view all active medicines and batches';
    RAISE NOTICE 'Try refreshing the customer store page now';
END $$;
