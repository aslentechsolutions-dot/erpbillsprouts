# 📋 CUSTOMER TYPES REFERENCE GUIDE

**Quick Reference for All 4 Customer Types**  
**Last Updated:** October 20, 2026  

---

## 🎯 Customer Type Selection Guide

### When to Use Each Type:

```
┌─────────────────────────────────────────────────────────┐
│ INDIVIDUAL                                              │
├─────────────────────────────────────────────────────────┤
│ Use For: Walk-in patients, direct customers             │
│ Examples: Patient buying medicine, customer walk-in     │
│ Payment: Cash only (typically)                          │
│ Credit: No                                              │
│ Invoice: Simple receipt format                          │
│ GST: Not applicable                                     │
│ Ledger: Not tracked                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ RETAILER                                                │
├─────────────────────────────────────────────────────────┤
│ Use For: Retail medicine shops                          │
│ Examples: Local pharmacy, chemist shop                  │
│ Payment: Cash or Credit                                 │
│ Credit: Optional (typically immediate)                  │
│ Invoice: Business invoice format                        │
│ GST: Applicable (GSTIN required)                        │
│ Ledger: Tracked if credit enabled                       │
│ License: GST + Drug License + FSSAI (optional)         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ WHOLESALER                                              │
├─────────────────────────────────────────────────────────┤
│ Use For: Bulk buyers, wholesale distributors            │
│ Examples: Chain pharmacy, bulk buyer                    │
│ Payment: Credit (typically 15-45 days)                  │
│ Credit: Standard (with credit limit)                    │
│ Invoice: Tax invoice (B2B format)                       │
│ GST: Applicable with GSTIN verification                 │
│ Ledger: Full balance tracking                           │
│ License: GST + Drug License + FSSAI (optional)         │
│ Special: Credit limit, payment terms, opening balance  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ DISTRIBUTOR (NEW)                                       │
├─────────────────────────────────────────────────────────┤
│ Use For: Manufacturer distributors (B2B)                │
│ Examples: Distributor from manufacturer, PCD agent     │
│ Payment: Credit (typically 30-45 days)                  │
│ Credit: Standard (with credit limit)                    │
│ Invoice: Tax invoice (B2B format)                       │
│ GST: Applicable with GSTIN verification                 │
│ Ledger: Full balance tracking + supply tracking         │
│ License: GST + Drug License + FSSAI (MANDATORY)       │
│ Special: Credit limit, payment terms, opening balance  │
│ ⚠️ DIFFERENCE: FSSAI is REQUIRED (not optional)        │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 Field Requirements by Type

### INDIVIDUAL

**Required Fields:**
- Name ✅

**Optional Fields:**
- Phone
- Email
- Address
- Patient ID
- Date of Birth
- Gender
- Emergency Contact

**Invoice:** Simple format
**GST:** Not applicable
**Credit:** No

---

### RETAILER

**Required Fields:**
- Business Name ✅
- Contact Person ✅
- GSTIN ✅
- Drug License ✅

**Optional Fields:**
- Phone
- Email
- Address
- FSSAI
- Opening Balance

**Invoice:** Business invoice
**GST:** Applicable
**Credit:** Optional

---

### WHOLESALER

**Required Fields:**
- Business Name ✅
- Contact Person ✅
- GSTIN ✅
- Drug License ✅

**Optional Fields:**
- Phone
- Email
- Address
- FSSAI
- Credit Limit
- Opening Balance

**Invoice:** Tax invoice (B2B)
**GST:** Applicable
**Credit:** Standard (15-45 days)

---

### DISTRIBUTOR (NEW)

**Required Fields:**
- Business Name ✅
- Contact Person ✅
- GSTIN ✅
- Drug License ✅
- **FSSAI (MANDATORY)** ✅

**Optional Fields:**
- Phone
- Email
- Address
- Credit Limit
- Opening Balance

**Invoice:** Tax invoice (B2B)
**GST:** Applicable
**Credit:** Standard (30-45 days)
**⚠️ NOTE:** FSSAI is REQUIRED for distributors

---

## 🔄 POS Sales Flow by Customer Type

### INDIVIDUAL Purchase
```
1. Go to POS
2. Select Sale Type: Retail
3. Select Customer: (Individual from list)
4. Add Medicines
5. Amount Due (typically cash)
6. Process Sale
7. Print Simple Receipt
```

### RETAILER Purchase
```
1. Go to POS
2. Select Sale Type: Retail or Wholesale
3. Select Customer: (Retailer from list)
4. Add Medicines
5. Amount Due (cash or credit)
6. Process Sale
7. Print Business Invoice
8. Ledger updated if credit
```

### WHOLESALER Purchase
```
1. Go to POS
2. Select Sale Type: Wholesale
3. Select Customer: (Wholesaler from list)
4. Add Medicines (bulk quantities)
5. Apply Wholesale Pricing
6. Credit Terms: 15-45 days
7. Process Sale
8. Print Tax Invoice
9. Ledger tracked for credit
```

### DISTRIBUTOR Purchase
```
1. Go to POS
2. Select Sale Type: Wholesale
3. Select Customer: (Distributor from list)
4. Add Medicines (bulk quantities)
5. Apply Distributor Pricing
6. Credit Terms: 30-45 days
7. Process Sale
8. Print Tax Invoice
9. Ledger tracked for credit & supply
```

---

## 💰 Pricing Strategy

### INDIVIDUAL Purchases
```
Medicine Price: ₹100
Retail Markup: 20%
Final Price: ₹120
GST: Not applicable
```

### RETAILER Purchases
```
Medicine Cost: ₹80
Retailer Markup: 50%
Selling Price: ₹120
GST (5%): ₹6
Invoice Total: ₹126
```

### WHOLESALER Purchases
```
Medicine Cost: ₹60
Wholesale Discount: 30-40%
Wholesale Price: ₹60-70
GST (5%): ₹3-3.50
Invoice Total: ₹63-73.50
Bulk Benefit: Lower per-unit cost
```

### DISTRIBUTOR Purchases
```
Medicine Cost: ₹50
Distributor Discount: 40-50%
Distributor Price: ₹50-60
GST (5%): ₹2.50-3
Invoice Total: ₹52.50-63
Bulk Benefit: Lowest per-unit cost
Supply Benefit: Direct from manufacturer
```

---

## 📊 Ledger Tracking

### INDIVIDUAL
```
❌ No ledger tracking
→ Each transaction is independent
→ No credit extended
→ Always paid in cash
```

### RETAILER
```
✅ Optional ledger tracking (if credit enabled)
→ If credit: Track balance
→ If cash: No tracking needed
→ Typical: Most retailers pay immediately
```

### WHOLESALER
```
✅ Full ledger tracking
→ Running balance maintained
→ Credit limit enforced
→ Payment terms tracked (15-45 days)
→ Outstanding balance visible
→ Payment receipts recorded
```

### DISTRIBUTOR
```
✅ Full ledger tracking + supply tracking
→ Running balance maintained
→ Credit limit enforced
→ Payment terms tracked (30-45 days)
→ Outstanding balance visible
→ Payment receipts recorded
→ Supply history tracked
→ Return/credit memo support
```

---

## 🏢 Business Classification

```
B2C (Business to Consumer):
├── Individual ..................... Walk-in customer
└── Retailer (when selling to end-users)

