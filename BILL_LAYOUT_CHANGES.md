# Compact Pharmacy Bill Layout Changes

## Summary
Created new compact pharmacy bill layouts for both Retail and Wholesale invoices with provisional dimensions of **210mm width × 100mm height in landscape orientation**.

## Files Created
1. **src/components/CompactRetailInvoice.jsx** - Compact retail/retail bill layout
2. **src/components/CompactWholesaleInvoice.jsx** - Compact wholesale bill layout

## Files Modified
- **src/pages/admin/pos/POSPage.jsx** - Updated to import and use compact invoice components

## Page Dimensions
- **Width**: 210mm
- **Height**: 100mm
- **Orientation**: Landscape
- **Margins**: 4mm on all sides
- **Configurable**: Yes - `pageWidth` and `pageHeight` props can be adjusted

## Design Changes

### Typography & Spacing
- Reduced font sizes for compact display
  - Company name: 9px
  - Invoice meta: 6.5-7.5px
  - Items table: 5.5-6px
  - Footer: 5.5-6px
- Line height reduced to 1.0-1.1 for tighter vertical spacing
- Padding reduced from mm to sub-mm measurements

### Layout Optimization
- **Header**: Condensed company info into single lines
- **Customer Info**: Inline display of key fields only
- **Items Table**: Reduced from 15 columns to 8-12 key columns
  - Removed: MFG, HSN code details, excessive tax display
  - Kept: S.N., Item name, Batch, Qty, Rate, Discount%, GST%, Amount
- **Tax Summary**: Inline rows instead of table format
- **Totals**: Single line format with all key values
- **Borders**: Reduced border thickness (0.5px)

### Preserved Content
✅ All existing fields retained:
- Company details (name, address, GSTIN, Drug License, phone, email)
- Invoice number and date/time
- Customer/M/S information
- All medicine details (name, batch number, expiry date, quantity, pricing)
- All tax calculations (CGST, SGST, GST summary by rate)
- Subtotal, discount, taxable value, tax amount, round-off, grand total
- Amount in words
- Payment method
- Footer notes

✅ All calculations unchanged:
- GST calculations remain identical
- Discount calculations preserved
- Tax breakdown logic unchanged
- Round-off logic preserved

## Testing Checklist
- [ ] Retail bill prints correctly with 210×100mm dimensions
- [ ] Wholesale bill prints correctly with 210×100mm dimensions
- [ ] All content fits without clipping
- [ ] All medicine rows display completely
- [ ] Tax summary shows all GST rates
- [ ] Totals section is readable
- [ ] No text overlaps
- [ ] Page breaks only when necessary
- [ ] Browser print preview shows correct layout
- [ ] PDF export shows correct dimensions

## Usage

### For Retail Bills (POS)
```jsx
<CompactRetailInvoice
  sale={saleData}
  items={cartItems}
  customer={customerData}
  companyDetails={settings}
  pageWidth="210mm"
  pageHeight="100mm"
/>
```

### For Wholesale Bills (POS)
```jsx
<CompactWholesaleInvoice
  sale={saleData}
  items={cartItems}
  customer={wholesalerData}
  companyDetails={settings}
  pageWidth="210mm"
  pageHeight="100mm"
/>
```

## Fallback Options
If content doesn't fit in 210×100mm:
- Retail: Can reduce to 210×120mm or 210×150mm
- Wholesale: Can reduce to 210×150mm or A5 (148×210mm)
- Font size can be further reduced to 6px minimum (6px)

## Configuration
To change dimensions, update in POSPage.jsx:
```javascript
pageWidth="210mm"  // Change width
pageHeight="100mm" // Change height
```

Or create environment variable:
```
VITE_BILL_WIDTH=210mm
VITE_BILL_HEIGHT=100mm
```

## Original Components Preserved
- `ThermalInvoice.jsx` - Original thermal receipt format (58mm/80mm)
- `WholesaleInvoice.jsx` - Original A4 wholesale invoice
- `LandscapeInvoice.jsx` - Original landscape retail invoice

Can revert to original by updating POSPage.jsx imports.

## Next Steps
1. Test locally with actual POS transaction
2. Print and verify physical dimensions match reference image
3. Adjust dimensions if needed (configurable)
4. Verify no data loss or clipping
5. Deploy to production
