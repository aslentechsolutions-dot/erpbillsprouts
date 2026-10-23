-- Fix demo_requests RLS policies to allow unauthenticated inserts
-- This file fixes the issue where demo requests are not being saved due to restrictive RLS policies

-- Step 1: Drop existing policies
DROP POLICY IF EXISTS "Anyone can insert demo requests" ON demo_requests;
DROP POLICY IF EXISTS "Only admin can view demo requests" ON demo_requests;

-- Step 2: Create new INSERT policy that truly allows anyone (authenticated or not)
CREATE POLICY "Allow unauthenticated insert for demo requests"
  ON demo_requests FOR INSERT
  WITH CHECK (true);

-- Step 3: Create new SELECT policy for admins only
CREATE POLICY "Allow admin to view demo requests"
  ON demo_requests FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'authenticated' 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Verify the policies are in place
-- Run this to check: SELECT * FROM pg_policies WHERE tablename = 'demo_requests';
