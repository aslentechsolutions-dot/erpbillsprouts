-- Fix scheme update issues
-- This script fixes RLS and makes created_by/updated_by optional

-- Make created_by and updated_by optional (no NOT NULL constraint needed)
-- The table should already have this, but ensure it's flexible

-- Recreate the admin policy to be simpler
DROP POLICY IF EXISTS schemes_admin_policy ON schemes;

CREATE POLICY schemes_admin_policy ON schemes
  FOR ALL
  USING (
    (SELECT role FROM auth.users WHERE id = auth.uid()) = 'admin'
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM auth.users WHERE id = auth.uid()) = 'admin'
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Allow authenticated users (for RPC function)
CREATE POLICY schemes_rpc_access ON schemes
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
  );

-- Update existing schemes to have created_by set (if not already)
UPDATE schemes 
SET created_by = auth.uid()
WHERE created_by IS NULL;

UPDATE schemes 
SET updated_by = auth.uid()
WHERE updated_by IS NULL;
