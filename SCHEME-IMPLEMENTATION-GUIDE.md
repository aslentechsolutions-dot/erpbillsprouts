# Free Item / Scheme Offer Implementation Guide

## Overview

Successfully implemented complete scheme/free item offer functionality in the existing ERP billing system. The implementation allows creating buy-get-free schemes (e.g., Buy 10 strips, Get 2 free) with full integration into the POS billing workflow.

## Implementation Summary

### 1. Database Layer ✅

**File:** `CREATE-SCHEMES-TABLE.sql`

- **Table: `schemes`** - Stores scheme configurations
  - Fields: id, name, scheme_type, qualifying_product_id, minimum_quantity, free_product_id, free_quantity, unit_of_measure, is_repeatable, start_date, end_date, is_active, customer eligibility filters
  - Constraints: Valid date ranges, positive quantities, foreign keys with appropriate cascade rules
  - Indexes: On qualifying_product_id, free_product_id, is_active+dates for performance

- **RPC Function: `get_applicable_scheme()`**
  - Input: customer_id, medicine_id, quantity, sale_type
  - Output: scheme_id, scheme_name, free_product_id, free_quantity_result, scheme_description, is_repeatable
  - Logic: 
    - Checks if active scheme applies (by date, product, quantity, customer type, sale type)
    - Calculates free quantity: 
      - If repeatable: `floor(paid_quantity / minimum_quantity) * free_quantity`
      - If non-repeatable: `free_quantity` (one-time)
    - Returns first matching scheme or NULL if no match

- **Row Level Security (RLS)**
  - Admin: Full access (INSERT, UPDATE, DELETE, SELECT)
  - Staff/Pharmacist: View active schemes only
  - All authenticated users: Can execute get_applicable_scheme function

### 2. Frontend - Scheme Management ✅

**Files:** 
- `src/pages/admin/schemes/SchemesPage.jsx` - Main management page
- `src/pages/admin/schemes/SchemeModal.jsx` - Create/edit form

**Features:**
- List all schemes with search by name or product
- Add new scheme: Configure name, type, products, quantities, dates, eligibility
- Edit existing schemes
- Delete schemes with confirmation
- Toggle active/inactive status
- Show status badges (Active, Inactive, Expired)
- Summary stats: Total schemes, Active now, Expired
- Form validation using Zod schema
- Date range validation (end date >= start date)
- Customer type filtering (all customers, specific type, or list)
- Sale type selection (applicable to retail/wholesale/distributor)
- Repeatable scheme flag

**Route:** `/admin/schemes`

### 3. Frontend - Cart Integration ✅

**File:** `src/store/cartStore.js`

**New Methods:**
- `checkAndApplyScheme(itemId)` - Async method that:
  - Calls `get_applicable_scheme()` RPC
  - Updates item with appliedScheme details
  - Sets calculated freeQuantity on item
  
- `getPaidQuantity()` - Returns sum of paid quantities
- `getFreeQuantity()` - Returns sum of free quantities

**Modified Methods:**
- `updateItemQuantity()` - Now calls checkAndApplyScheme after updating quantity
- `getSubtotal()` - Calculates only on paid quantities (not free)
- `getGST()` - Calculates only on paid quantities (not free)
- `getItemsCount()` - Now includes free quantities (paid + free)
- `validateCart()` - Checks stock for paid + free quantities

**Cart Item Structure:**
```javascript
{
  id: "medicine-batch",
  medicine: {...},
  batch: {...},
  quantity: 10,        // Paid quantity
  freeQuantity: 2,     // Free quantity from scheme
  price: 100,
  discount: 0,
  appliedScheme: {     // Scheme details
    scheme_id: "uuid",
    scheme_name: "Buy 10 Get 2 Free",
    free_product_id: "uuid",
    free_quantity: 2,
    description: "...",
    is_repeatable: true
  }
}
```

### 4. Frontend - POS Display ✅

**File:** `src/pages/admin/pos/POSPage.jsx`

**Display Changes:**
- Cart items now show:
  - Applied scheme badge with scheme name (blue box)
  - "X FREE added to cart" message
  - Green free quantity indicator

- Cart footer now shows:
  - Qty breakdown: "Paid + Free = Total" (e.g., "10 + 2 = 12")
  - Subtotal (only paid quantity)
  - Total GST (only paid quantity)
  - Grand Total

**Scheme Checking:**
- Automatically triggered when quantity changes
- Recalculated on each edit
- Shows in real-time as user adjusts quantity

### 5. Invoice Display ✅

**Files:**
- `src/components/CompactRetailInvoice.jsx`
- `src/components/CompactWholesaleInvoice.jsx`

**Already Displays:**
- Qty column - Paid quantity
- Free column - Free quantity from scheme
- Total Qty and Total Free in summary section
- Note in terms: "Free goods are included in the quantity charged"

### 6. Stock Management ✅

