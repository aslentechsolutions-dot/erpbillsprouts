-- Fix medicine_batches table column issues
-- This script ensures the correct columns exist for purchase orders

-- Step 1: Verify medicine_batches table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'medicine_batches'
ORDER BY ordinal_position;

-- Step 2: Add missing columns if they don't exist
ALTER TABLE medicine_batches
ADD COLUMN IF NOT EXISTS manufacturing_date DATE,
ADD COLUMN IF NOT EXISTS initial_quantity INTEGER,
ADD COLUMN IF NOT EXISTS current_quantity INTEGER NOT NULL DEFAULT 0;

-- Step 3: If initial_quantity and current_quantity are new, populate them
UPDATE medicine_batches
SET initial_quantity = initial_quantity
WHERE initial_quantity IS NULL;

-- Step 4: Verify the update
SELECT 
  id,
  medicine_id,
  batch_number,
  initial_quantity,
  current_quantity,
  manufacturing_date,
  expiry_date
FROM medicine_batches
LIMIT 5;
