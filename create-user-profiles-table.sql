-- Create user_profiles table if it doesn't exist
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

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- Create index on role for filtering
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read all profiles (for admin dashboard)
CREATE POLICY "Allow authenticated users to read all profiles" 
ON public.user_profiles 
FOR SELECT 
TO authenticated 
USING (true);

-- Create policy to allow users to update their own profile
CREATE POLICY "Allow users to update their own profile" 
ON public.user_profiles 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- Create policy to allow admins to insert new profiles
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

-- Create policy to allow admins to delete profiles
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

-- Create trigger function to automatically create user_profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, phone, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'staff')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Insert current authenticated user as admin if not exists
-- This should be run manually with the actual user ID
-- Example: INSERT INTO public.user_profiles (id, email, full_name, role) 
--          VALUES ('4760bc38-23a0-452a-b741-576ec16faedd', 'aslentechsolutions@gmail.com', 'Admin User', 'admin')
--          ON CONFLICT (id) DO UPDATE SET role = 'admin';

COMMENT ON TABLE public.user_profiles IS 'User profile information for all system users';
COMMENT ON COLUMN public.user_profiles.role IS 'User role: admin, pharmacist, staff, patient, retailer, wholesaler';
COMMENT ON COLUMN public.user_profiles.status IS 'User account status: active, inactive, suspended';
