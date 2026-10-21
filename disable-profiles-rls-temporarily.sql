-- Temporarily disable RLS on profiles to fix registration
-- This allows auth trigger to create profiles without permission issues

-- Disable RLS on profiles table
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Grant full permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;

-- Verify RLS is disabled
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

SELECT 'RLS disabled on profiles table - registration should work now!' AS status;

-- IMPORTANT: Re-enable RLS after testing registration:
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
