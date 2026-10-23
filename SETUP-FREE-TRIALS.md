# Free Trials Setup Instructions

## Prerequisites
- Access to Supabase SQL Editor
- Admin role in the database

## Database Setup

### Step 1: Run the SQL Script
Execute the `create-free-trials-table.sql` file in your Supabase SQL Editor.

This will:
1. Create the `free_trials` table with all required columns
2. Enable Row Level Security (RLS)
3. Create RLS policies for unauthenticated INSERT and admin SELECT/UPDATE
4. Create indexes for optimal query performance

### Step 2: Verify Table Creation
Run this query to verify the table was created successfully:

```sql
SELECT * FROM free_trials LIMIT 1;
```

### Step 3: Verify RLS Policies
Run this query to check the RLS policies:

```sql
SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'free_trials';
```

## Application Integration

### Frontend Deployment
1. The FreeTrialPage component automatically saves registrations to the database
2. The admin Free Trials page will display all registrations
3. No additional frontend configuration needed

### Admin Access
- Free Trials admin page is only accessible to users with admin role
- Route: `/admin/free-trials`
- Menu: Click "Free Trials" in the Admin panel sidebar

## Features Now Available

### For New Pharmacy Users
- 4-step registration process
- Plan selection with pricing display
- Automatic data storage in database
- Success notification on completion

### For Admins
- View all free trial registrations
- Search by pharmacy name, owner, email, phone
- Filter by plan type and status
- Sort by any column
- View detailed information
- Export to CSV
- Delete records

## Plan Information

The system supports three plans:

1. **Basic Plan** - ₹5,900 (₹5,000 + 18% GST)
   - 5 Users
   - 1 Branch
   - Basic Inventory Management

2. **Professional Plan** - ₹23,600 (₹20,000 + 18% GST)
   - 5 Users
   - 5 Branches
   - Unlimited Products
   - Advanced Reporting

3. **Gold Edition** - ₹41,300 (₹35,000 + 18% GST)
   - Unlimited Users
   - Unlimited Branches
   - Unlimited Products
   - Premium Support

## Database Schema

```
free_trials
├── id (UUID, PK)
├── pharmacy_name (TEXT)
├── drug_license_number (TEXT)
├── owner_name (TEXT)
├── email (TEXT)
├── phone_number (TEXT)
├── address (TEXT)
├── city (TEXT)
├── state (TEXT)
├── pincode (TEXT)
├── selected_plan (TEXT)
├── status (TEXT, default: 'active')
└── created_at (TIMESTAMP, default: now())

Indexes:
- idx_free_trials_email
- idx_free_trials_pharmacy_name
- idx_free_trials_created_at
- idx_free_trials_selected_plan
- idx_free_trials_status
```

## RLS Policies

### INSERT Policy
- Allows unauthenticated users to insert their registration data
- No authentication required

### SELECT Policy
- Only authenticated admin users can view registrations
- Uses auth.users.role = 'admin' check

### UPDATE Policy
- Only authenticated admin users can update registrations
- Uses auth.users.role = 'admin' check

## Testing

### Test Registration
1. Navigate to `/free-trial`
2. Fill out all 4 steps
3. Click "Register"
4. Should see success message and redirect to login

### Test Admin Panel
1. Login as admin user
2. Navigate to `/admin/free-trials`
3. Should see the registration you just created
4. Test search, filter, and export features

## Troubleshooting

### Issue: "Failed to load free trials" in admin panel
- **Solution**: Check that you're logged in as admin user
- Verify RLS policies are correctly configured
- Check browser console for error messages

### Issue: Registration not saving
- **Solution**: Verify the Supabase connection in `.env`
- Check that the table exists in Supabase
- Verify RLS policies allow INSERT without authentication

### Issue: Can't see registrations in admin panel
- **Solution**: Verify you're logged in as admin user
- Check that RLS SELECT policy requires admin role
- Refresh the page

### Issue: CSV export shows incorrect data
- **Solution**: Verify that all trials were selected in the table
- Check that filters are not hiding data
- Try exporting all data without filters

## Monitoring

### Recommended Metrics to Track
- Total registrations per month
- Registrations by plan type
- New registrations today
- Active registrations
- Plan distribution (Basic vs Professional vs Gold)

### Sample Monitoring Query
```sql
SELECT 
  selected_plan,
  COUNT(*) as count,
  DATE_TRUNC('month', created_at) as month
FROM free_trials
GROUP BY selected_plan, DATE_TRUNC('month', created_at)
ORDER BY month DESC, selected_plan;
```

## Maintenance

### Regular Tasks
- Monitor total registrations
- Review registration trends
- Archive old registrations if needed
- Check for duplicate entries
- Verify database performance

### Backup
- Ensure Supabase backups are enabled
- Export data regularly using the CSV export feature
- Keep records of important registrations

## Future Enhancements

1. **Email Notifications**
   - Send welcome email to registered pharmacies
   - Send admin notification on new registration

2. **Trial Period Management**
   - Set trial duration (e.g., 30 days)
   - Automatic expiration tracking
   - Renewal reminders

3. **Plan Upgrades**
   - Allow users to upgrade plans
   - Track plan changes
   - Generate reports on upgrades

4. **Integration**
   - Auto-create user accounts
   - Pre-populate data in other systems
   - Generate API keys

5. **Analytics**
   - Plan popularity metrics
   - Conversion rates
   - Geographic distribution
   - Registration source tracking
