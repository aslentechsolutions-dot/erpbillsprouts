# Customer Types Implementation - Complete Guide

## 📋 Overview

The system now supports **4 customer types** with proper transaction tracking and required fields:

1. **Individual** - Walk-in patients/customers
2. **Retailer** - Retail stores
3. **Wholesaler** - Wholesale distributors  
4. **Distributor** - Direct manufacturer distributors (NEW)

---

## 🎯 Customer Types Detail

### 1. INDIVIDUAL (Walk-in Customer)

**Use Case:** Direct patient/customer purchases at retail counter

**Required Fields:**
- Name
- Phone (optional)
- Address (optional)

**Optional Fields:**
- Patient ID
- Doctor Name (for prescriptions)
- MCI Number (doctor registration)
- Prescription (for restricted medicines)

**Transaction Tracking:**
- All sales recorded in `sales` table
- History available in sales ledger
- No credit/on-account allowed (typically cash only)

**Billing:**
- Simple retail invoice
- Customer details auto-filled from POS selection

---

### 2. RETAILER (Retail Store)

**Use Case:** Medicine retail shops selling to walk-in customers

**Required Fields:**
- Business Name
- GST Number (GSTIN)
- Drug License Number
- Address
- Contact Person Name
- Phone Number

**Optional Fields:**
- FSSAI License (for food/cosmetics)
- Email
- Notes

**Transaction Tracking:**
- All sales recorded in `sales` table
- Credit/on-account transactions allowed
- Customer ledger maintained
- Payment history tracked

**Billing:**
- Retail invoice with GST/SGST breakdown
- Business details displayed
- Drug License shown on invoice

---

### 3. WHOLESALER (Wholesale Distributor)

**Use Case:** Bulk medicine distribution to retailers

**Required Fields:**
- Business Name
- GST Number (GSTIN)
- Drug License Number
- Address
- Contact Person Name
- Phone Number
- Credit Limit

**Optional Fields:**
- FSSAI License
- Email
- Payment Terms (days)
- Notes

**Transaction Tracking:**
- All sales recorded in `sales` table
- Credit transactions with due date
- Customer ledger with outstanding balance
- Payment reconciliation

**Billing:**
- Wholesale invoice with GSTIN box
- Wholesale pricing applied
- Tax Invoice format (for B2B)
- Business details mandatory

---

### 4. DISTRIBUTOR (Manufacturer Distributor) - NEW

**Use Case:** Direct distribution from manufacturers to retailers/wholesalers

**Required Fields:**
- Business Name
- GST Number (GSTIN)
- Drug License Number
- FSSAI License (required)
- Address
- Contact Person Name
- Phone Number
- Credit Limit

**Optional Fields:**
- Email
- Payment Terms
- Notes

**Transaction Tracking:**
- All transactions recorded (same as wholesaler)
- Advanced inventory management
- Margin tracking
- Supply chain visibility

**Billing:**
- Tax Invoice (same as wholesaler format)
- Can show as distributor tier for reporting
- FSSAI details on invoice

---

## 🗄️ Database Fields

### customers table

All customer types use these fields:

```sql
-- Basic Info
id UUID PRIMARY KEY
name TEXT - Personal/Contact person name
business_name TEXT - Company name
customer_type TEXT - 'individual' | 'retailer' | 'wholesaler' | 'distributor'
status TEXT - 'active' | 'inactive'

-- Contact
phone TEXT
email TEXT
address TEXT
city TEXT
state TEXT
pincode TEXT

-- Tax & Compliance (for business customers)
gstin TEXT - GST ID (optional for individual, required for business)
drug_license_number TEXT - Drug license
drug_license_expiry DATE
fssai_number TEXT - FSSAI license
fssai_expiry DATE - FSSAI expiry
pan TEXT - PAN (for business)

-- Patient Details (for individual)
patient_id TEXT
date_of_birth DATE
gender TEXT
emergency_contact TEXT

-- Business Details (for retailers/wholesalers/distributors)
opening_balance DECIMAL
current_balance DECIMAL
credit_limit DECIMAL
credit_days INTEGER
payment_terms TEXT

-- Audit
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
notes TEXT
```

### Transaction Tracking

All transactions recorded in:
- `sales` table - Sale records
- `sale_items` table - Item details
- `customer_ledger` table - Financial tracking
- `stock_movements` table - Inventory changes

---

## 🔧 How to Use in POS

### Step 1: Database Setup

First, deploy the fix:

**File:** `DEPLOY-FIXES-FIRST.sql`

```
Supabase Dashboard → SQL Editor → Run Script
```

This adds:
- ✅ Invoices table (with sale_id column)
- ✅ create_invoice RPC function
- ✅ Distributor customer type
- ✅ All necessary indexes

### Step 2: Frontend Now Supports All Types

The POS automatically filters customers by type:

```javascript
// POSPage.jsx now supports:
const [customers, setCustomers] = useState([])      // Individual
const [wholesalers, setWholesalers] = useState([])  // Wholesaler
const [retailers, setRetailers] = useState([])      // Retailer
const [distributors, setDistributors] = useState([]) // Distributor (NEW)
```

### Step 3: Sales Process

1. Open POS (`/admin/pos`)
2. Select Sale Type ("Retail" or "Wholesale")
3. Select Customer:
   - Walk-in → Individual
   - Store name → Retailer
   - Wholesaler name → Wholesaler
   - Distributor name → Distributor
4. Add medicines
5. Apply discount if needed
6. Choose payment method
7. Process sale → Atomic invoice creation

