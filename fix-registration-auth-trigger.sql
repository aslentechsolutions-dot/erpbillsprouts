-- Fix registration issues - Auth trigger and RLS policies
-- Run this in Supabase SQL Editor

-- Step 1: Create or replace the function that creates profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient'),
    'active'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = COALESCE(EXCLUDED.role, profiles.role);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail auth user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 3: Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Ensure RLS policies allow profile creation
-- Drop existing policies
DROP POLICY IF EXISTS profiles_insert_own ON profiles;
DROP POLICY IF EXISTS profiles_select_own ON profiles;
DROP POLICY IF EXISTS profiles_update_own ON profiles;

-- Allow users to insert their own profile
CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to view their own profile
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admins to view all profiles
DROP POLICY IF EXISTS profiles_select_admin ON profiles;
CREATE POLICY profiles_select_admin ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Allow admins to update all profiles
DROP POLICY IF EXISTS profiles_update_admin ON profiles;
CREATE POLICY profiles_update_admin ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Step 5: Grant necessary permissions
GRANT INSERT, SELECT, UPDATE ON profiles TO authenticated;

-- Step 6: Ensure service_role can insert into profiles (for trigger)
GRANT INSERT ON profiles TO service_role;

SELECT 'Registration trigger and RLS policies fixed successfully!' AS status;