B2B (Business to Business):
├── Retailer (when buying from supplier)
├── Wholesaler ..................... Bulk distributor
└── Distributor .................... Manufacturer distributor

Hierarchy:
Manufacturer
    ↓
Distributor ← Direct from manufacturer
    ↓
Wholesaler ← From distributor/manufacturer
    ↓
Retailer ← From wholesaler/distributor
    ↓
Individual ← From retailer
```

---

## 🎯 Quick Decision Tree

```
START: Customer wants to buy medicine

   "Who is this customer?"
           ↓
    ┌──────┴──────┬──────────┬──────────┐
    ↓             ↓          ↓          ↓
  Walk-in      Shop/Store  Wholesaler Distributor
    ↓             ↓          ↓          ↓
INDIVIDUAL    RETAILER  WHOLESALER  DISTRIBUTOR
    ↓             ↓          ↓          ↓
  Simple      Business   Bulk+Credit  Bulk+FSSAI
  Receipt      Invoice    Terms        Required
```

---

## 📱 Creating Each Customer Type

### Creating INDIVIDUAL
1. Admin → Customers → Add Customer
2. Select: Individual (radio button)
3. Enter: Name, Phone (optional)
4. Save ✅

### Creating RETAILER
1. Admin → Customers → Add Customer
2. Select: Retailer (radio button)
3. Enter: Business Name, Contact Person
4. Enter: GSTIN, Drug License
5. Optional: FSSAI, Opening Balance, Address
6. Save ✅

### Creating WHOLESALER
1. Admin → Customers → Add Customer
2. Select: Wholesaler (radio button)
3. Enter: Business Name, Contact Person
4. Enter: GSTIN, Drug License
5. Enter: FSSAI (optional)
6. Enter: Credit Limit, Opening Balance
7. Optional: Address, Phone
8. Save ✅

### Creating DISTRIBUTOR
1. Admin → Customers → Add Customer
2. Select: Distributor (radio button)
3. Enter: Business Name, Contact Person
4. Enter: GSTIN, Drug License
5. **Enter: FSSAI (REQUIRED)** ← Important!
6. Enter: Credit Limit, Opening Balance
7. Optional: Address, Phone
8. Save ✅

---

## ✅ Validation Rules

### INDIVIDUAL
```
✓ Name is required
✓ Phone is optional but recommended
✓ Address is optional
✓ No GST/license needed
✓ Status: Active/Inactive
```

### RETAILER
```
✓ Business Name is required
✓ Contact Person is required
✓ GSTIN is required (format: 2 digits state + 7-digit alphanumeric)
✓ Drug License is required
✓ Phone recommended
✓ FSSAI is optional
✓ Opening Balance numeric
✓ Status: Active/Inactive
```

### WHOLESALER
```
✓ Business Name is required
✓ Contact Person is required
✓ GSTIN is required
✓ Drug License is required
✓ FSSAI is optional
✓ Credit Limit numeric (optional)
✓ Opening Balance numeric (optional)
✓ Phone recommended
✓ Status: Active/Inactive
```

### DISTRIBUTOR
```
✓ Business Name is required
✓ Contact Person is required
✓ GSTIN is required
✓ Drug License is required
✓ FSSAI is REQUIRED ← Mandatory!
✓ Credit Limit numeric (optional but recommended)
✓ Opening Balance numeric (optional)
✓ Phone recommended
✓ Status: Active/Inactive
⚠️ Will not save without FSSAI
```

---

## 🔍 Finding Customers by Type

### In Admin Interface
```
Admin → Customers
├── View All
├── Filter by Type:
│   ├── Individuals
│   ├── Retailers
│   ├── Wholesalers
│   └── Distributors
└── Export List
```

### In POS
```
POS Page
├── Select Sale Type: Retail
│   → Shows: Individuals, Retailers
├── Select Sale Type: Wholesale
│   → Shows: Wholesalers, Distributors
└── Auto-filtered by selection
```

---

## 📈 Reports by Type

### INDIVIDUAL Report
```
- Total walk-in sales
- Average transaction value
- Peak hours
- Popular medicines
- No credit tracking
```

### RETAILER Report
```
- Total retail sales
- Credit vs Cash sales
- Outstanding balance
- Payment history
- Top products bought
```

### WHOLESALER Report
```
- Bulk purchase trends
- Credit limit vs actual
- Payment compliance
- Average order value
- Supply frequency
```

### DISTRIBUTOR Report
```
- Bulk distribution volume
- Credit limit utilization
- Payment compliance
- Supply chain analysis
- Return/credit history
- Manufacturer comparison
```

---

## ⚠️ Common Mistakes to Avoid

### ❌ Creating Individual with FSSAI
```
Wrong: Individual customer doesn't need licenses
✓ Right: Only add name and phone
```

### ❌ Creating Retailer without Drug License
```
Wrong: Drug License is required for retailers
✓ Right: Always enter Drug License + GSTIN
```

### ❌ Creating Distributor without FSSAI
```
Wrong: Distributors MUST have FSSAI
✗ Will not save without FSSAI!
✓ Right: Always enter FSSAI for distributors
```

### ❌ Wrong Sale Type
```
Wrong: Selecting Retail for Distributor
✓ Right: Select Wholesale for Distributor
```

### ❌ Incorrect Customer Type
```
Wrong: Treating Retailer as Wholesaler
✓ Right: Check customer type before processing
```

---

## 🎓 Training Examples

### Example 1: Patient Buys Medicine
```
Customer: Mr. Ramesh (walk-in)
Type: INDIVIDUAL
Fields: Name: "Ramesh", Phone: "9876543210"
Sale: 1x Aspirin @₹20
Total: ₹20 (cash)
Invoice: Simple receipt
Result: One-off transaction ✓
```

### Example 2: Retail Pharmacy Buys Stock
```
Customer: Green Pharmacy, Mumbai
Type: RETAILER
Fields:
  - Business Name: "Green Pharmacy"
  - Contact Person: "Rajesh Kumar"
  - GSTIN: "27ABCDE1234F1Z5"
  - Drug License: "DL-123456-WB"
  - FSSAI: "10001234000001"
