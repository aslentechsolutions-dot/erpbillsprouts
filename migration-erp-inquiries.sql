-- ============================================
-- ERP PURCHASE INQUIRIES MIGRATION
-- ============================================
-- This migration creates table for ERP purchase inquiries
-- from potential customers interested in the software
-- ============================================

-- Create erp_inquiries table
CREATE TABLE IF NOT EXISTS erp_inquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Inquiry details
  full_name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  location TEXT NOT NULL,
  additional_requirements TEXT,
  
  -- Status tracking
  inquiry_status TEXT DEFAULT 'new' CHECK (inquiry_status IN ('new', 'contacted', 'in_progress', 'qualified', 'closed', 'rejected')),
  
  -- Admin notes
  admin_notes TEXT,
  assigned_to UUID REFERENCES profiles(id),
  
  -- Contact tracking
  last_contacted_at TIMESTAMPTZ,
  follow_up_date DATE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_erp_inquiries_status ON erp_inquiries(inquiry_status);
CREATE INDEX IF NOT EXISTS idx_erp_inquiries_created_at ON erp_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_erp_inquiries_email ON erp_inquiries(email);
CREATE INDEX IF NOT EXISTS idx_erp_inquiries_phone ON erp_inquiries(phone);

-- Create function to update inquiry timestamps
CREATE OR REPLACE FUNCTION update_erp_inquiry_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timestamp updates
DROP TRIGGER IF EXISTS trigger_update_erp_inquiry_timestamp ON erp_inquiries;
CREATE TRIGGER trigger_update_erp_inquiry_timestamp
  BEFORE UPDATE ON erp_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_erp_inquiry_timestamp();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE erp_inquiries ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public to insert inquiries (anyone can submit)
CREATE POLICY erp_inquiries_insert_public ON erp_inquiries
  FOR INSERT
  WITH CHECK (true);

-- Policy: Only admins can view inquiries
CREATE POLICY erp_inquiries_select_admin ON erp_inquiries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can update inquiries
CREATE POLICY erp_inquiries_update_admin ON erp_inquiries
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can delete inquiries
CREATE POLICY erp_inquiries_delete_admin ON erp_inquiries
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant insert to anonymous users (for public inquiry form)
GRANT INSERT ON erp_inquiries TO anon;

-- Grant full access to authenticated users (will be filtered by RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON erp_inquiries TO authenticated;
