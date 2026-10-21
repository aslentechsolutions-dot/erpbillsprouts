-- ============================================================================
-- Create Schemes (Free Item / Offer) Management Table
-- ============================================================================
-- Purpose: Store scheme/offer configurations for free item promotions
-- Example: Buy 10 strips, Get 2 strips Free

-- ============================================================================
-- Create schemes table
-- ============================================================================

CREATE TABLE IF NOT EXISTS schemes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Basic scheme info
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  scheme_type TEXT NOT NULL DEFAULT 'buy_get_free' CHECK (scheme_type IN ('buy_get_free', 'percentage_discount', 'flat_discount', 'custom')),
  
  -- Qualifying product and minimum quantity
  qualifying_product_id UUID NOT NULL REFERENCES medicines(id) ON DELETE RESTRICT,
  minimum_quantity INTEGER NOT NULL,
  
  -- Free product (can be same or different)
  free_product_id UUID NOT NULL REFERENCES medicines(id) ON DELETE RESTRICT,
  free_quantity INTEGER NOT NULL,
  
  -- Unit of measure (tablets, strips, packs, etc.)
  unit_of_measure TEXT DEFAULT 'units',
  
  -- Repeatable scheme: floor(paid_quantity / minimum_quantity) * free_quantity
  is_repeatable BOOLEAN DEFAULT true,
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Customer eligibility (optional)
  applicable_to_all_customers BOOLEAN DEFAULT true,
  customer_type_filter TEXT CHECK (customer_type_filter IN ('individual', 'retailer', 'wholesaler', 'distributor')),
  specific_customer_ids UUID[] DEFAULT NULL, -- Array of customer IDs this scheme applies to
  
  -- Sale type eligibility
  applicable_sale_types TEXT[] DEFAULT ARRAY['retail', 'wholesale', 'distributor'],
  
  -- Audit trail
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_dates CHECK (start_date <= end_date),
  CONSTRAINT positive_quantities CHECK (minimum_quantity > 0 AND free_quantity > 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_schemes_product ON schemes(qualifying_product_id);
CREATE INDEX IF NOT EXISTS idx_schemes_free_product ON schemes(free_product_id);
CREATE INDEX IF NOT EXISTS idx_schemes_active_dates ON schemes(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_schemes_customer_type ON schemes(customer_type_filter);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_schemes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS schemes_updated_at_trigger ON schemes;
CREATE TRIGGER schemes_updated_at_trigger
BEFORE UPDATE ON schemes
FOR EACH ROW
EXECUTE FUNCTION update_schemes_updated_at();

-- ============================================================================
-- Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE schemes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admin can do everything
CREATE POLICY schemes_admin_all ON schemes
  FOR ALL
  USING (auth.role() = 'authenticated' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK (auth.role() = 'authenticated' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- RLS Policy: Staff can view active schemes only
CREATE POLICY schemes_staff_view ON schemes
  FOR SELECT
  USING (
    auth.role() = 'authenticated' 
    AND ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('staff', 'pharmacist', 'admin') OR is_active = true)
  );

-- ============================================================================
-- Create function to check applicable scheme for a product/customer/quantity
-- ============================================================================

CREATE OR REPLACE FUNCTION get_applicable_scheme(
  p_customer_id UUID,
  p_medicine_id UUID,
  p_quantity INTEGER,
  p_sale_type TEXT
)
RETURNS TABLE (
  scheme_id UUID,
  scheme_name TEXT,
  free_product_id UUID,
  free_quantity_result INTEGER,
  scheme_description TEXT,
  is_repeatable BOOLEAN
) AS $$
DECLARE
  v_scheme RECORD;
  v_today DATE;
  v_free_qty INTEGER;
BEGIN
  v_today := CURRENT_DATE;
  
  -- Check if any active scheme applies
  FOR v_scheme IN
    SELECT
      s.id,
      s.name,
      s.free_product_id,
      s.free_quantity,
      s.description,
      s.is_repeatable,
      s.minimum_quantity,
      s.applicable_to_all_customers,
      s.customer_type_filter,
      s.specific_customer_ids,
      s.applicable_sale_types,
      c.customer_type
    FROM schemes s
    LEFT JOIN customers c ON c.id = p_customer_id
    WHERE
      s.is_active = true
      AND s.qualifying_product_id = p_medicine_id
      AND p_quantity >= s.minimum_quantity
      AND s.start_date <= v_today
      AND s.end_date >= v_today
      AND p_sale_type = ANY(s.applicable_sale_types)
      AND (
        s.applicable_to_all_customers = true
        OR (s.customer_type_filter IS NOT NULL AND c.customer_type = s.customer_type_filter)
        OR (s.specific_customer_ids IS NOT NULL AND p_customer_id = ANY(s.specific_customer_ids))
      )
    LIMIT 1
  LOOP
    -- Calculate free quantity based on scheme rules
    IF v_scheme.is_repeatable THEN
      v_free_qty := FLOOR(p_quantity::NUMERIC / v_scheme.minimum_quantity)::INTEGER * v_scheme.free_quantity;
    ELSE
      v_free_qty := v_scheme.free_quantity;
    END IF;
    
    RETURN QUERY SELECT
      v_scheme.id,
      v_scheme.name,
      v_scheme.free_product_id,
      v_free_qty,
      v_scheme.description,
      v_scheme.is_repeatable;
    
    RETURN; -- Return first matching scheme only
  END LOOP;
  
  -- No scheme applies
  RETURN QUERY SELECT
    NULL::UUID,
    NULL::TEXT,
    NULL::UUID,
    0::INTEGER,
    NULL::TEXT,
    NULL::BOOLEAN;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT SELECT ON schemes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON schemes TO authenticated;
GRANT EXECUTE ON FUNCTION get_applicable_scheme TO authenticated;