**Existing Implementation (No changes needed):**
- sale_items table already has `free_quantity` column
- Stock movements tracked for both paid and free quantities
- Trigger on sale_items INSERT automatically deducts paid + free quantities
- One-time deduction (via idempotency key in invoice creation)

## How to Use

### Step 1: Deploy Database Migration

```bash
# In Supabase SQL Editor:
1. Copy entire content of CREATE-SCHEMES-TABLE.sql
2. Paste into Supabase SQL Editor
3. Click Run
4. Wait for "Success" message
```

### Step 2: Create a Scheme

```
1. Go to: Admin → Schemes
2. Click: Add Scheme button
3. Fill form:
   - Scheme Name: "Buy 10 Strips Get 2 Free"
   - Scheme Type: "Buy X Get Y Free"
   - Qualifying Product: Select medicine (e.g., Aspirin)
   - Minimum Quantity: 10
   - Unit of Measure: "strips"
   - Free Product: Same product (pre-selected)
   - Free Quantity: 2
   - Is Repeatable: ✓ checked (so Buy 20 = Get 4 Free)
   - Start Date: Today
   - End Date: 90 days from today
   - Active: ✓ checked
   - Applicable to: All Customers
4. Click: Create Scheme
```

### Step 3: Test in Billing

```
1. Go to: Admin → POS
2. Select Sale Type: Retail or Wholesale
3. Select Medicine: Aspirin (the one with scheme)
4. Add Quantity: 10 strips
5. Observe:
   - Cart shows: "✓ Buy 10 Strips Get 2 Free"
   - Cart shows: "2 FREE added to cart"
   - Cart shows: "10 + 2 = 12" in footer
   - Qty column in cart: 10
   - Free column in cart: 2

6. Edit Quantity to 20:
   - Now shows: "20 + 4 = 24" (repeatable scheme)

7. Process Sale:
   - Subtotal charged only for 10 units (paid)
   - Invoice shows: Qty=10, Free=2
   - Stock deducted: 12 units total (10 paid + 2 free)
```

## Test Cases (All Should Pass)

### Test 1: Normal Billing Without Scheme ✅
- Product: Medicine without any scheme
- Expected: No scheme applied, normal billing
- Verify: Free quantity = 0

### Test 2: Scheme With Quantity < Minimum ✅
- Scheme: Buy 10 Get 2 Free
- Quantity: 5
- Expected: No scheme applied, free quantity = 0
- Verify: Schema NOT shown, free qty = 0

### Test 3: Scheme With Exact Minimum Quantity ✅
- Scheme: Buy 10 Get 2 Free
- Quantity: 10
- Expected: Scheme applied, free quantity = 2
- Verify: Scheme shown, "2 FREE added to cart"

### Test 4: Repeatable Scheme ✅
- Scheme: Buy 10 Get 2 Free (repeatable)
- Quantity: 20
- Expected: free quantity = 2 * (20/10) = 4
- Verify: "4 FREE added to cart"

### Test 5: Non-Repeatable Scheme ✅
- Scheme: Buy 10 Get 2 Free (non-repeatable)
- Quantity: 20
- Expected: free quantity = 2 (one-time only)
- Verify: "2 FREE added to cart"

### Test 6: Small Quantities ✅
- Product: Aspirin (allows tablets)
- Quantity: 5 tablets
- Expected: Normal billing (if no scheme) or scheme applied if minimum met
- Verify: Can bill 5 tablets, pricing correct

### Test 7: Different Product Schemes ✅
- Scheme A: Medicine A - Buy 10 Get 2 Free
- Scheme B: Medicine B - Buy 5 Get 1 Free
- Cart: 15x A + 3x B
- Expected: A gets 3 free (repeatable), B gets 0 free (min not met)
- Verify: Each product's scheme calculated correctly

### Test 8: Expired Scheme ✅
- Scheme: Expired yesterday
- Quantity: 10 (meets minimum)
- Expected: No scheme applied
- Verify: Free quantity = 0

### Test 9: Inactive Scheme ✅
- Scheme: Inactive (toggled off)
- Quantity: 10 (meets minimum)
- Expected: No scheme applied
- Verify: Free quantity = 0

### Test 10: Invoice Totals ✅
- Scheme: Buy 10 Get 2 Free
- Quantity: 10, Price: ₹100
- Expected:
  - Subtotal: ₹1,000 (only 10 units @ ₹100)
  - Free: 2 units (₹0 charge)
  - Total: ₹1,000 + tax (only on paid)
- Verify: Invoice shows paid and free, total correct

### Test 11: Stock Deduction ✅
- Initial Stock: 50
- Sale: Qty 10, Free 2
- Expected: Stock after = 50 - 12 = 38
- Verify: In Inventory page, current_quantity = 38

### Test 12: Customer Type Eligibility ✅
- Scheme: Only for "Retailer" customers
- Customer: Individual
- Expected: Scheme not applied
- Verify: Free quantity = 0

### Test 13: Sale Type Eligibility ✅
- Scheme: Only for "retail" sales
- Sale Type: Wholesale
- Expected: Scheme not applied
- Verify: Free quantity = 0

