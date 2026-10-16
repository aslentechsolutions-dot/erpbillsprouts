import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle, Package, Truck, Home, Receipt } from 'lucide-react'

const OrderConfirmationPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { order, paymentMethod, paymentId } = location.state || {}

  if (!order) {
    navigate('/customer/store')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Order Placed Successfully!
          </h1>
          <p className="text-gray-600">
            Thank you for your order. We've received your request and will process it shortly.
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="border-b pb-4 mb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Order Number</p>
                <p className="font-semibold text-gray-900">{order.order_number}</p>
              </div>
              <div>
                <p className="text-gray-600">Order Date</p>
                <p className="font-semibold text-gray-900">
                  {new Date(order.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Payment Method</p>
                <p className="font-semibold text-gray-900">
                  {paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online Payment (Razorpay)'}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Payment Status</p>
                <p className={`font-semibold ${order.payment_status === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>
                  {order.payment_status === 'paid' ? 'Paid' : 'Pending'}
                </p>
              </div>
              {paymentId && (
                <div className="col-span-2">
                  <p className="text-gray-600">Payment ID</p>
                  <p className="font-mono text-xs text-gray-900">{paymentId}</p>
                </div>
              )}
            </div>
          </div>

          {/* Order Amount */}
          <div className="border-b pb-4 mb-4">
            <h3 className="font-semibold text-gray-900 mb-3">Order Amount</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₹{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>GST</span>
                <span>₹{order.gst_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 border-t pt-2">
                <span>Total Amount</span>
                <span>₹{order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">What's Next?</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600">
                    <Receipt className="h-4 w-4" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Order Confirmation</p>
                  <p className="text-sm text-gray-600">You'll receive an email confirmation shortly</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600">
                    <Package className="h-4 w-4" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Order Processing</p>
                  <p className="text-sm text-gray-600">Our pharmacy team will verify and prepare your order</p>
                </div>
              </div>

              {order.payment_status === 'pending' && (
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-100 text-orange-600">
                      <Receipt className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Payment on Delivery</p>
                    <p className="text-sm text-gray-600">Please keep exact change of ₹{order.total.toFixed(2)} ready</p>
                  </div>
                </div>
              )}

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600">
                    <Truck className="h-4 w-4" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Delivery</p>
                  <p className="text-sm text-gray-600">We'll deliver your medicines to your doorstep</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Important Note */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-900 mb-2">Important Note</h3>
          <p className="text-sm text-yellow-800">
            If any item in your order requires a prescription, please keep it ready for verification during delivery. 
            Orders without valid prescriptions for prescription-required medicines cannot be fulfilled.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/customer/orders')}
            className="bg-blue-900 text-white py-3 px-6 rounded-lg hover:bg-blue-800 font-semibold flex items-center justify-center"
          >
            <Receipt className="h-5 w-5 mr-2" />
            View Order History
          </button>
          <button
            onClick={() => navigate('/customer/store')}
            className="border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-50 font-semibold flex items-center justify-center"
          >
            <Home className="h-5 w-5 mr-2" />
            Continue Shopping
          </button>
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p className="mb-2">Need help with your order?</p>
          <p>
            Contact us at{' '}
            <a href="tel:+919666105832" className="text-blue-900 hover:underline font-medium">
              +91 9666105832
            </a>
            {' '}or{' '}
            <a href="mailto:care@lifesproutcare.com" className="text-blue-900 hover:underline font-medium">
              care@lifesproutcare.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default OrderConfirmationPage
