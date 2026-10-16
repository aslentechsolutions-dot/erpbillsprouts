# Quick Setup Instructions

## ⚡ 5-Minute Setup Guide

### Step 1: Run Database Migrations (REQUIRED)

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Copy and paste the entire content of `migration-customer-orders.sql`
5. Click **Run**
6. Wait for "Success" message
7. Copy and paste the entire content of `migration-erp-inquiries.sql`
8. Click **Run**
9. Wait for "Success" message

✅ Database is now ready!

### Step 2: Configure Razorpay (REQUIRED for online payments)

1. Open `.env` file in the project root
2. Add these lines (or update if they exist):

```env
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
VITE_RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxx
```

**Get your Razorpay keys:**
- Go to: https://dashboard.razorpay.com/app/keys
- Use **Test Mode** keys for testing
- Use **Live Mode** keys for production

### Step 3: Restart Development Server

```bash
npm run dev
```

## ✅ Quick Test

### Test Customer Portal (5 minutes)

1. **Navigate to:** http://localhost:5173/login
2. **Click:** "Register for online shopping"
3. **Register with:**
   - Name: Test Customer
   - Email: customer@test.com
   - Phone: 9876543210
   - Password: test123
   - Address: Test Address, Test City
4. **Should redirect to:** Medicine Store
5. **Add a medicine to cart**
6. **Go to cart** (click cart icon in header)
7. **Click:** "Proceed to Checkout"
8. **Fill delivery address** and click "Place Order" (select COD)
9. **Should see:** Order confirmation page

✅ Customer portal works!

### Test Admin Features (3 minutes)

1. **Logout** (if logged in as customer)
2. **Login as admin:**
   - Email: admin@pharmacy.com
   - Password: admin123
3. **Check new menu items:**
   - Click "Customer Orders" - should see the test order
   - Click "ERP Inquiries" - should be empty (submit one from customer footer)
4. **Click on the order to expand it**
5. **Update status to "Confirmed"**
6. **Add some admin notes**

✅ Admin features work!

### Test ERP Inquiry (2 minutes)

1. **Logout and login as customer** (or stay logged in)
2. **Scroll to footer** on any customer page
3. **Click:** "Purchase ERP Software" button
4. **Fill the form** with test data
5. **Click:** "Submit Inquiry"
6. **Should see:** Success message
7. **Login as admin**
8. **Click:** "ERP Inquiries" in sidebar
9. **Should see:** Your test inquiry

✅ ERP Inquiry system works!

## 🔍 Verify Existing Features (2 minutes)

1. **Login as admin**
2. **Click each menu item:**
   - Dashboard ✓
   - POS ✓
   - Medicines ✓
   - Inventory ✓
   - Sales ✓
   - Purchases ✓
   - Customers ✓

✅ All existing features still work!

## 🎉 You're Done!

Total setup time: ~10 minutes

All three requirements are now live:
1. ✅ Customer registration & medicine shopping
2. ✅ ERP inquiry system
3. ✅ Dual payment methods (COD + Razorpay)

## 🐛 Troubleshooting

### Issue: "Table does not exist" error
**Solution:** Run the migration files in Supabase SQL Editor

### Issue: Razorpay payment modal doesn't open
**Solution:** Check that VITE_RAZORPAY_KEY_ID is set in .env and restart dev server

### Issue: Customer can't see their orders
**Solution:** Check RLS policies are enabled in Supabase

### Issue: Registration fails
**Solution:** Check that customers table exists and has proper structure

## 📞 Need Help?

- Check `IMPLEMENTATION_COMPLETE.md` for detailed documentation
- Email: support@billsprout.online
- Phone: +44 7747 571513

---

**Ready to go live?** Follow the deployment section in IMPLEMENTATION_COMPLETE.md
