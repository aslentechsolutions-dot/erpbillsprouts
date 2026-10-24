-- Fix Row Level Security policies for medicine_batches table
-- This allows authenticated users and admins to insert inventory

-- Drop existing policies if they cause issues
DROP POLICY IF EXISTS "Allow authenticated users to read medicine_batches" ON public.medicine_batches;
DROP POLICY IF EXISTS "Allow authenticated users to insert medicine_batches" ON public.medicine_batches;
DROP POLICY IF EXISTS "Allow authenticated users to update medicine_batches" ON public.medicine_batches;
DROP POLICY IF EXISTS "Allow authenticated users to delete medicine_batches" ON public.medicine_batches;

-- Enable RLS on medicine_batches
ALTER TABLE public.medicine_batches ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow all authenticated users to READ
CREATE POLICY "Allow authenticated to read medicine_batches"
ON public.medicine_batches
FOR SELECT
TO authenticated
USING (true);

-- Policy 2: Allow authenticated users to INSERT
CREATE POLICY "Allow authenticated to insert medicine_batches"
ON public.medicine_batches
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy 3: Allow authenticated users to UPDATE
CREATE POLICY "Allow authenticated to update medicine_batches"
ON public.medicine_batches
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy 4: Allow authenticated users to DELETE
CREATE POLICY "Allow authenticated to delete medicine_batches"
ON public.medicine_batches
FOR DELETE
TO authenticated
USING (true);

COMMENT ON POLICY "Allow authenticated to read medicine_batches" ON public.medicine_batches IS 'Allows all authenticated users to read medicine batches';
COMMENT ON POLICY "Allow authenticated to insert medicine_batches" ON public.medicine_batches IS 'Allows authenticated users to insert new batches';
COMMENT ON POLICY "Allow authenticated to update medicine_batches" ON public.medicine_batches IS 'Allows authenticated users to update batches';
COMMENT ON POLICY "Allow authenticated to delete medicine_batches" ON public.medicine_batches IS 'Allows authenticated users to delete batches';
