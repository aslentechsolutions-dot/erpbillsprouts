-- ============================================
-- CUSTOMER ONLINE ORDERS MIGRATION
-- ============================================
-- This migration creates tables for customer online orders
-- separate from existing POS sales to maintain data integrity
-- ============================================

-- Create customer_orders table
CREATE TABLE IF NOT EXISTS customer_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  
  -- Order details
  subtotal DECIMAL(12,2) NOT NULL,
  discount DECIMAL(12,2) DEFAULT 0,
  gst_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  
  -- Payment information
  payment_method TEXT NOT NULL CHECK (payment_method IN ('COD', 'razorpay')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  
  -- Order status
  order_status TEXT DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  
  -- Delivery information
  delivery_address TEXT NOT NULL,
  
  -- Prescription reference if applicable
  prescription_reference TEXT,
  
  -- Notes
  customer_notes TEXT,
  admin_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

-- Create customer_order_items table
CREATE TABLE IF NOT EXISTS customer_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES customer_orders(id) ON DELETE CASCADE NOT NULL,
  medicine_id UUID REFERENCES medicines(id) NOT NULL,
  batch_id UUID REFERENCES medicine_batches(id) NOT NULL,
  
  -- Item details at time of order
  medicine_name TEXT NOT NULL,
  batch_number TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price DECIMAL(10,2) NOT NULL,
  discount DECIMAL(5,2) DEFAULT 0,
  gst_percentage DECIMAL(5,2) DEFAULT 0,
  gst_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_orders_customer ON customer_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_orders_status ON customer_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_customer_orders_payment_status ON customer_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_customer_orders_created_at ON customer_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_order_items_order ON customer_order_items(order_id);

-- Create function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  -- Get the count of orders today
  SELECT COUNT(*) INTO counter
  FROM customer_orders
  WHERE DATE(created_at) = CURRENT_DATE;
  
  -- Generate order number: ORD-YYYYMMDD-XXXX
  new_number := 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD((counter + 1)::TEXT, 4, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Create function to update order timestamps
CREATE OR REPLACE FUNCTION update_customer_order_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- Set paid_at when payment status changes to paid
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
    NEW.paid_at = NOW();
  END IF;
  
  -- Set delivered_at when order status changes to delivered
  IF NEW.order_status = 'delivered' AND OLD.order_status != 'delivered' THEN
    NEW.delivered_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timestamp updates
DROP TRIGGER IF EXISTS trigger_update_customer_order_timestamp ON customer_orders;
CREATE TRIGGER trigger_update_customer_order_timestamp
  BEFORE UPDATE ON customer_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_order_timestamp();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE customer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_order_items ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can view only their own orders
CREATE POLICY customer_orders_select_own ON customer_orders
  FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Policy: Customers can insert their own orders
CREATE POLICY customer_orders_insert_own ON customer_orders
  FOR INSERT
  WITH CHECK (
    customer_id IN (
      SELECT id FROM customers WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Policy: Admins can view all orders
CREATE POLICY customer_orders_select_admin ON customer_orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admins can update all orders
CREATE POLICY customer_orders_update_admin ON customer_orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Customers can view their own order items
CREATE POLICY customer_order_items_select_own ON customer_order_items
  FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM customer_orders
      WHERE customer_id IN (
        SELECT id FROM customers WHERE email = auth.jwt() ->> 'email'
      )
    )
  );

-- Policy: Customers can insert their own order items
CREATE POLICY customer_order_items_insert_own ON customer_order_items
  FOR INSERT
  WITH CHECK (
    order_id IN (
      SELECT id FROM customer_orders
      WHERE customer_id IN (
        SELECT id FROM customers WHERE email = auth.jwt() ->> 'email'
      )
    )
  );

-- Policy: Admins can view all order items
CREATE POLICY customer_order_items_select_admin ON customer_order_items
  FOR SELECT
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

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON customer_orders TO authenticated;
GRANT SELECT, INSERT ON customer_order_items TO authenticated;
GRANT EXECUTE ON FUNCTION generate_order_number() TO authenticated;

-- Grant full access to admins through RLS policies above
