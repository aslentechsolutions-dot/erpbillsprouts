import React, { useState, useEffect } from 'react'
import { X, AlertTriangle, Clock, DollarSign, ShoppingCart } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const NotificationPanel = ({ isOpen, onClose, navigate }) => {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen])

  const fetchNotifications = async () => {
    try {
      setLoading(true)

      const [medicinesRes, batchesRes, ordersRes, paymentsRes] = await Promise.all([
        supabase
          .from('medicines')
          .select('id, low_stock_threshold')
          .eq('status', 'active'),
        supabase
          .from('medicine_batches')
          .select('current_quantity, expiry_date, medicine_id'),
        supabase
          .from('customer_orders')
          .select('id, order_number, order_status')
          .eq('order_status', 'pending'),
        supabase
          .from('customer_orders')
          .select('id, total, payment_status')
          .eq('payment_status', 'pending')
      ])

      const allNotifications = []
      const currentDate = new Date()
      const thirtyDaysFromNow = new Date(currentDate.getTime() + (30 * 24 * 60 * 60 * 1000))

      // Low stock notifications
      if (medicinesRes.data && batchesRes.data) {
        const lowStockSet = new Set()
        
        medicinesRes.data.forEach(medicine => {
          const threshold = medicine.low_stock_threshold || 10
          const medicineStock = batchesRes.data
            .filter(batch => batch.medicine_id === medicine.id)
            .reduce((sum, batch) => sum + (batch.current_quantity || 0), 0)
          
          if (medicineStock < threshold && !lowStockSet.has(medicine.id)) {
            allNotifications.push({
              id: `low-stock-${medicine.id}`,
              type: 'low-stock',
              title: 'Low Stock Alert',
              message: `${medicineStock}/${threshold} units available`,
              icon: AlertTriangle,
              color: 'yellow',
              timestamp: new Date(),
              actionText: 'View Details',
              action: () => navigate('/admin/alerts/low-stock')
            })
            lowStockSet.add(medicine.id)
          }
        })
      }

      // Expiry notifications
      if (batchesRes.data) {
        batchesRes.data.forEach(batch => {
          const expiryDate = new Date(batch.expiry_date)
          if (expiryDate < currentDate) {
            allNotifications.push({
              id: `expired-${batch.id}`,
              type: 'expired',
              title: 'Expired Medicine',
              message: `Medicine expired on ${expiryDate.toLocaleDateString()}`,
              icon: Clock,
              color: 'red',
              timestamp: expiryDate,
              actionText: 'View Details',
              action: () => navigate('/admin/alerts/expiry')
            })
          } else if (expiryDate <= thirtyDaysFromNow) {
            allNotifications.push({
              id: `expiring-${batch.id}`,
              type: 'expiring',
              title: 'Expiring Soon',
              message: `Expires in ${Math.floor((expiryDate - currentDate) / (1000 * 60 * 60 * 24))} days`,
              icon: Clock,
              color: 'orange',
              timestamp: expiryDate,
              actionText: 'View Details',
              action: () => navigate('/admin/alerts/expiry')
            })
          }
        })
      }

      // Pending order notifications
      if (ordersRes.data) {
        ordersRes.data.forEach(order => {
          allNotifications.push({
            id: `pending-order-${order.id}`,
            type: 'pending-order',
            title: 'Pending Order',
            message: `Order #${order.order_number} is pending`,
            icon: ShoppingCart,
            color: 'blue',
            timestamp: new Date(),
            actionText: 'View Order',
            action: () => navigate('/admin/customer-orders')
          })
        })
      }

      // Pending payment notifications
      if (paymentsRes.data) {
        paymentsRes.data.forEach(payment => {
          allNotifications.push({
            id: `pending-payment-${payment.id}`,
            type: 'pending-payment',
            title: 'Pending Payment',
            message: `Payment of ₹${payment.total?.toLocaleString()} pending`,
            icon: DollarSign,
            color: 'blue',
            timestamp: new Date(),
            actionText: 'View Details',
            action: () => navigate('/admin/alerts/pending-payments')
          })
        })
      }

      // Sort by timestamp (newest first)
      allNotifications.sort((a, b) => b.timestamp - a.timestamp)
      setNotifications(allNotifications)
    } catch (error) {
      console.error('Error fetching notifications:', error)
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  const getColorClasses = (color) => {
    const colors = {
      yellow: 'bg-yellow-50 border-l-yellow-500 text-yellow-900',
      red: 'bg-red-50 border-l-red-500 text-red-900',
      orange: 'bg-orange-50 border-l-orange-500 text-orange-900',
      blue: 'bg-blue-50 border-l-blue-500 text-blue-900'
    }
    return colors[color] || colors.blue
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div className={`fixed top-0 right-0 h-screen w-96 bg-white shadow-xl transform transition-transform duration-300 z-50 flex flex-col ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : notifications.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {notifications.map((notif) => {
                const Icon = notif.icon
                return (
                  <div
                    key={notif.id}
                    className={`p-4 border-l-4 ${getColorClasses(notif.color)} hover:bg-opacity-75 transition-all cursor-pointer`}
                    onClick={() => {
                      notif.action()
                      onClose()
                    }}
                  >
                    <div className="flex items-start">
                      <Icon className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{notif.title}</p>
                        <p className="text-sm opacity-75 mt-1">{notif.message}</p>
                        <p className="text-xs opacity-50 mt-2">{notif.actionText} →</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p>No notifications</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default NotificationPanel
