# 🚨 QUICK FIX: Order Creation Error

## Problem
**Error:** "Failed to load resource: the server responded with a status of 400"
**Cause:** Database tables `customer_orders` and `customer_order_items` don't exist yet

---

## Solution (2 Minutes)

### 1️⃣ Open Supabase
Go to: https://supabase.com/dashboard/project/kkcugqqohxfegdjipllo/editor

### 2️⃣ Click "SQL Editor" (left sidebar)

### 3️⃣ Copy & Run This SQL

Open the file: `COMPLETE-CUSTOMER-ORDERS-MIGRATION.sql`

Copy ALL content (Ctrl+A, Ctrl+C)

Paste into SQL Editor (Ctrl+V)

Click **"Run"** or press **Ctrl+Enter**

### 4️⃣ Done! ✅

Refresh your app and try placing an order again.

---

## What This Does
- Creates `customer_orders` table
- Creates `customer_order_items` table  
- Sets up security policies
- Enables order numbering (ORD-20261016-0001)

---

## Still Having Issues?

### Check if tables exist:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE 'customer_%';
```

Should show:
- customer_orders
- customer_order_items

### Check your user role:
Make sure you're logged in as a **patient** role user (not admin) when placing orders.

---

## Need ERP Inquiry Form Too?

Run the second migration: `migration-erp-inquiries.sql`

Same steps:
1. Open SQL Editor
2. Copy content from `migration-erp-inquiries.sql`
3. Paste and run
4. Done!

---

## ⚡ After Migration Works

Test order flow:
1. Go to Medicine Store
2. Add medicine to cart
3. Go to cart → Checkout
4. Fill delivery address
5. Select "Cash on Delivery"
6. Click "Place Order"
7. ✅ Should see "Order placed successfully!"

---

**Need help?** Check `DATABASE-SETUP-INSTRUCTIONS.md` for detailed guide.
