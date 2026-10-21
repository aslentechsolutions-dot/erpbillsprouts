# DEBUG: Customer Pages Blank Issue

## Test in Browser Console

Open browser console (F12) and run these tests:

### Test 1: Check if pages are rendering
```javascript
console.log('Current path:', window.location.pathname)
console.log('Body content length:', document.body.innerHTML.length)
console.log('Main content:', document.querySelector('main')?.innerHTML.substring(0, 200))
```

### Test 2: Check Supabase connection
```javascript
// Open console and type:
const { data, error } = await supabase.from('medicines').select('count')
console.log('Medicines count:', data, error)
```

### Test 3: Check RLS policies
```javascript
const { data: medicines, error } = await supabase
  .from('medicines')
  .select('*, medicine_batches(*)')
  .limit(1)
console.log('Medicine with batches:', medicines, error)
```

## Quick Fix Steps

### Step 1: Clear browser cache
1. Press Ctrl+Shift+Delete
2. Clear "Cached images and files"
3. Reload page

### Step 2: Check if medicines exist
Run in Supabase SQL Editor:
```sql
SELECT COUNT(*) FROM medicines WHERE status = 'active';
SELECT COUNT(*) FROM medicine_batches WHERE current_quantity > 0;
```

### Step 3: Check RLS policies
Run in Supabase SQL Editor:
```sql
-- Check if RLS is blocking reads
SELECT * FROM medicines LIMIT 1;
SELECT * FROM medicine_batches LIMIT 1;
```

##Expected Issues

1. **No medicines in database** - Pages will show empty state (not blank)
2. **RLS blocking queries** - Console will show 406/401 errors
3. **CSS hiding content** - Content exists in DOM but not visible
4. **Component not rendering** - Outlet not working properly

## Immediate Actions Needed

Tell me what you see:
1. Open /customer/store
2. Press F12
3. Go to Console tab
4. Look for RED errors
5. Tell me exact error messages
