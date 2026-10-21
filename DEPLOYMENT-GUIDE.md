# Deployment Guide: POS Integration + Type Dropdown

## Quick Start

This guide walks through deploying the POS integration and missing category fixes.

**Total Time:** 15-20 minutes  
**Risk Level:** LOW (backward compatible, no breaking changes)  
**Rollback:** Simple (reverse SQL migration if needed)

---

## Step 1: Deploy Database Migration (5 minutes)

### Option A: Supabase Dashboard (Easiest)

1. **Open Supabase Console**
   - Go to https://app.supabase.com
   - Select your project
   - Navigate to **SQL Editor** → **New Query**

2. **Copy Migration SQL**
   - Open file: `create-invoices-table-and-rpc.sql`
   - Copy entire contents
   - Paste into Supabase SQL Editor

3. **Run Migration**
   - Click **Run** button
   - Wait for completion (should show no errors)
   - Verify in bottom panel: "Query completed successfully"

4. **Verify Deployment**
   ```sql
   -- Check invoices table exists
   SELECT COUNT(*) as count FROM information_schema.tables 
   WHERE table_name = 'invoices';
   
   -- Should return: 1
   ```

### Option B: Using Supabase CLI

```bash
cd d:\new erp\erpbillsprouts-main

# Ensure you have Supabase CLI installed
supabase --version

# Pull latest schema
supabase db pull

# Apply migration
supabase db push

# Wait for completion
```

### Option C: Direct psql Command

```bash
# Windows PowerShell
$password = "your_supabase_password"
$host = "db.xxxxx.supabase.co"
$username = "postgres"
$database = "postgres"

psql -h $host -U $username -d $database -f create-invoices-table-and-rpc.sql

# When prompted for password, enter your Supabase password
```

---

## Step 2: Deploy Frontend Code (5 minutes)

### 1. Update Source Files

Ensure these files are deployed (already modified):

```
✅ src/pages/admin/medicines/MedicinesPage.jsx
✅ src/pages/admin/medicines/MedicineModal.jsx
✅ src/pages/admin/pos/POSPage.jsx
✅ src/App.jsx
```

### 2. Create New File

Copy this file to your project:
```
✅ src/pages/admin/invoice/InvoicePrintPage.jsx
```

**Directory Structure:**
```
src/
  pages/
    admin/
      invoice/
        InvoicePrintPage.jsx  ← NEW FILE
      medicines/
        MedicinesPage.jsx     ← UPDATED
        MedicineModal.jsx     ← UPDATED
      pos/
        POSPage.jsx           ← UPDATED
  App.jsx                      ← UPDATED
```

### 3. Install Dependencies (if needed)

```bash
# All dependencies should already be installed
# No new packages required

# Verify your imports are working
cd d:\new erp\erpbillsprouts-main
npm install
```

---

## Step 3: Build & Test (5 minutes)

### 1. Development Build

```bash
# Start dev server
npm run dev

# Navigate to http://localhost:5173 (or your dev port)
# Application should start without errors
```

### 2. Production Build

```bash
# Create production bundle
npm run build

# Check for errors in output
# Should complete with no errors
```

### 3. Quick Smoke Tests

**Test 1: Medicines Page**
- Navigate to `/admin/medicines`
- Click "Add Medicine"
- Open Category dropdown
- Verify "Antihistamine" appears in list
- ✅ Should be visible between "Antibiotics" and "Pain Relief"

**Test 2: POS Sale Creation**
- Navigate to `/admin/pos`
- Select "Retail" sale type
- Search for a medicine with stock
- Add to cart
- Click "Process Sale"
- Wait for completion
- ✅ Should see success toast: "Sale completed successfully!"
- ✅ Invoice should print automatically

**Test 3: Invoice Print Page**
- After completing a sale, note the invoice number
- Navigate to: `/admin/invoice/{invoice-id}/print`
- Replace `{invoice-id}` with actual UUID
- ✅ Should see clean invoice page with Print button
- ✅ Print button should work
- ✅ Back button should return to previous page

---

## Step 4: Verify Database

### Check Migration Results

```sql
-- 1. Verify invoices table exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'invoices';
-- Expected: Returns 'invoices'

-- 2. Verify table columns
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'invoices'
ORDER BY ordinal_position;
-- Expected: 20+ columns including sale_id, invoice_number, payment_status, etc.

-- 3. Verify indexes created
SELECT indexname FROM pg_indexes 
WHERE tablename = 'invoices';
-- Expected: Returns idx_invoices_*, idx_invoices_payment_status, etc.

-- 4. Verify RPC functions created
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN ('create_invoice', 'get_invoice_details', 'mark_invoice_printed');
-- Expected: Returns 3 rows

-- 5. Test create_invoice function (optional - test call)
-- Note: This will create a test sale/invoice, delete after testing
SELECT create_invoice(
  'TEST-INV-' || to_char(NOW(), 'YYYYMMDDHH24MISS'),
  NULL,
  1000.00, 0.00, 180.00, 1180.00,
  1180.00, 0.00,
  'cash', 'paid', 'retail',
  '[{"medicine_id":"","batch_id":"","quantity":1,"free_quantity":0,"selling_price":1000,"discount":0,"gst_percentage":18,"gst_amount":180,"total":1180}]'::jsonb,
  (SELECT id FROM profiles LIMIT 1),
  'test-' || to_char(NOW(), 'YYYYMMDDHH24MISS')
);
-- Expected: {"success": true, "message": "Invoice created successfully", ...}
```

---

## Step 5: Post-Deployment Verification

### Checklist

