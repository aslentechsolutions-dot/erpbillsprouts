import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, ChevronDown, ChevronUp, ArrowLeft, Calendar, CreditCard } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const OrderHistoryPage = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedOrder, setExpandedOrder] = useState(null)
  const [orderItems, setOrderItems] = useState({})

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)

      // Get customer ID first
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('email', user?.email)
        .single()

      if (customerError) throw customerError

      // Fetch orders
      const { data, error } = await supabase
        .from('customer_orders')
        .select('*')
        .eq('customer_id', customerData.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setOrders(data || [])
    } catch (error) {
      console.error('Error loading orders:', error)
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const loadOrderItems = async (orderId) => {
    if (orderItems[orderId]) {
      // Already loaded
      return
    }

    try {
      const { data, error } = await supabase
        .from('customer_order_items')
        .select('*')
        .eq('order_id', orderId)

      if (error) throw error

      setOrderItems(prev => ({
        ...prev,
        [orderId]: data || []
      }))
    } catch (error) {
      console.error('Error loading order items:', error)
      toast.error('Failed to load order details')
    }
  }

  const toggleOrderExpand = async (orderId) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null)
    } else {
      setExpandedOrder(orderId)
      await loadOrderItems(orderId)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-indigo-100 text-indigo-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getPaymentStatusColor = (status) => {
    const colors = {
      pending: 'text-orange-600',
      paid: 'text-green-600',
      failed: 'text-red-600'
    }
    return colors[status] || 'text-gray-600'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Order History</h1>
        <p className="text-gray-600 mt-1">Track and manage your medicine orders</p>
      </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Package className="h-20 w-20 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Orders Yet</h2>
            <p className="text-gray-600 mb-6">You haven't placed any orders. Start shopping for medicines!</p>
            <button
              onClick={() => navigate('/customer/store')}
              className="bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 inline-flex items-center"
            >
              <Package className="h-5 w-5 mr-2" />
              Browse Medicines
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* Order Header */}
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleOrderExpand(order.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {order.order_number}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.order_status)}`}>
                          {order.order_status.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          {new Date(order.created_at).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        
                        <div className="flex items-center">
                          <CreditCard className="h-4 w-4 mr-2" />
                          {order.payment_method === 'COD' ? 'Cash on Delivery' : 'Online Payment'}
                        </div>
                        
                        <div>
                          <span className="font-medium">Payment: </span>
                          <span className={`font-semibold ${getPaymentStatusColor(order.payment_status)}`}>
                            {order.payment_status === 'paid' ? 'Paid' : 'Pending'}
                          </span>
                        </div>
                        
                        <div className="font-semibold text-gray-900">
                          Total: ₹{order.total.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="ml-4">
                      {expandedOrder === order.id ? (
                        <ChevronUp className="h-6 w-6 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Order Items (Expanded) */}
                {expandedOrder === order.id && (
                  <div className="border-t border-gray-200 bg-gray-50 p-6">
                    {orderItems[order.id] ? (
                      <>
                        <h4 className="font-semibold text-gray-900 mb-4">Order Items</h4>
                        <div className="space-y-3 mb-6">
                          {orderItems[order.id].map((item, index) => (
                            <div key={index} className="flex items-center justify-between bg-white p-4 rounded-lg">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{item.medicine_name}</p>
                                <div className="text-sm text-gray-600 mt-1">
                                  <span>Batch: {item.batch_number}</span>
                                  <span className="mx-2">•</span>
                                  <span>Qty: {item.quantity}</span>
                                  <span className="mx-2">•</span>
                                  <span>₹{item.price.toFixed(2)} each</span>
                                  {item.gst_percentage > 0 && (
                                    <>
                                      <span className="mx-2">•</span>
                                      <span>GST: {item.gst_percentage}%</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                <p className="font-semibold text-gray-900">₹{item.total.toFixed(2)}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Order Summary */}
                        <div className="bg-white p-4 rounded-lg">
                          <h5 className="font-semibold text-gray-900 mb-3">Order Summary</h5>
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
                              <span>Total</span>
                              <span>₹{order.total.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Customer Notes */}
                        {order.customer_notes && (
                          <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                            <p className="text-sm font-medium text-blue-900 mb-1">Your Notes</p>
                            <p className="text-sm text-blue-800">{order.customer_notes}</p>
                          </div>
                        )}

                        {/* Admin Notes */}
                        {order.admin_notes && (
                          <div className="mt-4 bg-yellow-50 p-4 rounded-lg">
                            <p className="text-sm font-medium text-yellow-900 mb-1">Pharmacy Notes</p>
                            <p className="text-sm text-yellow-800">{order.admin_notes}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900 mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-600">Loading order details...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
  )
}

export default OrderHistoryPage
