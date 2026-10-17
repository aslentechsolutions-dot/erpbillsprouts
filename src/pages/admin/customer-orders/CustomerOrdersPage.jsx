import React, { useState, useEffect } from 'react'
import { Search, Filter, Eye, ChevronDown, ChevronUp, Calendar, CreditCard, Package, User, Phone, Mail, MapPin, FileText, Edit2, Save, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

const CustomerOrdersPage = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [expandedOrder, setExpandedOrder] = useState(null)
  const [orderItems, setOrderItems] = useState({})
  const [customers, setCustomers] = useState({})
  const [editingNotes, setEditingNotes] = useState(null)
  const [adminNotes, setAdminNotes] = useState('')

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)

      // Fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('customer_orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      setOrders(ordersData || [])

      // Fetch customer details for all orders (check customers and profiles)
      if (ordersData && ordersData.length > 0) {
        const customerIds = [...new Set(ordersData.map(o => o.customer_id).filter(Boolean))]
        const customersMap = {}

        if (customerIds.length > 0) {
          const { data: customersData } = await supabase
            .from('customers')
            .select('*')
            .in('id', customerIds)

          if (customersData) {
            customersData.forEach(c => {
              customersMap[c.id] = c
            })
          }

          // Also check profiles for any customer_id that is an auth profile ID
          const missingIds = customerIds.filter(id => !customersMap[id])
          if (missingIds.length > 0) {
            const { data: profilesData } = await supabase
              .from('profiles')
              .select('*')
              .in('id', missingIds)

            if (profilesData) {
              profilesData.forEach(p => {
                customersMap[p.id] = {
                  id: p.id,
                  name: p.full_name,
                  email: p.email,
                  phone: p.phone,
                  address: null
                }
              })
            }
          }
        }
        setCustomers(customersMap)
      }
    } catch (error) {
      console.error('Error loading orders:', error)
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const loadOrderItems = async (orderId) => {
    if (orderItems[orderId]) {
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

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      console.log('Attempting to update order status:', { orderId, newStatus })
      
      const { data, error } = await supabase
        .from('customer_orders')
        .update({ 
          order_status: newStatus
        })
        .eq('id', orderId)
        .select()

      if (error) {
        console.error('Update order status error details:', error)
        throw error
      }

      console.log('Order status updated successfully:', data)
      toast.success('Order status updated successfully')
      loadOrders()
    } catch (error) {
      console.error('Error updating order status:', error)
      toast.error(`Failed to update order status: ${error.message || 'Unknown error'}`)
    }
  }

  const updatePaymentStatus = async (orderId, newStatus) => {
    try {
      console.log('Attempting to update payment status:', { orderId, newStatus })
      
      const { data, error } = await supabase
        .from('customer_orders')
        .update({ 
          payment_status: newStatus
        })
        .eq('id', orderId)
        .select()

      if (error) {
        console.error('Update payment status error details:', error)
        throw error
      }

      console.log('Payment status updated successfully:', data)
      toast.success('Payment status updated successfully')
      loadOrders()
    } catch (error) {
      console.error('Error updating payment status:', error)
      toast.error(`Failed to update payment status: ${error.message || 'Unknown error'}`)
    }
  }

  const startEditingNotes = (order) => {
    setEditingNotes(order.id)
    setAdminNotes(order.admin_notes || '')
  }

  const cancelEditingNotes = () => {
    setEditingNotes(null)
    setAdminNotes('')
  }

  const saveAdminNotes = async (orderId) => {
    try {
      const { error } = await supabase
        .from('customer_orders')
        .update({ 
          admin_notes: adminNotes
        })
        .eq('id', orderId)

      if (error) throw error

      toast.success('Admin notes saved successfully')
      setEditingNotes(null)
      setAdminNotes('')
      loadOrders()
    } catch (error) {
      console.error('Error saving admin notes:', error)
      toast.error('Failed to save admin notes')
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

  const filteredOrders = orders.filter(order => {
    const customer = customers[order.customer_id]
    const customerName = customer?.name || order.delivery_name || ''
    const customerEmail = customer?.email || order.delivery_email || ''
    const customerPhone = customer?.phone || order.delivery_phone || ''
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerPhone.includes(searchTerm)

    const matchesStatus = statusFilter === 'all' || order.order_status === statusFilter
    const matchesPayment = paymentFilter === 'all' || order.payment_status === paymentFilter

    return matchesSearch && matchesStatus && matchesPayment
  })

  const getOrderStats = () => {
    return {
      total: orders.length,
      pending: orders.filter(o => o.order_status === 'pending').length,
      confirmed: orders.filter(o => o.order_status === 'confirmed').length,
      processing: orders.filter(o => o.order_status === 'processing').length,
      shipped: orders.filter(o => o.order_status === 'shipped').length,
      delivered: orders.filter(o => o.order_status === 'delivered').length,
      cancelled: orders.filter(o => o.order_status === 'cancelled').length,
      totalRevenue: orders.reduce((sum, o) => sum + (o.payment_status === 'paid' ? o.total : 0), 0),
      pendingPayment: orders.filter(o => o.payment_status === 'pending').length
    }
  }

  const stats = getOrderStats()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customer Orders</h1>
        <p className="text-gray-600">Manage online customer medicine orders</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-600">Confirmed</p>
          <p className="text-2xl font-bold text-blue-900">{stats.confirmed}</p>
        </div>
        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
          <p className="text-sm text-indigo-600">Processing</p>
          <p className="text-2xl font-bold text-indigo-900">{stats.processing}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <p className="text-sm text-purple-600">Shipped</p>
          <p className="text-2xl font-bold text-purple-900">{stats.shipped}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-green-600">Delivered</p>
          <p className="text-2xl font-bold text-green-900">{stats.delivered}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <p className="text-sm text-orange-600">Pending Payment</p>
          <p className="text-2xl font-bold text-orange-900">{stats.pendingPayment}</p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
          <p className="text-sm text-emerald-600">Revenue</p>
          <p className="text-xl font-bold text-emerald-900">₹{stats.totalRevenue.toFixed(0)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order number, customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Order Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Order Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Payment Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Package className="h-20 w-20 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Orders Found</h2>
          <p className="text-gray-600">No customer orders match your filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const customer = customers[order.customer_id]
            return (
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
                      <div className="flex items-center space-x-4 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {order.order_number}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.order_status)}`}>
                          {order.order_status.toUpperCase()}
                        </span>
                        <span className={`font-semibold ${getPaymentStatusColor(order.payment_status)}`}>
                          {order.payment_status === 'paid' ? '✓ PAID' : '⏳ PENDING PAYMENT'}
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
                          <User className="h-4 w-4 mr-2" />
                          {customer?.name || order.delivery_name || 'Customer'}
                        </div>
                        
                        <div className="flex items-center">
                          <CreditCard className="h-4 w-4 mr-2" />
                          {order.payment_method === 'COD' ? 'Cash on Delivery' : 'Online Payment'}
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

                {/* Order Details (Expanded) */}
                {expandedOrder === order.id && (
                  <div className="border-t border-gray-200 bg-gray-50 p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left Column */}
                      <div className="space-y-4">
                        {/* Customer Information */}
                        <div className="bg-white p-4 rounded-lg">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <User className="h-5 w-5 mr-2 text-blue-900" />
                            Customer Information
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center text-gray-600">
                              <User className="h-4 w-4 mr-2" />
                              <span>{customer?.name || order.delivery_name || 'Customer'}</span>
                            </div>
                            {(customer?.phone || order.delivery_phone) && (
                              <div className="flex items-center text-gray-600">
                                <Phone className="h-4 w-4 mr-2" />
                                <a href={`tel:${customer?.phone || order.delivery_phone}`} className="text-blue-900 hover:underline">
                                  {customer?.phone || order.delivery_phone}
                                </a>
                              </div>
                            )}
                            {(customer?.email || order.delivery_email) && (
                              <div className="flex items-center text-gray-600">
                                <Mail className="h-4 w-4 mr-2" />
                                <a href={`mailto:${customer?.email || order.delivery_email}`} className="text-blue-900 hover:underline">
                                  {customer?.email || order.delivery_email}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Delivery Address */}
                        <div className="bg-white p-4 rounded-lg">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <MapPin className="h-5 w-5 mr-2 text-blue-900" />
                            Delivery Address
                          </h4>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {order.delivery_address}
                          </p>
                        </div>

                        {/* Customer Notes */}
                        {order.customer_notes && (
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h4 className="font-semibold text-blue-900 mb-2 text-sm">Customer Notes</h4>
                            <p className="text-sm text-blue-800">{order.customer_notes}</p>
                          </div>
                        )}

                        {/* Admin Notes */}
                        <div className="bg-white p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-900 flex items-center">
                              <FileText className="h-5 w-5 mr-2 text-blue-900" />
                              Admin Notes
                            </h4>
                            {editingNotes !== order.id && (
                              <button
                                onClick={() => startEditingNotes(order)}
                                className="text-blue-900 hover:text-blue-700 text-sm flex items-center"
                              >
                                <Edit2 className="h-4 w-4 mr-1" />
                                Edit
                              </button>
                            )}
                          </div>
                          
                          {editingNotes === order.id ? (
                            <div>
                              <textarea
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                rows="3"
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Add notes for internal use..."
                              />
                              <div className="flex justify-end space-x-2 mt-2">
                                <button
                                  onClick={cancelEditingNotes}
                                  className="px-3 py-1 text-sm text-gray-700 bg-gray-200 rounded hover:bg-gray-300 flex items-center"
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Cancel
                                </button>
                                <button
                                  onClick={() => saveAdminNotes(order.id)}
                                  className="px-3 py-1 text-sm text-white bg-blue-900 rounded hover:bg-blue-800 flex items-center"
                                >
                                  <Save className="h-4 w-4 mr-1" />
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-700">
                              {order.admin_notes || 'No admin notes'}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-4">
                        {/* Order Items */}
                        <div className="bg-white p-4 rounded-lg">
                          <h4 className="font-semibold text-gray-900 mb-3">Order Items</h4>
                          {orderItems[order.id] ? (
                            <div className="space-y-2">
                              {orderItems[order.id].map((item, index) => (
                                <div key={index} className="flex items-center justify-between border-b pb-2">
                                  <div className="flex-1">
                                    <p className="font-medium text-sm text-gray-900">{item.medicine_name}</p>
                                    <p className="text-xs text-gray-600">
                                      Batch: {item.batch_number} • Qty: {item.quantity} • ₹{(item.unit_price || 0).toFixed(2)} each
                                    </p>
                                  </div>
                                  <div className="text-right ml-2">
                                    <p className="font-semibold text-sm text-gray-900">₹{(item.item_total || 0).toFixed(2)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-2">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-900 mx-auto"></div>
                            </div>
                          )}
                        </div>

                        {/* Order Summary */}
                        <div className="bg-white p-4 rounded-lg">
                          <h4 className="font-semibold text-gray-900 mb-3">Order Summary</h4>
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

                        {/* Status Updates */}
                        <div className="bg-white p-4 rounded-lg">
                          <h4 className="font-semibold text-gray-900 mb-3">Update Order Status</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
                              <button
                                key={status}
                                onClick={() => updateOrderStatus(order.id, status)}
                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                  order.order_status === status
                                    ? getStatusColor(status)
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </button>
                            ))}
                          </div>

                          <h4 className="font-semibold text-gray-900 mb-2 mt-4">Update Payment Status</h4>
                          <div className="grid grid-cols-3 gap-2">
                            {['pending', 'paid', 'failed'].map((status) => (
                              <button
                                key={status}
                                onClick={() => updatePaymentStatus(order.id, status)}
                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                  order.payment_status === status
                                    ? status === 'paid' ? 'bg-green-100 text-green-800' : 
                                      status === 'pending' ? 'bg-orange-100 text-orange-800' : 
                                      'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CustomerOrdersPage
