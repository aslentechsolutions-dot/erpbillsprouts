import React from 'react'

// Helper function to convert number to words (Indian format)
const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']

  if (num === 0) return 'Zero'

  const crore = Math.floor(num / 10000000)
  const lakh = Math.floor((num % 10000000) / 100000)
  const thousand = Math.floor((num % 100000) / 1000)
  const hundred = Math.floor((num % 1000) / 100)
  const remainder = num % 100

  let words = ''

  if (crore > 0) words += ones[crore] + ' Crore '
  if (lakh > 0) words += (lakh < 20 ? teens[lakh - 10] || ones[lakh] : tens[Math.floor(lakh / 10)] + ' ' + ones[lakh % 10]) + ' Lakh '
  if (thousand > 0) words += (thousand < 20 ? teens[thousand - 10] || ones[thousand] : tens[Math.floor(thousand / 10)] + ' ' + ones[thousand % 10]) + ' Thousand '
  if (hundred > 0) words += ones[hundred] + ' Hundred '
  if (remainder > 0) {
    if (remainder < 10) words += ones[remainder]
    else if (remainder < 20) words += teens[remainder - 10]
    else words += tens[Math.floor(remainder / 10)] + ' ' + ones[remainder % 10]
  }

  return words.trim()
}

const amountToWords = (amount) => {
  const rupees = Math.floor(amount)
  const paise = Math.round((amount - rupees) * 100)
  
  let words = 'Rupees ' + numberToWords(rupees)
  if (paise > 0) words += ' and ' + numberToWords(paise) + ' Paise'
  words += ' Only'
  
  return words
}

