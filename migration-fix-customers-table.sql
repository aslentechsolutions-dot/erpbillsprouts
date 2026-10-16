-- ============================================
-- FIX CUSTOMERS TABLE AND PROFILES ACCESS
-- ============================================

-- Step 1: Ensure customers table exists with correct structure
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Add missing columns to customers if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'email'
    ) THEN
        ALTER TABLE customers ADD COLUMN email TEXT UNIQUE NOT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'address'
    ) THEN
        ALTER TABLE customers ADD COLUMN address TEXT;
    END IF;
END $$;

-- Step 3: Enable RLS on customers table
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies and recreate them
DROP POLICY IF EXISTS customers_select_own ON customers;
DROP POLICY IF EXISTS customers_insert_own ON customers;
DROP POLICY IF EXISTS customers_update_own ON customers;
DROP POLICY IF EXISTS customers_select_admin ON customers;
DROP POLICY IF EXISTS customers_update_admin ON customers;

-- Policy: Users can view their own customer record
CREATE POLICY customers_select_own ON customers
  FOR SELECT
  USING (email = auth.jwt() ->> 'email');

-- Policy: Users can insert their own customer record
CREATE POLICY customers_insert_own ON customers
  FOR INSERT
  WITH CHECK (email = auth.jwt() ->> 'email');

-- Policy: Users can update their own customer record
CREATE POLICY customers_update_own ON customers
  FOR UPDATE
  USING (email = auth.jwt() ->> 'email');

-- Policy: Admins can view all customers
CREATE POLICY customers_select_admin ON customers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admins can update all customers
CREATE POLICY customers_update_admin ON customers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Step 5: Fix profiles table RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing profile policies
DROP POLICY IF EXISTS profiles_select_own ON profiles;
DROP POLICY IF EXISTS profiles_select_all ON profiles;

-- Policy: Users can view their own profile
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT
  USING (id = auth.uid());

-- Policy: Allow all authenticated users to read profiles (for role checking)
CREATE POLICY profiles_select_all ON profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Step 6: Grant permissions
GRANT SELECT, INSERT, UPDATE ON customers TO authenticated;
GRANT SELECT ON profiles TO authenticated;

-- Step 7: Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE '✅ Customers table and profiles access fixed!';
END $$;
