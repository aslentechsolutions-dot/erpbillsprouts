-- Fix medicine_batches table - remove current_quantity constraint or make it optional
-- Option 1: If current_quantity column exists but shouldn't, we can ignore it in the form

-- First, check if we need to add a computed column or trigger
-- For now, let's just allow NULL for current_quantity if it exists

ALTER TABLE public.medicine_batches ALTER COLUMN current_quantity DROP NOT NULL;

-- Or if that doesn't work, we can set a default value
ALTER TABLE public.medicine_batches ALTER COLUMN current_quantity SET DEFAULT 0;

-- Verify the schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'medicine_batches'
ORDER BY ordinal_position;
