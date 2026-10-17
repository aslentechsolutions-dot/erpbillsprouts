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
  pageWidth = '210mm',
  pageHeight = '100mm'
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
    <div className="compact-retail-invoice" style={{width: pageWidth, height: pageHeight}}>
      <style>{`
        .compact-retail-invoice {
          font-family: 'Courier New', monospace;
          background: white;
          color: black;
          padding: 4mm;
          font-size: 7.5px;
          line-height: 1.1;
          display: flex;
          flex-direction: column;
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
        }

        .company-info {
          font-size: 6.5px;
          line-height: 1.2;
        }

        .invoice-title {
          font-size: 8px;
          font-weight: bold;
          text-align: center;
          margin: 2mm 0;
        }

        .invoice-meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1mm;
          font-size: 7px;
        }

        .meta-item {
          flex: 1;
        }

        .customer-info {
          border-top: 1px solid #000;
          border-bottom: 1px solid #000;
          padding: 1mm 0;
          margin: 1mm 0;
          font-size: 6.5px;
          line-height: 1.1;
        }

        .info-row {
          display: flex;
          margin-bottom: 0.5mm;
        }

        .info-label {
          width: 25%;
          font-weight: bold;
        }

        .info-value {
          width: 75%;
          word-wrap: break-word;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 1mm 0;
          font-size: 6px;
          border: 0.5px solid #000;
        }

        .items-table th {
          border: 0.5px solid #000;
          padding: 1px;
          text-align: left;
          font-weight: bold;
          font-size: 6px;
          background-color: #f5f5f5;
          line-height: 1.0;
        }

        .items-table td {
          padding: 1px;
          border: 0.5px solid #000;
          vertical-align: top;
          font-size: 6px;
        }

        .items-table .text-right {
          text-align: right;
        }

        .items-table .text-center {
          text-align: center;
        }

        .medicine-name {
          font-weight: bold;
          font-size: 6.5px;
          word-wrap: break-word;
        }

        .tax-summary {
          border: 0.5px solid #000;
          padding: 1mm;
          margin: 1mm 0;
          font-size: 6px;
          line-height: 1.1;
        }

        .tax-summary-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5mm 0;
          font-size: 6px;
        }

        .totals-section {
          border: 0.5px solid #000;
          padding: 1mm;
          margin-top: 1mm;
          font-size: 6.5px;
          line-height: 1.1;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5mm 0;
          font-size: 6.5px;
        }

        .total-row.grand {
          font-size: 8px;
          font-weight: bold;
          border-top: 1px solid #000;
          border-bottom: 1px double #000;
          padding: 1mm 0;
          margin: 1mm 0;
        }

        .amount-words {
          margin: 1mm 0;
          font-size: 6px;
          text-align: center;
          line-height: 1.1;
        }

        .footer {
          border-top: 1px solid #000;
          padding-top: 1mm;
          margin-top: 1mm;
          text-align: center;
          font-size: 6px;
          line-height: 1.0;
        }

        @media print {
          .compact-retail-invoice {
            margin: 0;
            padding: 4mm;
            width: ${pageWidth};
            height: ${pageHeight};
          }

          @page {
            size: ${pageWidth} ${pageHeight} landscape;
            margin: 0;
          }
        }
      `}</style>

      {/* Header */}
      <div className="header">
        <div className="company-name">{companyDetails.name || 'LIFESPROUTS CARE'}</div>
        <div className="company-info">
          {companyDetails.address || '2-190/6 Peikaji Nagar'} | {companyDetails.city || 'ASIFABAD'} | GSTIN: {companyDetails.gstin || '36CTUPD3541E1ZO'}<br/>
          D.L: {companyDetails.drug_license || '(20B&21B)TG/AS/2025-139054'} | Ph: {companyDetails.phone || '9666105832'}
        </div>
      </div>

      {/* Invoice Title & Meta */}
      <div className="invoice-title">{isWholesale ? 'TAX INVOICE' : 'GST INVOICE'}</div>

      <div className="invoice-meta">
        <div className="meta-item"><strong>Invoice:</strong> {sale.invoice_number}</div>
        <div className="meta-item"><strong>Date:</strong> {invoiceDate.toLocaleDateString('en-GB')}</div>
        <div className="meta-item"><strong>Time:</strong> {invoiceDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
        <div className="meta-item"><strong>Payment:</strong> {sale.payment_method.toUpperCase()}</div>
      </div>

      {/* Customer Information */}
      <div className="customer-info">
        {isWholesale ? (
          <>
            <div className="info-row">
              <div className="info-label">M/S:</div>
              <div className="info-value">{customer?.business_name || 'Walk-in'}</div>
            </div>
            {customer?.gstin && (
              <div className="info-row">
                <div className="info-label">GSTIN:</div>
                <div className="info-value">{customer.gstin}</div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="info-row">
              <div className="info-label">Cust:</div>
              <div className="info-value">{customer?.name || customer?.business_name || 'Walk-in'}</div>
            </div>
          </>
        )}
      </div>

      {/* Items Table - Compressed */}
      <table className="items-table">
        <thead>
          <tr>
            <th style={{width: '15px'}}>S</th>
            <th>Item</th>
            <th style={{width: '25px'}}>Batch</th>
            <th style={{width: '20px'}}>Qty</th>
            <th style={{width: '25px'}}>Rate</th>
            <th style={{width: '20px'}}>Dis%</th>
            <th style={{width: '25px'}}>GST%</th>
            <th style={{width: '30px'}}>Amt</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const itemTotal = item.quantity * item.price
            const discountAmt = (itemTotal * (item.discount || 0)) / 100
            const taxableAmount = itemTotal - discountAmt
            const gstRate = item.medicine.gst_percentage || 0
            const gstAmount = (taxableAmount * gstRate) / 100
            const totalWithGst = taxableAmount + gstAmount
            
            return (
              <tr key={index}>
                <td className="text-center" style={{fontSize: '6px'}}>{index + 1}</td>
                <td>
                  <div className="medicine-name">{item.medicine.name}</div>
                  <div style={{fontSize: '5.5px'}}>Exp: {new Date(item.batch.expiry_date).toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' })}</div>
                </td>
                <td className="text-center" style={{fontSize: '6px'}}>{item.batch.batch_number}</td>
                <td className="text-center">{item.quantity}</td>
                <td className="text-right">{item.price.toFixed(2)}</td>
                <td className="text-center" style={{fontSize: '6px'}}>{(item.discount || 0).toFixed(0)}%</td>
                <td className="text-center" style={{fontSize: '6px'}}>{gstRate.toFixed(0)}%</td>
                <td className="text-right"><strong>{totalWithGst.toFixed(2)}</strong></td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Tax Summary - Inline */}
      <div className="tax-summary">
        <div><strong>Tax Summary:</strong></div>
        {Object.entries(totals.taxSummary).map(([rate, data]) => (
          <div key={rate} className="tax-summary-row">
            <span>GST {rate}%:</span>
            <span>Taxable: ₹{data.taxable.toFixed(2)} CGST: ₹{data.cgst.toFixed(2)} SGST: ₹{data.sgst.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Totals Section - Compact */}
      <div className="totals-section">
        <div className="total-row">
          <span>Qty: {totals.totalQty}</span>
          <span>Subtotal: ₹{totals.subtotal.toFixed(2)}</span>
          <span>Discount: ₹{totals.totalDiscount.toFixed(2)}</span>
          <span>Tax: ₹{totals.totalTax.toFixed(2)}</span>
        </div>
        <div className="total-row grand">
          <span>TOTAL:</span>
          <span>₹{totals.netPayable.toFixed(2)}</span>
        </div>
      </div>

      {/* Amount in Words */}
      <div className="amount-words">
        <strong>Amt in Words:</strong> {amountToWords(totals.netPayable).toUpperCase()}
      </div>

      {/* Footer */}
      <div className="footer">
        Goods once sold not returnable | Computer Generated Invoice | Thank You!
      </div>
    </div>
  )
}

export default CompactRetailInvoice
