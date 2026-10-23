-- Create demo_requests table
CREATE TABLE IF NOT EXISTS demo_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  email TEXT NOT NULL,
  city TEXT NOT NULL,
  pincode TEXT NOT NULL,
  business_type TEXT DEFAULT 'Pharmacy / Medical',
  branches TEXT DEFAULT '1',
  specific_request TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'pending'
);

-- Enable RLS
ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;

-- Create policy for inserts (public can insert)
CREATE POLICY "Anyone can insert demo requests"
  ON demo_requests FOR INSERT
  WITH CHECK (true);

-- Create policy for selects (only admin can view)
CREATE POLICY "Only admin can view demo requests"
  ON demo_requests FOR SELECT
  USING (auth.jwt() ->> 'role' = 'authenticated' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
