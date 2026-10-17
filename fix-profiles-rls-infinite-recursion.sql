-- Fix infinite recursion in profiles RLS policies
-- The issue: Admin policies check profiles.role which causes recursion
-- Solution: Use a simpler approach for basic operations

-- Drop all existing profiles policies
DROP POLICY IF EXISTS profiles_insert_own ON profiles;
DROP POLICY IF EXISTS profiles_select_own ON profiles;
DROP POLICY IF EXISTS profiles_update_own ON profiles;
DROP POLICY IF EXISTS profiles_select_admin ON profiles;
DROP POLICY IF EXISTS profiles_update_admin ON profiles;

-- Policy 1: Allow users to SELECT their own profile
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy 2: Allow users to INSERT their own profile (for registration)
CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy 3: Allow users to UPDATE their own profile
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 4: Allow admin to SELECT all profiles (using JWT claim, no recursion)
-- This checks the JWT metadata instead of querying profiles table
CREATE POLICY profiles_select_admin_via_jwt ON profiles
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Policy 5: Allow admin to UPDATE all profiles (using JWT claim, no recursion)
CREATE POLICY profiles_update_admin_via_jwt ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT INSERT ON profiles TO service_role;

SELECT 'Profiles RLS policies fixed - infinite recursion removed!' AS status;