Sale: 100x Amoxicillin @₹45
Total: ₹4,500 + GST ₹225 = ₹4,725
Invoice: Business invoice
Result: Ledger entry created ✓
```

### Example 3: Wholesaler Purchases Bulk
```
Customer: Mumbai Wholesale Distributors
Type: WHOLESALER
Fields:
  - Business Name: "Mumbai Wholesale Distributors"
  - Contact Person: "Arjun Patel"
  - GSTIN: "27ABCDE5678F1Z5"
  - Drug License: "DL-654321-MH"
  - FSSAI: "10001234000002"
  - Credit Limit: ₹500,000
  - Opening Balance: ₹100,000
Sale: 500x Amoxicillin @₹35
Total: ₹17,500 + GST ₹875 = ₹18,375
Terms: 30 days credit
Invoice: Tax invoice
Result: Ledger tracked, balance updated ✓
```

### Example 4: Distributor (Manufacturer Direct)
```
Customer: ABC Pharma Distributors (PCD Agent)
Type: DISTRIBUTOR
Fields:
  - Business Name: "ABC Pharma Distributors"
  - Contact Person: "Suresh Singh"
  - GSTIN: "27ABCDE9999F1Z5"
  - Drug License: "DL-999999-DL"
  - FSSAI: "10001234000003" ← MANDATORY
  - Credit Limit: ₹1,000,000
  - Opening Balance: ₹250,000