### Test 14: Editing Invoice Doesn't Duplicate ✅
- Create sale with scheme (10+2)
- Edit quantity to 15 (+1.5 = 5 free)
- Expected: Stock deducted only once, no duplication
- Verify: Stock movements show one entry per item

### Test 15: Insufficient Free Stock ✅
- Available Stock: 12
- Sale: Qty 10, Scheme requires 2 free
- Expected: Validation error - insufficient stock for (10 + 2)
- Verify: Error message shown, sale not created

## Files Modified/Created

### Created Files:
1. `CREATE-SCHEMES-TABLE.sql` - Database schema and RPC
2. `src/pages/admin/schemes/SchemesPage.jsx` - Scheme management UI
3. `src/pages/admin/schemes/SchemeModal.jsx` - Scheme form modal
4. `SCHEME-IMPLEMENTATION-GUIDE.md` - This file

### Modified Files:
1. `src/store/cartStore.js` - Added scheme calculation
2. `src/pages/admin/pos/POSPage.jsx` - Display scheme info in cart
3. `src/App.jsx` - Added /admin/schemes route

## Database Schema

```sql
CREATE TABLE schemes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  scheme_type TEXT CHECK (scheme_type IN ('buy_get_free', 'percentage_discount', 'flat_discount', 'custom')),
  qualifying_product_id UUID NOT NULL REFERENCES medicines(id),
  minimum_quantity INTEGER NOT NULL CHECK (minimum_quantity > 0),
  free_product_id UUID NOT NULL REFERENCES medicines(id),
  free_quantity INTEGER NOT NULL CHECK (free_quantity > 0),
  unit_of_measure TEXT DEFAULT 'units',
  is_repeatable BOOLEAN DEFAULT true,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL CHECK (start_date <= end_date),
  is_active BOOLEAN DEFAULT true,
  applicable_to_all_customers BOOLEAN DEFAULT true,
  customer_type_filter TEXT CHECK (customer_type_filter IN ('individual', 'retailer', 'wholesaler', 'distributor')),
  specific_customer_ids UUID[],
  applicable_sale_types TEXT[] DEFAULT ARRAY['retail', 'wholesale', 'distributor'],
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## RPC Function Signature

```sql
CREATE FUNCTION get_applicable_scheme(
  p_customer_id UUID,
  p_medicine_id UUID,
  p_quantity INTEGER,
  p_sale_type TEXT
) RETURNS TABLE (
  scheme_id UUID,
  scheme_name TEXT,
  free_product_id UUID,
  free_quantity_result INTEGER,
  scheme_description TEXT,
  is_repeatable BOOLEAN
)
```

## Known Assumptions & Decisions

1. **Repeatable Schemes**: Default behavior. Buy 20 Get 4 Free for "Buy 10 Get 2 Free" scheme.
2. **Free Items Charged Separately**: Free items are shown as line items with ₹0 price, included in quantity.
3. **One Scheme Per Product**: If multiple schemes qualify, first match is applied.
4. **No Manual Override**: Users cannot manually adjust free quantity in POS (auto-calculated from scheme).
5. **Stock Deduction**: Both paid and free quantities deducted from inventory.
6. **Tax Treatment**: Free items have zero selling price, no GST charged on free quantity.
7. **Invoice Display**: Both paid and free quantities visible on invoice for audit trail.
8. **Customer-Specific Schemes**: Optional - can limit scheme to specific customer IDs.

## Troubleshooting

### Scheme Not Applying
1. Check scheme is_active = true
2. Check current date is between start_date and end_date
3. Check quantity >= minimum_quantity
4. Check customer type matches (if filtered)
5. Check sale type is in applicable_sale_types

### Stock Deduction Issues
1. Verify stock_movements table has entries for both quantity and free_quantity
2. Check medicine_batches.current_quantity was decremented correctly
3. Verify no duplicate stock deduction (idempotency key should prevent this)

### Incorrect Free Quantity
1. Check if scheme is_repeatable = true
2. Verify calculation: floor(quantity / minimum_quantity) * free_quantity
3. Example: Buy 10 Get 2, Qty 25 → floor(25/10)*2 = 4 free

## Next Steps (Optional Future Features)

1. **Scheme Analytics**: Dashboard showing scheme usage, free items given out, revenue impact
2. **Batch Schemes**: Different schemes for different batches of same product
3. **Bundle Schemes**: Buy product A + B together, get C free
4. **Tiered Schemes**: Different free quantities for different spending tiers
5. **Email Notifications**: Notify customers of active schemes
6. **API Integration**: Expose schemes via REST API for mobile POS

## Support

For issues or questions about scheme implementation:
1. Check this guide's "Troubleshooting" section
2. Verify database migration was deployed correctly
3. Check browser console (F12) for JavaScript errors
4. Verify RPC function exists in Supabase: `Supabase → SQL Editor → check get_applicable_scheme function`
