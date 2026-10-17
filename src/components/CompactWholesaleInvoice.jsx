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

const CompactWholesaleInvoice = ({ 
  sale, 
  items, 
  customer, 
  companyDetails,
  pageWidth = '100mm',
  pageHeight = 'auto'
}) => {
  // Calculate totals and GST breakdown
  const calculateTotals = () => {
    let totalQty = 0
    let totalFree = 0
    let subtotal = 0
    let totalDiscountAmt = 0
    
    const gstBreakdown = {}

    items.forEach(item => {
      totalQty += item.quantity
      totalFree += item.freeQuantity || 0
      
      const itemTotal = item.quantity * item.price
      const discountAmt = (itemTotal * (item.discount || 0)) / 100
      const taxableAmount = itemTotal - discountAmt
      
      subtotal += itemTotal
      totalDiscountAmt += discountAmt
      
      const gstRate = item.medicine.gst_percentage || 0
      const gstAmount = (taxableAmount * gstRate) / 100
      
      // GST breakdown by rate
      if (!gstBreakdown[gstRate]) {
        gstBreakdown[gstRate] = { 
          taxable: 0, 
          cgst: 0, 
          sgst: 0, 
          igst: 0,
          totalGst: 0 
        }
      }
      gstBreakdown[gstRate].taxable += taxableAmount
      gstBreakdown[gstRate].cgst += gstAmount / 2
      gstBreakdown[gstRate].sgst += gstAmount / 2
      gstBreakdown[gstRate].totalGst += gstAmount
    })

    const taxableValue = subtotal - totalDiscountAmt
    let totalCgst = 0
    let totalSgst = 0
    let totalIgst = 0

    Object.values(gstBreakdown).forEach(tax => {
      totalCgst += tax.cgst
      totalSgst += tax.sgst
      totalIgst += tax.igst
    })

    const totalTax = totalCgst + totalSgst + totalIgst
    const grandTotal = taxableValue + totalTax
    const roundOff = Math.round(grandTotal) - grandTotal
    const netPayable = Math.round(grandTotal)

    return {
      totalQty,
      totalFree,
      subtotal,
      totalDiscountAmt,
      taxableValue,
      totalCgst,
      totalSgst,
      totalIgst,
      totalTax,
      grandTotal,
      roundOff,
      netPayable,
      gstBreakdown
    }
  }

  const totals = calculateTotals()
  const invoiceDate = new Date(sale.created_at)

  return (
    <>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html, body {
          width: ${pageWidth};
          ${pageHeight !== 'auto' ? `height: ${pageHeight};` : ''}
          margin: 0;
          padding: 0;
          background: white;
        }

        @page {
          size: ${pageWidth} ${pageHeight !== 'auto' ? pageHeight : 'auto'};
          margin: 0;
        }

        @media print {
          html, body {
            width: ${pageWidth};
            ${pageHeight !== 'auto' ? `height: ${pageHeight};` : ''}
            margin: 0;
            padding: 0;
            background: white;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }

        .compact-wholesale-invoice {
          font-family: 'Courier New', monospace;
          background: white;
          color: black;
          width: ${pageWidth};
          ${pageHeight !== 'auto' ? `height: ${pageHeight};` : ''}
          padding: 3mm 5mm;
          font-size: 7px;
          line-height: 1.0;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          overflow: visible;
        }

        .compact-wholesale-invoice * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .header {
          text-align: center;
          border-bottom: 0.5px solid #000;
          padding-bottom: 1mm;
          margin-bottom: 1mm;
          flex-shrink: 0;
        }

        .company-name {
          font-size: 10px;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 1px;
          letter-spacing: -0.5px;
        }

        .company-info {
          font-size: 7px;
          line-height: 1.0;
        }

        .invoice-title {
          font-size: 9px;
          font-weight: bold;
          text-align: center;
          margin: 1mm 0;
          flex-shrink: 0;
        }

        .invoice-meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1mm;
          font-size: 7px;
          gap: 2mm;
          flex-shrink: 0;
        }

        .meta-item {
          flex: 1;
          min-width: 0;
          font-size: 7px;
        }

        .customer-info {
          border-top: 1px solid #000;
          border-bottom: 1px solid #000;
          padding: 1mm 0;
          margin: 1mm 0;
          font-size: 7px;
          line-height: 1.0;
          flex-shrink: 0;
        }

        .info-row {
          display: flex;
          margin-bottom: 0.5mm;
          font-size: 7px;
        }

        .info-label {
          width: 20%;
          font-weight: bold;
          flex-shrink: 0;
        }

        .info-value {
          width: 80%;
          word-wrap: break-word;
          overflow-wrap: break-word;
          font-size: 7px;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 1mm 0;
          font-size: 7px;
          border: 1px solid #000;
          flex-shrink: 0;
        }

        .items-table th {
          border: 1px solid #000;
          padding: 0.5px;
          text-align: center;
          font-weight: bold;
          font-size: 7px;
          background-color: #f5f5f5;
          line-height: 1.0;
          word-break: break-word;
          height: auto;
        }

        .items-table td {
          padding: 0.5px;
          border: 1px solid #000;
          vertical-align: top;
          font-size: 7px;
          line-height: 1.0;
          height: auto;
        }

        .items-table .text-left { text-align: left; }
        .items-table .text-center { text-align: center; }
        .items-table .text-right { text-align: right; }

        .product-name {
          font-weight: 600;
          word-wrap: break-word;
          font-size: 7px;
          line-height: 1.0;
        }

        .gst-summary {
          border: 1px solid #000;
          padding: 1mm;
          margin: 1mm 0;
          font-size: 7px;
          line-height: 1.0;
          flex-shrink: 0;
        }

        .gst-summary-row {
          display: flex;
          justify-content: space-between;
          gap: 2mm;
          padding: 0.5mm 0;
          font-size: 7px;
          line-height: 1.0;
        }

        .totals-section {
          border: 1px solid #000;
          padding: 1mm;
          margin: 1mm 0;
          font-size: 7px;
          line-height: 1.0;
          flex-shrink: 0;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          gap: 2mm;
          padding: 0.5mm 0;
          font-size: 7px;
          line-height: 1.0;
        }

        .total-row.grand {
          font-size: 8px;
          font-weight: bold;
          border-top: 1px solid #000;
          border-bottom: 1px double #000;
          padding: 1mm 0;
          margin-top: 1mm;
        }

        .amount-words {
          margin: 1mm 0;
          font-size: 7px;
          line-height: 1.0;
          flex-shrink: 0;
        }

        .footer {
          border-top: 0.5px solid #000;
          padding-top: 0.3mm;
          text-align: center;
          font-size: 5.5px;
          line-height: 0.85;
          flex-shrink: 0;
        }

        .terms-section {
          margin-top: 0.6mm;
          padding-top: 0.6mm;
          border-top: 0.5px solid #000;
          font-size: 5px;
          line-height: 0.8;
          flex-shrink: 0;
        }

        .terms-title {
          text-align: center;
          font-weight: bold;
          font-size: 5.5px;
          margin-bottom: 0.3mm;
        }

        .terms-content {
          columns: 2;
          column-gap: 0.8mm;
          font-size: 4.5px;
          line-height: 0.8;
        }

        .terms-subsection {
          margin: 0.2mm 0;
          break-inside: avoid;
        }

        .terms-subsection-title {
          font-weight: bold;
          font-size: 5px;
          margin-bottom: 0.1mm;
        }

        .terms-item {
          margin: 0.05mm 0;
          font-size: 4.5px;
          line-height: 0.8;
        }

        .bank-details {
          border: 0.5px solid #000;
          padding: 0.2mm;
          margin-top: 0.2mm;
          font-size: 4.5px;
          line-height: 0.8;
        }

        @media print {
          .compact-wholesale-invoice {
            margin: 0;
            padding: 2mm;
            width: ${pageWidth};
            height: ${pageHeight};
          }
        }
      `}</style>

      <div className="compact-wholesale-invoice">
        {/* Header */}
        <div className="header">
          <div className="company-name">{companyDetails.pharmacy_name || 'LIFESPROUTS CARE LLP'}</div>
          <div className="company-info">
            {companyDetails.address || 'SHOP NO. 1'} | {companyDetails.state || 'TELANGANA'} | Phone: {companyDetails.phone || '9666105832'}<br/>
            GSTIN: {companyDetails.gstin || '36CTUPD3541E1ZO'} | D.L: {companyDetails.drug_license_number || '(20B&21B)TG/AS/2025-139054'}
          </div>
        </div>

        {/* Invoice Title & Meta */}
        <div className="invoice-title">GST INVOICE</div>

        <div className="invoice-meta">
          <div className="meta-item"><strong>Invoice:</strong> {sale.invoice_number}</div>
          <div className="meta-item"><strong>Date:</strong> {invoiceDate.toLocaleDateString('en-GB')}</div>
          <div className="meta-item"><strong>M/S:</strong> {customer?.business_name || customer?.name || 'WALK-IN'}</div>
        </div>

        {/* Customer Information - Inline */}
        <div className="customer-info">
          <div className="info-row">
            <div className="info-label">Customer:</div>
            <div className="info-value">{customer?.business_name || customer?.name || 'Walk-in Customer'}</div>
          </div>
          {customer?.gstin && (
            <div className="info-row">
              <div className="info-label">GSTIN:</div>
              <div className="info-value">{customer.gstin}</div>
            </div>
          )}
        </div>

        {/* Items Table - Highly Compressed */}
        <table className="items-table">
          <thead>
            <tr>
              <th style={{width: '12px'}}>S</th>
              <th style={{width: '50px'}}>Product</th>
              <th style={{width: '20px'}}>HSN</th>
              <th style={{width: '20px'}}>Qty</th>
              <th style={{width: '20px'}}>Free</th>
              <th style={{width: '20px'}}>Batch</th>
              <th style={{width: '18px'}}>Exp</th>
              <th style={{width: '20px'}}>Rate</th>
              <th style={{width: '15px'}}>Dis</th>
              <th style={{width: '15px'}}>GST%</th>
              <th style={{width: '20px'}}>GST Amt</th>
              <th style={{width: '25px'}}>Amount</th>
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
                  <td className="text-center">{index + 1}</td>
                  <td className="text-left">
                    <div className="product-name">{item.medicine.name}</div>
                  </td>
                  <td className="text-center">{item.medicine.hsn_code || '3004'}</td>
                  <td className="text-center"><strong>{item.quantity}</strong></td>
                  <td className="text-center">{item.freeQuantity || 0}</td>
                  <td className="text-center" style={{fontSize: '5px'}}>{item.batch.batch_number}</td>
                  <td className="text-center" style={{fontSize: '5px'}}>
                    {new Date(item.batch.expiry_date).toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' })}
                  </td>
                  <td className="text-right">{item.price.toFixed(2)}</td>
                  <td className="text-center">{item.discount || 0}</td>
                  <td className="text-center">{gstRate.toFixed(0)}</td>
                  <td className="text-right">{gstAmount.toFixed(2)}</td>
                  <td className="text-right"><strong>{totalWithGst.toFixed(2)}</strong></td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* GST Summary - Inline Rows */}
        <div className="gst-summary">
          <div><strong>Tax Summary:</strong></div>
          {Object.entries(totals.gstBreakdown).map(([rate, values]) => (
            <div key={rate} className="gst-summary-row">
              <span>GST {rate}%: Taxable: ₹{values.taxable.toFixed(2)}</span>
              <span>CGST: ₹{values.cgst.toFixed(2)}</span>
              <span>SGST: ₹{values.sgst.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Totals - Compact */}
        <div className="totals-section">
          <div className="total-row">
            <span>Qty: {totals.totalQty} | Subtotal: ₹{totals.subtotal.toFixed(2)} | Discount: ₹{totals.totalDiscountAmt.toFixed(2)}</span>
            <span>Taxable: ₹{totals.taxableValue.toFixed(2)} | Tax: ₹{totals.totalTax.toFixed(2)} | Round-off: ₹{totals.roundOff.toFixed(2)}</span>
          </div>
          <div className="total-row grand">
            <span>GRAND TOTAL:</span>
            <span>₹{totals.netPayable.toFixed(2)}</span>
          </div>
        </div>

        {/* Amount in Words */}
        <div className="amount-words">
          <strong>Rs. (IN WORDS):</strong> {amountToWords(totals.netPayable).toUpperCase()}
        </div>

        {/* Footer */}
        <div className="footer">
          Goods once sold not returnable | Computer Generated Invoice
        </div>

        {/* Terms & Conditions */}
        <div className="terms-section">
          <div className="terms-title">Terms & Conditions</div>
          
          <div className="terms-content">
            <div className="terms-subsection">
              <div className="terms-subsection-title">General Terms:</div>
              <div className="terms-item">• Goods once sold will not be taken back or exchanged</div>
              <div className="terms-item">• Bills not paid due date will attract 24% interest</div>
              <div className="terms-item">• Free goods are included in the quantity charged</div>
              <div className="terms-item">• All payments must be made within prescribed credit period</div>
              <div className="terms-item">• Sales Tax declaration will be given as per government norms</div>
            </div>

            <div className="terms-subsection">
              <div className="terms-subsection-title">Delivery & Returns:</div>
              <div className="terms-item">• Goods supplied on our commercial policy of the company</div>
              <div className="terms-item">• Excise products will not be accepted for return</div>
              <div className="terms-item">• Over supply incidents will result to company policy</div>
            </div>

            <div className="terms-subsection">
              <div className="terms-subsection-title">Legal:</div>
              <div className="terms-item">• All disputes are subject to jurisdiction of court only</div>
              <div className="terms-item">• E&O.E - Errors and Omissions Excepted</div>
            </div>
          </div>

          <div className="bank-details">
            <div><strong>Bank Details: {companyDetails.pharmacy_name || 'LIFESPROUTS CARE LLP'}</strong></div>
            <div>Bank Name: HDFC BANK | Branch: Main | A/C No: 50100000000123456 | IFSC: HDFC0000372</div>
          </div>
        </div>
      </div>
    </>
  )
}

export default CompactWholesaleInvoice