const CompactRetailInvoice = ({ 
  sale, 
  items, 
  customer, 
  companyDetails,
  pageWidth = '90mm',
  pageHeight = '297mm'
}) => {
  // Calculate totals
  const calculateTotals = () => {
    let totalQty = 0
    let totalFree = 0
    let subtotal = 0
    let totalDiscount = 0
    let cgst = 0
    let sgst = 0
    let igst = 0
    
    const taxSummary = {}

    items.forEach(item => {
      totalQty += item.quantity
      totalFree += item.freeQuantity || 0
      
      const itemTotal = item.quantity * item.price
      const discountAmt = (itemTotal * (item.discount || 0)) / 100
      const taxableAmount = itemTotal - discountAmt
      
      subtotal += itemTotal
      totalDiscount += discountAmt
      
      const gstRate = item.medicine.gst_percentage || 0
      const gstAmount = (taxableAmount * gstRate) / 100
      
      // For intra-state: split into CGST and SGST
      const cgstAmount = gstAmount / 2
      const sgstAmount = gstAmount / 2
      
      cgst += cgstAmount
      sgst += sgstAmount
      
      // Group by GST rate for summary
      if (!taxSummary[gstRate]) {
        taxSummary[gstRate] = { taxable: 0, cgst: 0, sgst: 0 }
      }
      taxSummary[gstRate].taxable += taxableAmount
      taxSummary[gstRate].cgst += cgstAmount
      taxSummary[gstRate].sgst += sgstAmount
    })

    const taxableValue = subtotal - totalDiscount
    const totalTax = cgst + sgst + igst
    const grandTotal = taxableValue + totalTax
    const roundOff = Math.round(grandTotal) - grandTotal
    const netPayable = Math.round(grandTotal)

    return {
      totalQty,
      totalFree,
      subtotal,
      totalDiscount,
      taxableValue,
      cgst,
      sgst,
      igst,
      totalTax,
      grandTotal,
      roundOff,
      netPayable,
      taxSummary
    }
  }

  const totals = calculateTotals()
  const isWholesale = sale.sale_type === 'wholesale'
  const invoiceDate = new Date(sale.created_at)

  return (
    <div className="compact-retail-invoice">
      <style>{`
        @page {
          size: ${pageWidth} ${pageHeight};
          margin: 3mm;
        }

        .compact-retail-invoice {
          font-family: 'Courier New', monospace;
          background: white;
          color: black;
          width: ${pageWidth};
          padding: 3mm;
          font-size: 7px;
          line-height: 1.15;
        }

        .compact-retail-invoice * {
          margin: 0;
          padding: 0;
        }

        .header {
          text-align: center;
          border-bottom: 1px solid #000;
          padding-bottom: 2mm;
          margin-bottom: 2mm;
        }

        .company-name {
          font-size: 9px;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 1px;
          letter-spacing: -0.5px;
        }

        .company-info {
          font-size: 6px;
          line-height: 1.2;
        }

        .invoice-title {
          font-size: 8px;
          font-weight: bold;
          text-align: center;
          margin: 2mm 0 1mm;
          text-decoration: underline;
        }

        .invoice-meta {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.5mm;
          margin-bottom: 1.5mm;
          font-size: 6.5px;
          border-bottom: 1px solid #000;
          padding-bottom: 1.5mm;
        }

        .meta-item {
          display: flex;
          gap: 1mm;
          justify-content: space-between;
        }

        .meta-label {
          font-weight: bold;
        }

        .customer-info {
          border-top: 1px solid #000;
          border-bottom: 1px solid #000;
          padding: 1.5mm 0;
          margin: 1.5mm 0;
          font-size: 6.5px;
          line-height: 1.15;
        }

        .info-row {
          display: flex;
          margin-bottom: 0.5mm;
          gap: 1mm;
        }

        .info-label {
          width: 35%;
          font-weight: bold;
          flex-shrink: 0;
        }

        .info-value {
          width: 65%;
          word-wrap: break-word;
          word-break: break-word;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5mm 0;
          font-size: 6px;
          border: 1px solid #000;
        }

        .items-table th {
          border: 1px solid #000;
          padding: 1mm 0.5mm;
          text-align: center;
          font-weight: bold;
          font-size: 6px;
          background-color: #f0f0f0;
          line-height: 1.0;
          word-break: break-word;
        }

        .items-table td {
          padding: 1mm 0.5mm;
          border: 1px solid #000;
          vertical-align: top;
          font-size: 6px;
          line-height: 1.15;
        }

        .items-table .text-right {
          text-align: right;
        }

        .items-table .text-center {
          text-align: center;
        }

        .medicine-name {
          font-weight: bold;
          font-size: 6px;
          word-break: break-word;
        }

        .tax-summary {
          border: 1px solid #000;
          padding: 1.5mm;
          margin: 1.5mm 0;
          font-size: 6.5px;
          line-height: 1.15;
        }

        .tax-summary-row {
          display: block;
          padding: 0.5mm 0;
          font-size: 6px;
          word-wrap: break-word;
        }

        .totals-section {
          border: 1px solid #000;
          padding: 1.5mm;
          margin: 1.5mm 0;
          font-size: 6.5px;
          line-height: 1.15;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5mm 0;
          font-size: 6.5px;
          gap: 1mm;
        }

        .total-row.grand {
          font-size: 8px;
          font-weight: bold;
          border-top: 1px solid #000;
          border-bottom: 2px solid #000;
          padding: 1mm 0;
          margin-top: 1mm;
        }

        .amount-words {
          margin: 1.5mm 0;
          font-size: 6px;
          text-align: center;
          line-height: 1.15;
          border: 1px solid #000;
          padding: 1.5mm;
          word-wrap: break-word;
        }

        .footer {
          border-top: 1px solid #000;
          padding-top: 1.5mm;
          margin-top: 1.5mm;
          text-align: center;
          font-size: 6px;
          line-height: 1.15;
        }

        @media print {
          .compact-retail-invoice {
            margin: 0;
            padding: 3mm;
            width: 100%;
          }

          @page {
            margin: 3mm;
            size: ${pageWidth} ${pageHeight};
          }
        }
      `}</style>

      {/* Header */}
      <div className="header">
        <div className="company-name">{companyDetails.name || 'LIFESPROUTS CARE'}</div>
        <div className="company-info">
          {companyDetails.address || '2-190/6 Peikaji Nagar Asifabad'}<br/>
          {companyDetails.city || 'TELANGANA-504203'}<br/>
          GSTIN: {companyDetails.gstin || '36CTUPD3541E1ZO'} | D.L NO: {companyDetails.drug_license || '(20B&21B)TG/AS/2025-139054'}<br/>
          Phone: {companyDetails.phone || '9666105832'} | Email: {companyDetails.email || 'vedithapharma@gmail.com'}
        </div>
      </div>

      {/* Invoice Title */}
      <div className="invoice-title">{isWholesale ? 'TAX INVOICE' : 'GST INVOICE'}</div>

      {/* Invoice Metadata */}
      <div className="invoice-meta">
        <div className="meta-item">
          <span className="meta-label">Invoice No:</span>
          <span>{sale.invoice_number}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Date:</span>
          <span>{invoiceDate.toLocaleDateString('en-GB')}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Time:</span>
          <span>{invoiceDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Payment:</span>
          <span>{sale.payment_method.toUpperCase()}</span>
        </div>
      </div>

      {/* Customer Information */}
      <div className="customer-info">
        {isWholesale ? (
          <>
            <div className="info-row">
              <div className="info-label">M/S:</div>
              <div className="info-value">{customer?.business_name || 'Walk-in Customer'}</div>
            </div>
            {customer?.address && (
              <div className="info-row">
                <div className="info-label">Address:</div>
                <div className="info-value">{customer.address}</div>
              </div>
            )}
            {customer?.gstin && (
              <div className="info-row">
                <div className="info-label">GSTIN:</div>
                <div className="info-value">{customer.gstin}</div>
              </div>
            )}
            {customer?.drug_license_number && (
              <div className="info-row">
                <div className="info-label">D.L:</div>
                <div className="info-value">{customer.drug_license_number}</div>
              </div>
            )}
            {customer?.phone && (
              <div className="info-row">
                <div className="info-label">Phone:</div>
                <div className="info-value">{customer.phone}</div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="info-row">
              <div className="info-label">Customer:</div>
              <div className="info-value">{customer?.name || customer?.business_name || 'Walk-in Customer'}</div>
            </div>
          </>
        )}
      </div>

      {/* Items Table - Full columns */}
      <table className="items-table">
        <thead>
          <tr>
            <th style={{width: '20px'}}>S.N.</th>
            <th style={{width: '45px'}}>Item Name</th>
            <th style={{width: '30px'}}>Mfr</th>
            <th style={{width: '30px'}}>HSN</th>
            <th style={{width: '25px'}}>Pack</th>
            <th style={{width: '20px'}}>Qty</th>
            <th style={{width: '20px'}}>Free</th>
            <th style={{width: '35px'}}>Batch</th>
            <th style={{width: '25px'}}>Exp</th>
            <th style={{width: '30px'}}>M.R.P</th>
            <th style={{width: '30px'}}>Rate</th>
            <th style={{width: '20px'}}>Dis%</th>
            <th style={{width: '20px'}}>SGST</th>
            <th style={{width: '20px'}}>CGST</th>
            <th style={{width: '35px'}}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const itemTotal = item.quantity * item.price
            const discountAmt = (itemTotal * (item.discount || 0)) / 100
            const taxableAmount = itemTotal - discountAmt
            const gstRate = item.medicine.gst_percentage || 0
            const gstAmount = (taxableAmount * gstRate) / 100
            const sgstAmount = gstAmount / 2
            const cgstAmount = gstAmount / 2
            const totalWithGst = taxableAmount + gstAmount
            
            return (
              <tr key={index}>
                <td className="text-center">{index + 1}</td>
                <td>
                  <div className="medicine-name">{item.medicine.name}</div>
                </td>
                <td className="text-center" style={{fontSize: '6.5px'}}>{item.medicine.manufacturer?.substring(0, 6) || 'N/A'}</td>
                <td className="text-center">{item.medicine.hsn_code || '3004'}</td>
                <td className="text-center">{item.medicine.pack_size || '10'}</td>
                <td className="text-center">{item.quantity}</td>
                <td className="text-center">{item.freeQuantity || 0}</td>
                <td className="text-center">{item.batch.batch_number}</td>
                <td className="text-center">
                  {new Date(item.batch.expiry_date).toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' })}
                </td>
                <td className="text-right">{(item.batch.mrp || item.price).toFixed(2)}</td>
                <td className="text-right">{item.price.toFixed(2)}</td>
                <td className="text-center">{(item.discount || 0).toFixed(1)}</td>
                <td className="text-center" style={{fontSize: '6.5px'}}>{(gstRate / 2).toFixed(1)}</td>
                <td className="text-center" style={{fontSize: '6.5px'}}>{(gstRate / 2).toFixed(1)}</td>
                <td className="text-right"><strong>{totalWithGst.toFixed(2)}</strong></td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Tax Summary */}
      <div className="tax-summary">
        <strong>Tax Summary:</strong>
        {Object.entries(totals.taxSummary).map(([rate, data]) => (
          <div key={rate} className="tax-summary-row">
            <span>GST {rate}%:</span>
            <span>Taxable: ₹{data.taxable.toFixed(2)}</span>
            <span>CGST: ₹{data.cgst.toFixed(2)}</span>
            <span>SGST: ₹{data.sgst.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Totals Section */}
      <div className="totals-section">
        <div className="total-row">
          <span>Total Qty: {totals.totalQty}</span>
          <span>Total Free: {totals.totalFree}</span>
          <span>Subtotal: ₹{totals.subtotal.toFixed(2)}</span>
          <span>Total Discount: ₹{totals.totalDiscount.toFixed(2)}</span>
        </div>
        <div className="total-row">
          <span>Taxable Value: ₹{totals.taxableValue.toFixed(2)}</span>
          <span>Total CGST: ₹{totals.cgst.toFixed(2)}</span>
          <span>Total SGST: ₹{totals.sgst.toFixed(2)}</span>
          {totals.igst > 0 && <span>Total IGST: ₹{totals.igst.toFixed(2)}</span>}
        </div>
        <div className="total-row">
          <span>Round Off: ₹{totals.roundOff.toFixed(2)}</span>
        </div>
        <div className="total-row grand">
          <span>NET PAYABLE:</span>
          <span>₹{totals.netPayable.toFixed(2)}</span>
        </div>
      </div>

      {/* Amount in Words */}
      <div className="amount-words">
        <strong>Amount in Words:</strong><br/>
        {amountToWords(totals.netPayable)}
      </div>

      {/* Footer */}
      <div className="footer">
        <div>** Goods once sold are not returnable **</div>
        <div>This is a computer-generated invoice</div>
        <div>Thank you for your business!</div>
      </div>
    </div>
  )
}

export default CompactRetailInvoice
