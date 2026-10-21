-- ============================================
-- CUSTOMER ONLINE ORDERS MIGRATION (ALTER VERSION)
-- ============================================
-- This migration updates existing tables or creates new ones
-- Use this if customer_orders table already exists
-- ============================================

-- First, check if the table exists and add missing columns
DO $$ 
BEGIN
    -- Add order_status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'order_status'
    ) THEN
        ALTER TABLE customer_orders 
        ADD COLUMN order_status TEXT DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'));
    END IF;

    -- Add delivery_address column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'delivery_address'
    ) THEN
        ALTER TABLE customer_orders 
        ADD COLUMN delivery_address TEXT;
    END IF;

    -- Add admin_notes column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'admin_notes'
    ) THEN
        ALTER TABLE customer_orders 
        ADD COLUMN admin_notes TEXT;
    END IF;

    -- Add customer_notes column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'customer_notes'
    ) THEN
        ALTER TABLE customer_orders 
        ADD COLUMN customer_notes TEXT;
    END IF;

    -- Add prescription_reference column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'prescription_reference'
    ) THEN
        ALTER TABLE customer_orders 
        ADD COLUMN prescription_reference TEXT;
    END IF;

    -- Add razorpay columns if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'razorpay_order_id'
    ) THEN
        ALTER TABLE customer_orders 
        ADD COLUMN razorpay_order_id TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'razorpay_payment_id'
    ) THEN
        ALTER TABLE customer_orders 
        ADD COLUMN razorpay_payment_id TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'razorpay_signature'
    ) THEN
        ALTER TABLE customer_orders 
        ADD COLUMN razorpay_signature TEXT;
    END IF;

    -- Add paid_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'paid_at'
    ) THEN
        ALTER TABLE customer_orders 
        ADD COLUMN paid_at TIMESTAMPTZ;
    END IF;

    -- Add delivered_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'delivered_at'
    ) THEN
        ALTER TABLE customer_orders 
        ADD COLUMN delivered_at TIMESTAMPTZ;
    END IF;
END $$;

-- Create customer_order_items table if it doesn't exist
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

-- Create indexes for performance (IF NOT EXISTS doesn't work for indexes, so we use DO block)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customer_orders_customer') THEN
        CREATE INDEX idx_customer_orders_customer ON customer_orders(customer_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customer_orders_status') THEN
        CREATE INDEX idx_customer_orders_status ON customer_orders(order_status);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customer_orders_payment_status') THEN
        CREATE INDEX idx_customer_orders_payment_status ON customer_orders(payment_status);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customer_orders_created_at') THEN
        CREATE INDEX idx_customer_orders_created_at ON customer_orders(created_at DESC);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customer_order_items_order') THEN
        CREATE INDEX idx_customer_order_items_order ON customer_order_items(order_id);
    END IF;
END $$;

-- Create or replace function to generate order numbers
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

-- Create or replace function to update order timestamps
CREATE OR REPLACE FUNCTION update_customer_order_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- Set paid_at when payment status changes to paid
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    NEW.paid_at = NOW();
  END IF;
  
  -- Set delivered_at when order status changes to delivered
  IF NEW.order_status = 'delivered' AND (OLD.order_status IS NULL OR OLD.order_status != 'delivered') THEN
    NEW.delivered_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger for timestamp updates
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS customer_orders_select_own ON customer_orders;
DROP POLICY IF EXISTS customer_orders_insert_own ON customer_orders;
DROP POLICY IF EXISTS customer_orders_select_admin ON customer_orders;
DROP POLICY IF EXISTS customer_orders_update_admin ON customer_orders;
DROP POLICY IF EXISTS customer_order_items_select_own ON customer_order_items;
DROP POLICY IF EXISTS customer_order_items_insert_own ON customer_order_items;
DROP POLICY IF EXISTS customer_order_items_select_admin ON customer_order_items;

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

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE 'Migration completed successfully! Customer orders tables are ready.';
END $$;
