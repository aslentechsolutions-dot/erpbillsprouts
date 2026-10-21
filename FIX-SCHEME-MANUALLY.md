# Fix Scheme Update Issue

## Quick Fix (Delete & Recreate)

If you **cannot edit the existing scheme**, follow these steps:

### Step 1: Delete the old scheme
1. Go to **Admin → Schemes**
2. Click the **Delete icon (trash)** next to "aslentechsolutions"
3. Confirm deletion

### Step 2: Create new scheme with correct values
1. Click **Add Scheme**
2. Fill in:
   - **Scheme Name:** Buy 10 Get 2 Free
   - **Scheme Type:** Buy X Get Y Free
   - **Qualifying Product:** Cetirizine 10mg
   - **Minimum Quantity:** 10
   - **Unit of Measure:** units
   - **Free Product:** Cetirizine 10mg (same)
   - **Free Quantity:** 2
   - **Repeatable:** ✓ (checked)
   - **Start Date:** Today
   - **End Date:** 90 days from today
   - **Active:** ✓ (checked)
   - **Applicable to All Customers:** ✓ (checked)
   - **Applicable Sale Types:** Retail, Wholesale, Distributor (all checked)
3. Click **Create Scheme**

### Step 3: Test in POS
1. Go to **Admin → POS**
2. Add **Cetirizine 10mg** to cart with qty **10**
3. You should see:
   - ✓ "Buy 10 Get 2 Free" scheme applied
   - ✓ "2 FREE added to cart"
   - ✓ Qty: 10 + 2 = 12

## Technical Note

If you still cannot update or delete, run this SQL in Supabase:
```sql
-- Delete problematic scheme
DELETE FROM schemes WHERE name = 'aslentechsolutions' AND created_by IS NULL;

-- Verify deletion
SELECT * FROM schemes;
```

Then create a new scheme through the UI.
