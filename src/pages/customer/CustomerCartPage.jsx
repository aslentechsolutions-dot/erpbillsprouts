import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, ArrowRight, Package } from 'lucide-react'
import useCustomerCartStore from '../../store/customerCartStore'
import toast from 'react-hot-toast'

const CustomerCartPage = () => {
  const navigate = useNavigate()
  const {
    items,
    updateItemQuantity,
    removeItem,
    getSubtotal,
    getGST,
    getGrandTotal,
    clearCart,
    validateCart
  } = useCustomerCartStore()

  const handleQuantityChange = (itemId, newQuantity, maxQuantity) => {
    if (newQuantity < 1) {
      return
    }

    if (newQuantity > maxQuantity) {
      toast.error(`Maximum available quantity is ${maxQuantity}`)
      return
    }

    updateItemQuantity(itemId, newQuantity)
  }

  const handleRemoveItem = (itemId, medicineName) => {
    if (window.confirm(`Remove ${medicineName} from cart?`)) {
      removeItem(itemId)
      toast.success('Item removed from cart')
    }
  }

  const handleClearCart = () => {
    if (window.confirm('Are you sure you want to clear the entire cart?')) {
      clearCart()
      toast.success('Cart cleared')
    }
  }

  const handleProceedToCheckout = () => {
    const errors = validateCart()
    
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error))
      return
    }

    navigate('/customer/checkout')
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/customer/store')}
              className="flex items-center text-blue-900 hover:text-blue-700 mb-4"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Continue Shopping
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
          </div>

          {/* Empty Cart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Package className="h-20 w-20 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Add medicines to your cart to proceed with checkout</p>
            <button
              onClick={() => navigate('/customer/store')}
              className="bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 inline-flex items-center"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Browse Medicines
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/customer/store')}
            className="flex items-center text-blue-900 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Continue Shopping
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
              <p className="text-gray-600 mt-1">{items.length} item{items.length !== 1 ? 's' : ''} in cart</p>
            </div>
            <button
              onClick={handleClearCart}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              Clear Cart
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const itemTotal = item.quantity * item.price
              const gstAmount = (itemTotal * (item.medicine.gst_percentage || 0)) / 100
              const itemTotalWithGST = itemTotal + gstAmount

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start space-x-4">
                    {/* Medicine Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {item.medicine.name}
                      </h3>
                      
                      {item.medicine.generic_name && (
                        <p className="text-sm text-gray-600 mb-2">{item.medicine.generic_name}</p>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                        {item.medicine.manufacturer && (
                          <div>
                            <span className="font-medium">Manufacturer:</span> {item.medicine.manufacturer}
                          </div>
                        )}
                        {item.medicine.strength && (
                          <div>
                            <span className="font-medium">Strength:</span> {item.medicine.strength}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Batch:</span> {item.batch.batch_number}
                        </div>
                        <div>
                          <span className="font-medium">Expiry:</span>{' '}
                          {new Date(item.batch.expiry_date).toLocaleDateString('en-GB', {
                            month: '2-digit',
                            year: '2-digit'
                          })}
                        </div>
                      </div>

                      {item.medicine.prescription_required && (
                        <div className="inline-flex items-center px-2 py-1 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 mb-2">
                          ⚕️ Prescription Required
                        </div>
                      )}

                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center border border-gray-300 rounded-lg">
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1, item.batch.current_quantity)}
                            disabled={item.quantity <= 1}
                            className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={item.batch.current_quantity}
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1, item.batch.current_quantity)}
                            className="w-16 text-center border-x border-gray-300 py-2 focus:outline-none"
                          />
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1, item.batch.current_quantity)}
                            disabled={item.quantity >= item.batch.current_quantity}
                            className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        <span className="text-sm text-gray-600">
                          Max: {item.batch.current_quantity} available
                        </span>

                        <button
                          onClick={() => handleRemoveItem(item.id, item.medicine.name)}
                          className="ml-auto text-red-600 hover:text-red-700 p-2"
                          title="Remove from cart"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Price Info */}
                    <div className="text-right">
                      <div className="text-sm text-gray-600 mb-1">
                        ₹{item.price.toFixed(2)} × {item.quantity}
                      </div>
                      <div className="text-xl font-bold text-gray-900">
                        ₹{itemTotalWithGST.toFixed(2)}
                      </div>
                      {item.medicine.gst_percentage > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          (incl. {item.medicine.gst_percentage}% GST)
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({items.length} item{items.length !== 1 ? 's' : ''})</span>
                  <span>₹{getSubtotal().toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>GST</span>
                  <span>₹{getGST().toFixed(2)}</span>
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold text-gray-900">
                    <span>Total</span>
                    <span>₹{getGrandTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleProceedToCheckout}
                className="w-full bg-blue-900 text-white py-3 px-4 rounded-lg hover:bg-blue-800 flex items-center justify-center space-x-2 font-semibold"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="h-5 w-5" />
              </button>

              <div className="mt-4 pt-4 border-t">
                <div className="text-xs text-gray-600 space-y-2">
                  <p>✓ Secure checkout</p>
                  <p>✓ Multiple payment options</p>
                  <p>✓ Fast delivery</p>
                </div>
              </div>

              <button
                onClick={() => navigate('/customer/store')}
                className="w-full mt-4 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Continue Shopping</span>
              </button>
            </div>
          </div>
        </div>
      </div>
  )
}

export default CustomerCartPage
