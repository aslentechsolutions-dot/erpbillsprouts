import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Download, AlertCircle, Loader } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'
import CompactRetailInvoice from '../../../components/CompactRetailInvoice'
import CompactWholesaleInvoice from '../../../components/CompactWholesaleInvoice'

const InvoicePrintPage = () => {
  const { invoiceId } = useParams()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState(null)
  const [sale, setSale] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [saleItems, setSaleItems] = useState([])
  const [companyDetails, setCompanyDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    fetchInvoiceData()
  }, [invoiceId])

  const fetchInvoiceData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single()

      if (invoiceError) throw new Error('Invoice not found')
      setInvoice(invoiceData)

      // Fetch sale
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .select('*')
        .eq('id', invoiceData.sale_id)
        .single()

      if (saleError) throw new Error('Sale record not found')
      setSale(saleData)

      // Fetch customer
      if (invoiceData.customer_id) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('*')
          .eq('id', invoiceData.customer_id)
          .single()

        if (customerData) {
          setCustomer(customerData)
        }
      }

      // Fetch sale items
      const { data: itemsData, error: itemsError } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', invoiceData.sale_id)

      if (!itemsError && itemsData) {
        setSaleItems(itemsData)
      }

      // Fetch company settings
      const { data: settingsData } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .single()

      if (settingsData) {
        setCompanyDetails({
          pharmacy_name: settingsData.pharmacy_name || 'BillSprout',
          address: settingsData.address || '',
          state: settingsData.state || '',
          gstin: settingsData.gstin || '',
          drug_license_number: settingsData.drug_license_number || '',
          phone: settingsData.phone || '',
          email: settingsData.email || ''
        })
      }

      // Mark as printed (without blocking the UI)
      await supabase.rpc('mark_invoice_printed', { p_invoice_id: invoiceId }).catch(() => {})
    } catch (err) {
      console.error('Error fetching invoice:', err)
      setError(err.message || 'Error loading invoice')
      toast.error(err.message || 'Error loading invoice')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    setPrinting(true)
    setTimeout(() => {
      window.print()
      setPrinting(false)
    }, 100)
  }

  const handleDownloadPDF = async () => {
    try {
      // For now, trigger browser print-to-PDF
      toast.info('Use the browser print dialog to save as PDF')
      handlePrint()
    } catch (err) {
      toast.error('Error preparing PDF')
    }
  }

  const handleBack = () => {
    navigate(-1)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (error || !invoice || !sale || !saleItems.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2 text-center">
            {error ? 'Error Loading Invoice' : 'Invoice Not Found'}
          </h1>
          <p className="text-gray-600 text-center mb-6">
            {error || 'The requested invoice could not be found.'}
          </p>
          <button
            onClick={handleBack}
            className="w-full btn-primary flex items-center justify-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const isWholesale = invoice.sale_type === 'wholesale'
  const InvoiceComponent = isWholesale ? CompactWholesaleInvoice : CompactRetailInvoice

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Print Toolbar - Only visible on screen, not in print */}
      <div className="print:hidden bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBack}
              className="btn-secondary flex items-center"
              title="Go back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>
            <div className="text-sm text-gray-600">
              <p className="font-medium">Invoice {invoice.invoice_number}</p>
              <p className="text-xs text-gray-500">
                {new Date(invoice.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              disabled={printing}
              className="btn-primary flex items-center"
              title="Print invoice"
            >
              <Printer className="h-4 w-4 mr-2" />
              {printing ? 'Printing...' : 'Print'}
            </button>
            <button
              onClick={handleDownloadPDF}
              className="btn-secondary flex items-center"
              title="Download as PDF"
            >
              <Download className="h-4 w-4 mr-2" />
              Save PDF
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Content - Full width for printing */}
      <div className="print:p-0 p-6 max-w-6xl mx-auto">
        <div className="bg-white print:shadow-none shadow-sm">
          <InvoiceComponent
            sale={sale}
            items={saleItems}
            customer={customer}
            companyDetails={companyDetails || {}}
            pageWidth="297mm"
            pageHeight="190mm"
          />
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .bg-gray-50 {
            background: white !important;
          }
        }
      `}</style>
    </div>
  )
}

export default InvoicePrintPage
