-- Quick fix: Add 'distributor' to both sales and invoices tables
-- Run this now to enable Distributor sales

-- Fix sales table
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_sale_type_check;
ALTER TABLE sales ADD CONSTRAINT sales_sale_type_check 
  CHECK (sale_type IN ('retail', 'wholesale', 'distributor'));

-- Fix invoices table
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_sale_type_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_sale_type_check 
  CHECK (sale_type IN ('retail', 'wholesale', 'distributor'));

-- Done
SELECT 'Distributor support enabled!' as status;
