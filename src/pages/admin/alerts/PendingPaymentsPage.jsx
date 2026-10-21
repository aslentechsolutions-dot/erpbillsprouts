import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, DollarSign, Clock, User } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import LoadingSpinner from '../../../components/LoadingSpinner'
import toast from 'react-hot-toast'

const PendingPaymentsPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [pendingPayments, setPendingPayments] = useState([])
  const [totalPending, setTotalPending] = useState(0)

  useEffect(() => {
    fetchPendingPayments()
  }, [])

  const fetchPendingPayments = async () => {
    try {
      setLoading(true)
      
      // Get customer orders with pending payment
      const { data: ordersRes, error: ordersError } = await supabase
        .from('customer_orders')
        .select(`
          id,
          order_number,
          payment_status,
          total,
          created_at,
          customer_id,
          delivery_name,
          delivery_phone
        `)
        .eq('payment_status', 'pending')
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      // Get customer details
      const orders = ordersRes || []
      let totalAmount = 0

      const ordersWithCustomer = orders.map(order => {
        totalAmount += order.total || 0
        return order
      })

      setPendingPayments(ordersWithCustomer)
      setTotalPending(totalAmount)
    } catch (error) {
      console.error('Error fetching pending payments:', error)
      toast.error('Failed to load pending payments')
    } finally {
      setLoading(false)
    }
  }

  const markAsResolved = async (orderId) => {
    try {
      const { error } = await supabase
        .from('customer_orders')
        .update({ payment_status: 'paid' })
        .eq('id', orderId)

      if (error) throw error

      toast.success('Payment marked as paid')
      fetchPendingPayments()
    } catch (error) {
      console.error('Error updating payment status:', error)
      toast.error('Failed to update payment status')
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading pending payments..." />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center text-blue-600 hover:text-blue-800 mr-4"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <DollarSign className="h-6 w-6 text-blue-500 mr-2" />
            Pending Payments
          </h1>
          <p className="text-gray-600">Orders awaiting payment confirmation</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-lg shadow p-4 border-l-4 border-l-blue-500">
          <p className="text-sm text-blue-600 font-medium">Total Pending Amount</p>
          <p className="text-3xl font-bold text-blue-700">₹{totalPending.toLocaleString()}</p>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4 border-l-4 border-l-blue-500">
          <p className="text-sm text-blue-600 font-medium">Pending Orders</p>
          <p className="text-3xl font-bold text-blue-700">{pendingPayments.length}</p>
        </div>
      </div>

      {/* Pending Payments Table */}
      {pendingPayments.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days Pending
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingPayments.map((order) => {
                const orderDate = new Date(order.created_at)
                const daysPending = Math.floor((new Date() - orderDate) / (1000 * 60 * 60 * 24))
                
                return (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-blue-600 cursor-pointer hover:underline">
                        {order.order_number}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">{order.delivery_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {order.delivery_phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">
                        ₹{order.total.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {orderDate.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Clock className={`h-4 w-4 mr-2 ${daysPending > 5 ? 'text-red-500' : 'text-yellow-500'}`} />
                        <span className={`text-sm font-medium ${daysPending > 5 ? 'text-red-600' : 'text-yellow-600'}`}>
                          {daysPending} day(s)
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => markAsResolved(order.id)}
                        className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 font-medium"
                      >
                        Mark Paid
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No pending payments</p>
        </div>
      )}
    </div>
  )
}

export default PendingPaymentsPage
