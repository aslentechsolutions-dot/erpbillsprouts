-- Create free_trials table
CREATE TABLE free_trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_name TEXT NOT NULL,
  drug_license_number TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  selected_plan TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE free_trials ENABLE ROW LEVEL SECURITY;

-- Create INSERT policy for unauthenticated users
CREATE POLICY "Allow unauthenticated to insert free trial registrations" ON free_trials
  FOR INSERT
  WITH CHECK (true);

-- Create SELECT policy for admin only
CREATE POLICY "Allow admin to view free trials" ON free_trials
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'admin'
    )
  );

-- Create UPDATE policy for admin only
CREATE POLICY "Allow admin to update free trials" ON free_trials
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'admin'
    )
  );

-- Create index for common queries
CREATE INDEX idx_free_trials_email ON free_trials(email);
CREATE INDEX idx_free_trials_pharmacy_name ON free_trials(pharmacy_name);
CREATE INDEX idx_free_trials_created_at ON free_trials(created_at DESC);
CREATE INDEX idx_free_trials_selected_plan ON free_trials(selected_plan);
CREATE INDEX idx_free_trials_status ON free_trials(status);
