-- ============================================================================
-- FIX USER PROFILES POLICIES - Drop and recreate to fix conflicts
-- ============================================================================

-- Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow admins to insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow admins to delete profiles" ON public.user_profiles;

-- Re-enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create clean policies
-- Policy 1: Allow all authenticated users to read all profiles (for admin dashboard)
CREATE POLICY "Allow authenticated users to read all profiles" 
ON public.user_profiles 
FOR SELECT 
TO authenticated 
USING (true);

-- Policy 2: Allow users to update their own profile
CREATE POLICY "Allow users to update their own profile" 
ON public.user_profiles 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 3: Allow admins to insert new profiles
CREATE POLICY "Allow admins to insert profiles" 
ON public.user_profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Policy 4: Allow admins to delete profiles
CREATE POLICY "Allow admins to delete profiles" 
ON public.user_profiles 
FOR DELETE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Verify policies are in place
SELECT schemaname, tablename, policyname FROM pg_policies 
WHERE tablename = 'user_profiles' 
ORDER BY policyname;
