import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Truck, MapPin, ArrowLeft, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useCustomerCartStore from '../../store/customerCartStore'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const CheckoutPage = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    items,
    getSubtotal,
    getGST,
    getGrandTotal,
    clearCart,
    validateCart
  } = useCustomerCartStore()

  const [loading, setLoading] = useState(false)
  const [customerData, setCustomerData] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('COD')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')

  useEffect(() => {
    // Validate cart on mount
    const errors = validateCart()
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error))
      navigate('/customer/cart')
      return
    }

    loadCustomerData()
  }, [])

  useEffect(() => {
    // Load Razorpay script if needed
    if (paymentMethod === 'razorpay') {
      loadRazorpayScript()
    }
  }, [paymentMethod])

  const loadCustomerData = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('email', user?.email)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        setCustomerData(data)
        setDeliveryAddress(data.address || '')
      }
    } catch (error) {
      console.error('Error loading customer data:', error)
    }
  }

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      // Check if script already loaded
      if (window.Razorpay) {
        resolve(true)
        return
      }

      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  const createOrder = async (razorpayOrderId = null, razorpayPaymentId = null, razorpaySignature = null) => {
    try {
      // Get order number
      const { data: orderNumber, error: orderNumError } = await supabase
        .rpc('generate_order_number')

      if (orderNumError) throw orderNumError

      const subtotal = getSubtotal()
      const gstAmount = getGST()
      const total = getGrandTotal()

      // Create order record
      const orderData = {
        order_number: orderNumber,
        customer_id: customerData.id,
        subtotal: subtotal,
        discount: 0,
        gst_amount: gstAmount,
        total: total,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'COD' ? 'pending' : 'paid',
        order_status: 'pending',
        delivery_address: deliveryAddress,
        customer_notes: customerNotes || null,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature
      }

      const { data: order, error: orderError } = await supabase
        .from('customer_orders')
        .insert(orderData)
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const orderItems = items.map(item => {
        const itemTotal = item.quantity * item.price
        const itemGstAmount = (itemTotal * (item.medicine.gst_percentage || 0)) / 100

        return {
          order_id: order.id,
          medicine_id: item.medicine.id,
          batch_id: item.batch.id,
          medicine_name: item.medicine.name,
          batch_number: item.batch.batch_number,
          quantity: item.quantity,
          price: item.price,
          discount: 0,
          gst_percentage: item.medicine.gst_percentage || 0,
          gst_amount: itemGstAmount,
          total: itemTotal + itemGstAmount
        }
      })

      const { error: itemsError } = await supabase
        .from('customer_order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      // Update stock (decrease quantities)
      for (const item of items) {
        const { error: stockError } = await supabase.rpc('update_batch_stock', {
          p_batch_id: item.batch.id,
          p_quantity_change: -item.quantity
        })

        if (stockError) {
          console.error('Stock update error:', stockError)
          // Continue - stock will be manually adjusted if needed
        }
      }

      return order
    } catch (error) {
      console.error('Error creating order:', error)
      throw error
    }
  }

  const handleCODCheckout = async () => {
    if (!deliveryAddress.trim()) {
      toast.error('Please enter delivery address')
      return
    }

    if (!customerData) {
      toast.error('Customer data not found')
      return
    }

    setLoading(true)

    try {
      const order = await createOrder()

      // Clear cart
      clearCart()

      // Navigate to confirmation
      navigate('/customer/order-confirmation', {
        state: { order, paymentMethod: 'COD' }
      })

      toast.success('Order placed successfully!')
    } catch (error) {
      console.error('COD checkout error:', error)
      toast.error('Failed to place order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRazorpayCheckout = async () => {
    if (!deliveryAddress.trim()) {
      toast.error('Please enter delivery address')
      return
    }

    if (!customerData) {
      toast.error('Customer data not found')
      return
    }

    // Load Razorpay script
    const scriptLoaded = await loadRazorpayScript()
    if (!scriptLoaded) {
      toast.error('Failed to load payment gateway. Please try again.')
      return
    }

    setLoading(true)

    try {
      const amount = getGrandTotal()

      // Create Razorpay order (This would ideally be done server-side)
      // For now, we'll use client-side integration
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: Math.round(amount * 100), // Amount in paise
        currency: 'INR',
        name: 'Online Pharmacy',
        description: 'Medicine Purchase',
        handler: async function (response) {
          try {
            // Payment successful
            const order = await createOrder(
              response.razorpay_order_id || 'RZP_' + Date.now(),
              response.razorpay_payment_id,
              response.razorpay_signature
            )

            // Clear cart
            clearCart()

            // Navigate to confirmation
            navigate('/customer/order-confirmation', {
              state: { order, paymentMethod: 'razorpay', paymentId: response.razorpay_payment_id }
            })

            toast.success('Payment successful! Order placed.')
          } catch (error) {
            console.error('Order creation after payment error:', error)
            toast.error('Payment received but order creation failed. Please contact support.')
          }
        },
        prefill: {
          name: customerData.name || '',
          email: customerData.email || '',
          contact: customerData.phone || ''
        },
        theme: {
          color: '#1e3a8a'
        },
        modal: {
          ondismiss: function() {
            setLoading(false)
            toast.info('Payment cancelled')
          }
        }
      }

      const rzp = new window.Razorpay(options)
      
      rzp.on('payment.failed', function (response) {
        setLoading(false)
        toast.error('Payment failed: ' + (response.error?.description || 'Please try again'))
        console.error('Payment failed:', response.error)
      })

      rzp.open()
    } catch (error) {
      console.error('Razorpay checkout error:', error)
      toast.error('Failed to initiate payment. Please try again.')
      setLoading(false)
    }
  }

  const handlePlaceOrder = () => {
    if (paymentMethod === 'COD') {
      handleCODCheckout()
    } else {
      handleRazorpayCheckout()
    }
  }

  if (!items || items.length === 0) {
    navigate('/customer/cart')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/customer/cart')}
            className="flex items-center text-blue-900 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Cart
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="text-gray-600 mt-1">Complete your order</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Address */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <MapPin className="h-6 w-6 text-blue-900 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Delivery Address</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Address *
                  </label>
                  <textarea
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your complete delivery address"
                    required
                  />
                </div>

                {customerData && (
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Name:</strong> {customerData.name}</p>
                    <p><strong>Phone:</strong> {customerData.phone}</p>
                    <p><strong>Email:</strong> {customerData.email}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <CreditCard className="h-6 w-6 text-blue-900 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Payment Method</h2>
              </div>

              <div className="space-y-3">
                {/* Cash on Delivery */}
                <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{ borderColor: paymentMethod === 'COD' ? '#1e3a8a' : '#e5e7eb' }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="COD"
                    checked={paymentMethod === 'COD'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mt-1"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">Cash on Delivery (COD)</span>
                      <Truck className="h-5 w-5 text-gray-600" />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Pay when you receive your order. Convenient and safe.
                    </p>
                  </div>
                </label>

                {/* Razorpay Online Payment */}
                <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{ borderColor: paymentMethod === 'razorpay' ? '#1e3a8a' : '#e5e7eb' }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="razorpay"
                    checked={paymentMethod === 'razorpay'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mt-1"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">Online Payment (Razorpay)</span>
                      <CreditCard className="h-5 w-5 text-gray-600" />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Pay securely using UPI, Cards, Net Banking, or Wallets
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Additional Notes */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Order Notes (Optional)</h3>
              <textarea
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any special instructions for delivery or prescription details..."
              />
            </div>

            {/* Prescription Warning */}
            {items.some(item => item.medicine.prescription_required) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-900 mb-1">Prescription Required</h4>
                  <p className="text-sm text-yellow-800">
                    Some items in your order require a valid prescription. Please ensure you have it ready for verification upon delivery or upload it after placing the order.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>

              {/* Items List */}
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div className="flex-1 mr-2">
                      <p className="font-medium text-gray-900">{item.medicine.name}</p>
                      <p className="text-gray-600">Qty: {item.quantity} × ₹{item.price.toFixed(2)}</p>
                    </div>
                    <p className="font-medium text-gray-900">
                      ₹{(item.quantity * item.price * (1 + (item.medicine.gst_percentage || 0) / 100)).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{getSubtotal().toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>GST</span>
                  <span>₹{getGST().toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-lg font-bold text-gray-900 border-t pt-3">
                  <span>Total</span>
                  <span>₹{getGrandTotal().toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading || !deliveryAddress.trim()}
                className="w-full mt-6 bg-blue-900 text-white py-3 px-4 rounded-lg hover:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
              >
                {loading ? 'Processing...' : paymentMethod === 'COD' ? 'Place Order (COD)' : 'Proceed to Payment'}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                By placing this order, you agree to our Terms & Conditions
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckoutPage
