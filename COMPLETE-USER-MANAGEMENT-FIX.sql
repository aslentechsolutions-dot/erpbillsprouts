-- ============================================================================
-- COMPLETE USER MANAGEMENT FIX
-- Run this in Supabase SQL Editor to fix user management
-- ============================================================================

-- Step 1: Drop all problematic policies
DROP POLICY IF EXISTS "Allow authenticated users to read all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow admins to insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow admins to delete profiles" ON public.user_profiles;

-- Step 2: Drop triggers that might be conflicting
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 3: Ensure table exists with correct structure
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'pharmacist', 'staff', 'patient', 'retailer', 'wholesaler')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- Step 5: Disable then re-enable RLS
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 6: Create PERMISSIVE policies (allow by default)
CREATE POLICY "Allow authenticated to read all profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated to read all profiles anon"
ON public.user_profiles
FOR SELECT
TO anon
USING (false);

CREATE POLICY "Allow users to update own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow users to insert own profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow delete own profile"
ON public.user_profiles
FOR DELETE
TO authenticated
USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
));

-- Step 7: Recreate trigger function for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    phone,
    role,
    status
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff'),
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = NEW.email,
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', user_profiles.full_name),
    phone = COALESCE(NEW.raw_user_meta_data->>'phone', user_profiles.phone),
    role = COALESCE(NEW.raw_user_meta_data->>'role', user_profiles.role);
  
  RETURN NEW;
END;
$$;

-- Step 8: Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Step 9: Add update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_user_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_user_profiles_updated_at();

-- Step 10: Sync existing auth users to user_profiles (if any)
INSERT INTO public.user_profiles (id, email, full_name, role, status)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', ''),
  COALESCE(raw_user_meta_data->>'role', 'staff'),
  'active'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Step 11: Verify setup
SELECT 
  (SELECT COUNT(*) FROM public.user_profiles) as user_profiles_count,
  (SELECT COUNT(*) FROM auth.users) as auth_users_count,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'user_profiles') as policy_count;