---

## 📊 Fields by Customer Type

| Field | Individual | Retailer | Wholesaler | Distributor |
|-------|-----------|----------|-----------|-------------|
| Name | ✅ | ✅ | ✅ | ✅ |
| Business Name | ❌ | ✅ | ✅ | ✅ |
| GST | ❌ | ✅ | ✅ | ✅ |
| Drug License | ❌ | ✅ | ✅ | ✅ |
| FSSAI | ❌ | ❌ | ❌ | ✅ |
| Address | ❌ | ✅ | ✅ | ✅ |
| Phone | ❌ | ✅ | ✅ | ✅ |
| Contact Person | ❌ | ✅ | ✅ | ✅ |
| Patient ID | ✅ | ❌ | ❌ | ❌ |
| Doctor Name | ✅ | ❌ | ❌ | ❌ |
| MCI Number | ✅ | ❌ | ❌ | ❌ |
| Credit Limit | ❌ | ✅ | ✅ | ✅ |
| Credit Days | ❌ | ❌ | ✅ | ✅ |

---

## 📝 Creating Customers by Type

### Create Individual (Walk-in)

**Admin → Customers → Add Customer**
- Name: "John Doe"
- Type: Individual
- Phone: Optional
- Doctor Name: Optional
- MCI Number: Optional

### Create Retailer

**Admin → Retailers → Add Retailer**
- Business Name: "City Medical Store"
- Owner Name: "Suresh Gupta"
- GST: "27XXXXX..."
- Drug License: "DL-RT-001"
- Address: "123 Main Road"
- Phone: "+91 9876543210"
- Credit Limit: 100,000
- Payment Terms: "15 days"

### Create Wholesaler

**Admin → Wholesalers → Add Wholesaler**
- Business Name: "MediSupply Co."
- Owner Name: "Rajesh Sharma"
- GST: "27XXXXX..."
- Drug License: "DL-WS-001"
- Address: "456 Industrial Area"
- Phone: "+91 9876543200"
- Credit Limit: 500,000
- Payment Terms: "30 days"

### Create Distributor (NEW)

**Admin → Customers → Add Customer**
- Business Name: "PharmaDist Ltd"
- Contact Person: "Amit Kumar"
- Type: **Distributor** (new option)
- GST: "27XXXXX..."
- Drug License: "DL-DIS-001"
- FSSAI: "10013047000123" (required for distributor)
- Address: "321 Trade Center"
- Phone: "+91 9876543202"
- Credit Limit: 1,000,000
- Payment Terms: "45 days"

---

## 💾 Transaction Recording

### Every Sale Records:

1. **sales table**
   - invoice_number, customer_id, amount, payment_method, payment_status
   - sale_type (retail/wholesale), created_by, created_at

2. **sale_items table**
   - What medicines sold, quantities, prices, discounts, taxes

3. **stock_movements table**
   - Stock deducted from each batch

4. **customer_ledger table** (for credit customers)
   - Debit (sale amount), Credit (payment), Balance

5. **invoices table**
   - Persistent invoice record (can reprint anytime)

---

## 🔍 Reports Available

All transaction data enables:

- ✅ Individual customer purchase history
- ✅ Retailer credit balance & aging
- ✅ Wholesaler outstanding amount
- ✅ Distributor supply tracking
- ✅ Inventory movement analysis
- ✅ Payment reconciliation
- ✅ Ledger reports (by customer type)

---

## ⚠️ Important Notes

### GST Handling

- **Individual:** No GST ID needed
- **Retailer:** GST ID optional (if registered)
- **Wholesaler:** GST ID required (B2B)
- **Distributor:** GST ID required (B2B)

### Licensing

- **Drug License:** Required for Retailer, Wholesaler, Distributor
- **FSSAI License:** Optional for Retailer/Wholesaler, **Required for Distributor**
- **PAN:** Use for business identification in reports

### Prescriptions

- **Individual Customers:** Can require prescription (via medicine settings)
- **Business Customers:** Prescription not required (no end consumer)

### Credit Terms

- **Individual:** No credit (cash only typically)
- **Retailer:** Optional credit (usually immediate)
- **Wholesaler:** Credit standard (15-45 days)
- **Distributor:** Credit standard (30-45 days)

---

## 🚀 Next Steps

1. ✅ **Deploy Database Fix** (`DEPLOY-FIXES-FIRST.sql`)
2. ✅ **Test POS** - Create sale with each customer type
3. ✅ **Add Customers** - Create test distributors/wholesalers/retailers
4. ✅ **Test Invoicing** - Verify invoices print correctly for each type
5. ✅ **Monitor Transactions** - Check all types recorded in ledger

---

## 📞 Support

**Error: "column sale_id does not exist"?**
→ Run `DEPLOY-FIXES-FIRST.sql` immediately

**Error: "Distributor type not recognized"?**
→ Verify database fix was applied, restart frontend

**Question: How to filter by customer type?**
→ Admin → Customers → Filter by Type dropdown

**Question: Can customer type be changed?**
→ Yes, edit customer and change type (use caution with existing credit)

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Run `DEPLOY-FIXES-FIRST.sql` successfully
- [ ] Can create customer with type = 'distributor'
- [ ] POS allows selecting all 4 customer types
- [ ] Sales created without "sale_id" error
- [ ] Invoices persist in database
- [ ] Customer ledger updated for credit sales
- [ ] Transaction reports show all types

---

**Implementation Complete!** Your ERP now supports full customer type management with proper transaction tracking for all business tiers.