- [ ] Database migration ran successfully
- [ ] No SQL errors in console
- [ ] Frontend code builds without errors
- [ ] Development server starts without errors
- [ ] Production build completes successfully
- [ ] Medicines page shows "Antihistamine" in dropdown
- [ ] POS sale creation works end-to-end
- [ ] Invoice print page accessible
- [ ] Browser console has no critical errors
- [ ] All toast notifications display correctly

### Monitor Logs

**Supabase Logs:**
- Go to Supabase Dashboard → Logs
- Filter by table: `invoices`
- Should see INSERT operations when sales are created
- No error entries

**Frontend Logs:**
- Open browser DevTools (F12)
- Console should show no red errors
- React DevTools extension shows no errors
- Network tab shows successful API calls

---

## Troubleshooting

### Issue: "RPC function create_invoice not found"

**Cause:** SQL migration didn't run or failed  
**Solution:**
1. Check Supabase SQL Editor logs
2. Re-run the migration
3. Verify permissions: `GRANT EXECUTE ON FUNCTION create_invoice TO authenticated;`

### Issue: "invoices table already exists"

**Cause:** Migration was already applied  
**Solution:**
- This is fine, the migration is idempotent
- Check if RPC functions exist (they should)
- No need to re-run

### Issue: POS sale creation fails with "Cannot read property 'rpc'"

**Cause:** Supabase client not initialized correctly  
**Solution:**
1. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`
2. Rebuild frontend: `npm run build && npm run dev`
3. Check browser console for detailed error

### Issue: "Insufficient stock" error even with stock available

**Cause:** RPC is checking batch.current_quantity which may be outdated  
**Solution:**
1. Verify medicine batch has `current_quantity > 0`
2. Check stock_movements table for unexpected deductions
3. Run stock audit query:
   ```sql
   SELECT mb.batch_number, mb.current_quantity, 
          COALESCE(SUM(CASE WHEN sm.movement_type IN ('sale','damage') 
                            THEN -sm.quantity ELSE sm.quantity END), 0) as deducted
   FROM medicine_batches mb
   LEFT JOIN stock_movements sm ON mb.id = sm.batch_id
   GROUP BY mb.id, mb.batch_number, mb.current_quantity
   HAVING mb.current_quantity < 0;
   -- Should return no rows
   ```

### Issue: InvoicePrintPage shows "Invoice Not Found"

**Cause:** Invoice UUID doesn't exist or user has no permission  
**Solution:**
1. Verify invoice exists in database
2. Check Supabase RLS policies
3. Verify user is authenticated and has admin role

---

## Rollback Plan

### If Issues Occur

**Step 1: Revert Frontend** (1 minute)
```bash
# Revert changes to source files
git checkout src/pages/admin/medicines/MedicinesPage.jsx
git checkout src/pages/admin/medicines/MedicineModal.jsx
git checkout src/pages/admin/pos/POSPage.jsx
git checkout src/App.jsx

# Delete new file
rm src/pages/admin/invoice/InvoicePrintPage.jsx

# Rebuild
npm run build
npm run dev
```

**Step 2: Revert Database** (if critical)
```sql
-- Only if RPC or table caused corruption

-- Option 1: Keep invoices table (recommended)
-- - New table won't break existing data
-- - Keep for future debugging
-- - Existing sales table unchanged

-- Option 2: Drop everything (complete rollback)
-- DROP TABLE IF EXISTS invoices CASCADE;
-- DROP FUNCTION IF EXISTS create_invoice(...) CASCADE;
-- DROP FUNCTION IF EXISTS get_invoice_details(...) CASCADE;
-- DROP FUNCTION IF EXISTS mark_invoice_printed(...) CASCADE;

-- After rollback, update frontend to use old direct insert method
```

---

## Post-Deployment

### Monitoring (First 24 hours)

1. **Check Error Logs**
   - Supabase Dashboard → Logs
   - Sentry/error tracking platform
   - Application error tracking

2. **Check Performance**
   - Database query times
   - RPC function execution time
   - Frontend load time

3. **User Feedback**
   - Monitor POS team for issues
   - Check support tickets
   - Gather usage metrics

### Metrics to Track

```sql
-- Daily invoice volume
SELECT DATE(created_at), COUNT(*) as invoices
FROM invoices
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY DATE(created_at) DESC;

-- Error rate (check for duplicates)
SELECT COUNT(*) as duplicates
FROM (
  SELECT idempotency_key, COUNT(*) as cnt
  FROM invoices
  WHERE idempotency_key IS NOT NULL
  GROUP BY idempotency_key
  HAVING COUNT(*) > 1
) t;

-- Average RPC execution time
-- (Check in Supabase Logs or APM tool)
```

---

## Support & Questions

- **Schema Questions:** See `POS-INTEGRATION-IMPLEMENTATION-REPORT.md`
- **Code Questions:** Check inline comments in source files
- **SQL Questions:** See `create-invoices-table-and-rpc.sql`

---

## Deployment Checklist Summary

```
PRE-DEPLOYMENT
  [ ] Backup database
  [ ] Test in development environment
  [ ] Code review approved
  [ ] Performance testing passed

DEPLOYMENT
  [ ] Run SQL migration
  [ ] Deploy frontend code (5 files)
  [ ] Run npm build
  [ ] Deploy to production

POST-DEPLOYMENT  
  [ ] Verify database changes
  [ ] Test POS flow end-to-end
  [ ] Monitor error logs
  [ ] Check user feedback
  [ ] Monitor performance metrics

DONE ✅
```

---

**Deployed By:** [Your Name]  
**Date:** [Deployment Date]  
**Status:** [Successful/Rolled Back]  
**Notes:** [Any special notes]