Sale: 1000x Amoxicillin @₹30
Total: ₹30,000 + GST ₹1,500 = ₹31,500
Terms: 45 days credit
Invoice: Tax invoice
Result: Supply tracking, ledger updated ✓
```

---

## 📞 Quick Reference Contacts

For questions about:
- **GSTIN Format:** Contact tax department or accountant
- **Drug License:** Contact pharmacy regulatory board
- **FSSAI License:** Contact food safety authority
- **Customer Classification:** Consult business advisor

---

## ✨ Summary

| Aspect | Individual | Retailer | Wholesaler | Distributor |
|--------|-----------|----------|-----------|------------|
| **Use** | Walk-in | Retail shop | Bulk buyer | Manufacturer |
| **Payment** | Cash | Cash/Credit | Credit | Credit |
| **Ledger** | No | Optional | Yes | Yes |
| **Invoice** | Receipt | Business | Tax | Tax |
| **GST** | No | Yes | Yes | Yes |
| **GSTIN** | No | Yes | Yes | Yes |
| **Drug Lic** | No | Yes | Yes | Yes |
| **FSSAI** | No | Optional | Optional | **Required** |
| **Credit Limit** | No | Optional | Yes | Yes |
| **Price Tier** | Retail | Retail | Wholesale | Lowest |

---

**This guide covers all 4 customer types with complete field requirements, workflows, and examples.**

**Ready to use! 🚀**

