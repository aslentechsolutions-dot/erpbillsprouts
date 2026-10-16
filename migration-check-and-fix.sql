-- ============================================
-- CHECK EXISTING TABLE AND ADD MISSING COLUMNS
-- ============================================
-- Run this first to see what exists and add what's missing
-- ============================================

-- Step 1: Check what columns exist in customer_orders
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customer_orders'
ORDER BY ordinal_position;

-- Step 2: Add ALL missing columns safely
DO $$ 
BEGIN
    -- Add payment_status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE customer_orders 
        ADD COLUMN payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed'));
        RAISE NOTICE 'Added payment_status column';
    END IF;

    -- Add payment_method column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE customer_orders 
        ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'COD' CHECK (payment_method IN ('COD', 'razorpay'));
        RAISE NOTICE 'Added payment_method column';
    END IF;

    -- Add order_status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'order_status'
    ) THEN
        ALTER TABLE customer_orders 
        ADD COLUMN order_status TEXT DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'));
        RAISE NOTICE 'Added order_status column';
    END IF;

    -- Add delivery_address column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'delivery_address'
    ) THEN
        ALTER TABLE customer_orders 
        ADD COLUMN delivery_address TEXT;
        RAISE NOTICE 'Added delivery_address column';
    END IF;

    -- Add admin_notes column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'admin_notes'
    ) THEN
        ALTER TABLE customer_orders 
        ADD COLUMN admin_notes TEXT;
        RAISE NOTICE 'Added admin_notes column';
    END IF;

    -- Add customer_notes column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'customer_notes'
    ) THEN
        ALTER TABLE customer_orders 
        ADD COLUMN customer_notes TEXT;
        RAISE NOTICE 'Added customer_notes column';
    END IF;

    -- Add prescription_reference column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'prescription_reference'
    ) THEN
        ALTER TABLE customer_orders 
        ADD COLUMN prescription_reference TEXT;
        RAISE NOTICE 'Added prescription_reference column';
    END IF;

    -- Add razorpay_order_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'razorpay_order_id'
    ) THEN
        ALTER TABLE customer_orders 
        ADD COLUMN razorpay_order_id TEXT;
        RAISE NOTICE 'Added razorpay_order_id column';
    END IF;

    -- Add razorpay_payment_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'razorpay_payment_id'
    ) THEN
        ALTER TABLE customer_orders 
        ADD COLUMN razorpay_payment_id TEXT;
        RAISE NOTICE 'Added razorpay_payment_id column';
    END IF;

    -- Add razorpay_signature column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'razorpay_signature'
    ) THEN
        ALTER TABLE customer_orders 
        ADD COLUMN razorpay_signature TEXT;
        RAISE NOTICE 'Added razorpay_signature column';
    END IF;

    -- Add paid_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'paid_at'
    ) THEN
        ALTER TABLE customer_orders 
        ADD COLUMN paid_at TIMESTAMPTZ;
        RAISE NOTICE 'Added paid_at column';
    END IF;

    -- Add delivered_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'delivered_at'
    ) THEN
        ALTER TABLE customer_orders 
        ADD COLUMN delivered_at TIMESTAMPTZ;
        RAISE NOTICE 'Added delivered_at column';
    END IF;

    -- Add subtotal column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'subtotal'
    ) THEN
        ALTER TABLE customer_orders 
        ADD COLUMN subtotal DECIMAL(12,2) NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added subtotal column';
    END IF;

    -- Add discount column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'discount'
    ) THEN
        ALTER TABLE customer_orders 
        ADD COLUMN discount DECIMAL(12,2) DEFAULT 0;
        RAISE NOTICE 'Added discount column';
    END IF;

    -- Add gst_amount column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_orders' AND column_name = 'gst_amount'
    ) THEN
        ALTER TABLE customer_orders 
        ADD COLUMN gst_amount DECIMAL(12,2) DEFAULT 0;
        RAISE NOTICE 'Added gst_amount column';
    END IF;

    RAISE NOTICE '✅ All missing columns added successfully!';
END $$;

-- Step 3: Create customer_order_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS customer_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES customer_orders(id) ON DELETE CASCADE NOT NULL,
  medicine_id UUID REFERENCES medicines(id) NOT NULL,
  batch_id UUID REFERENCES medicine_batches(id) NOT NULL,
  
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

-- Step 4: Create indexes (safely)
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
    
    RAISE NOTICE '✅ Indexes created successfully!';
END $$;

-- Step 5: Create functions
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  SELECT COUNT(*) INTO counter
  FROM customer_orders
  WHERE DATE(created_at) = CURRENT_DATE;
  
  new_number := 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD((counter + 1)::TEXT, 4, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_customer_order_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    NEW.paid_at = NOW();
  END IF;
  
  IF NEW.order_status = 'delivered' AND (OLD.order_status IS NULL OR OLD.order_status != 'delivered') THEN
    NEW.delivered_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_customer_order_timestamp ON customer_orders;
CREATE TRIGGER trigger_update_customer_order_timestamp
  BEFORE UPDATE ON customer_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_order_timestamp();

-- Step 6: Enable RLS
ALTER TABLE customer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_order_items ENABLE ROW LEVEL SECURITY;

-- Step 7: Drop and recreate policies
DROP POLICY IF EXISTS customer_orders_select_own ON customer_orders;
DROP POLICY IF EXISTS customer_orders_insert_own ON customer_orders;
DROP POLICY IF EXISTS customer_orders_select_admin ON customer_orders;
DROP POLICY IF EXISTS customer_orders_update_admin ON customer_orders;
DROP POLICY IF EXISTS customer_order_items_select_own ON customer_order_items;
DROP POLICY IF EXISTS customer_order_items_insert_own ON customer_order_items;
DROP POLICY IF EXISTS customer_order_items_select_admin ON customer_order_items;

CREATE POLICY customer_orders_select_own ON customer_orders
  FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY customer_orders_insert_own ON customer_orders
  FOR INSERT
  WITH CHECK (
    customer_id IN (
      SELECT id FROM customers WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY customer_orders_select_admin ON customer_orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY customer_orders_update_admin ON customer_orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

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

CREATE POLICY customer_order_items_select_admin ON customer_order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Step 8: Grant permissions
GRANT SELECT, INSERT, UPDATE ON customer_orders TO authenticated;
GRANT SELECT, INSERT ON customer_order_items TO authenticated;
GRANT EXECUTE ON FUNCTION generate_order_number() TO authenticated;

-- Success!
DO $$ 
BEGIN 
    RAISE NOTICE '🎉 Migration completed successfully! Customer orders system is ready.';
END $$;
