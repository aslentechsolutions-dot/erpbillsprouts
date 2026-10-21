# Database Setup Instructions

## 🚨 CRITICAL: Run These Migrations to Fix Order Creation Error

Your application cannot place orders because the database tables don't exist yet. Follow these steps:

---

## Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project: **kkcugqqohxfegdjipllo**
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"**

---

## Step 2: Run Customer Orders Migration

1. Copy the ENTIRE content from `COMPLETE-CUSTOMER-ORDERS-MIGRATION.sql`
2. Paste it into the SQL Editor
3. Click **"Run"** (or press Ctrl+Enter)
4. ✅ You should see: "Customer orders migration completed successfully!"

This creates:
- `customer_orders` table (stores order headers)
- `customer_order_items` table (stores order line items)
- `generate_order_number()` function (auto-generates order numbers)
- RLS policies (security rules for customers and admins)

---

## Step 3: Run ERP Inquiries Migration

1. Copy the ENTIRE content from `migration-erp-inquiries.sql`
2. Paste it into a NEW query in SQL Editor
3. Click **"Run"**

This creates:
- `erp_inquiries` table (stores ERP purchase inquiries)
- RLS policies (allows public submissions, admin-only viewing)

---

## Step 4: Verify Tables Were Created

Run this query in SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('customer_orders', 'customer_order_items', 'erp_inquiries')
ORDER BY table_name;
```

✅ You should see all 3 tables listed.

---

## Step 5: Test Order Creation

1. Open your application: http://localhost:5173
2. Login as a patient/customer
3. Go to "Medicine Store"
4. Add items to cart
5. Go to checkout
6. Fill in delivery address
7. Select "Cash on Delivery (COD)"
8. Click "Place Order"

✅ Order should be created successfully!

---

## Step 6: Verify in Supabase

Go to **Table Editor** in Supabase:
- Check `customer_orders` table - you should see your order
- Check `customer_order_items` table - you should see order items

---

## Troubleshooting

### Error: "relation customer_orders does not exist"
➡️ Run Step 2 migration again

### Error: "Could not find delivery_address column"
➡️ Run this fix:

```sql
ALTER TABLE customer_orders 
ALTER COLUMN delivery_address DROP NOT NULL;
```

### Error: "permission denied for table customer_orders"
➡️ Make sure you're logged in as a patient role user

### Orders not showing in Order History
➡️ Check RLS policies are enabled:

```sql
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('customer_orders', 'customer_order_items');
```

---

## What Each Migration Does

### COMPLETE-CUSTOMER-ORDERS-MIGRATION.sql
Creates the complete customer ordering system with:
- Order tracking (pending → confirmed → shipped → delivered)
- Payment methods (COD + Razorpay)
- Delivery address storage
- Customer notes
- Admin notes
- Automatic order numbering (ORD-20261016-0001)
- Security policies (customers see only their orders)

### migration-erp-inquiries.sql
Creates the ERP inquiry system with:
- Public inquiry form (anyone can submit)
- Status tracking (new → contacted → qualified → closed)
- Admin assignment
- Follow-up scheduling
- Security (only admins can view/edit)

---

## ✅ Success Criteria

After running migrations, you should be able to:
1. ✅ Place orders from customer portal
2. ✅ View order history as customer
3. ✅ View all customer orders as admin
4. ✅ Submit ERP inquiries from customer portal
5. ✅ View all ERP inquiries as admin

---

## Next Steps After Database Setup

1. **Add Razorpay credentials** to `.env` file:
   ```
   VITE_RAZORPAY_KEY_ID=your_key_here
   VITE_RAZORPAY_KEY_SECRET=your_secret_here
   ```

2. **Push code to GitHub**:
   ```bash
   git push -u origin main
   ```

3. **Deploy to production** (Netlify/Vercel)

4. **Test complete flow**:
   - Register new customer
   - Browse medicines
   - Add to cart
   - Checkout with COD
   - View order history
   - Submit ERP inquiry

---

## 🎉 That's it! Your customer portal database is ready!
