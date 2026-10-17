import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, Package } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import LoadingSpinner from '../../../components/LoadingSpinner'
import toast from 'react-hot-toast'

const LowStockAlertPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [lowStockItems, setLowStockItems] = useState([])

  useEffect(() => {
    fetchLowStockItems()
  }, [])

  const fetchLowStockItems = async () => {
    try {
      setLoading(true)
      
      const [medicinesRes, batchesRes] = await Promise.all([
        supabase
          .from('medicines')
          .select('id, name, low_stock_threshold')
          .eq('status', 'active'),
        supabase
          .from('medicine_batches')
          .select('id, medicine_id, current_quantity, batch_number, expiry_date')
      ])

      const medicines = medicinesRes.data || []
      const batches = batchesRes.data || []

      // Calculate low stock medicines with their batch details
      const lowStockData = []
      const processedMedicines = new Set()

      medicines.forEach(medicine => {
        const threshold = medicine.low_stock_threshold || 10
        const medicineBatches = batches.filter(b => b.medicine_id === medicine.id)
        const totalStock = medicineBatches.reduce((sum, b) => sum + (b.current_quantity || 0), 0)

        if (totalStock < threshold && !processedMedicines.has(medicine.id)) {
          lowStockData.push({
            medicineId: medicine.id,
            medicineName: medicine.name,
            threshold,
            totalStock,
            batches: medicineBatches
          })
          processedMedicines.add(medicine.id)
        }
      })

      setLowStockItems(lowStockData)
    } catch (error) {
      console.error('Error fetching low stock items:', error)
      toast.error('Failed to load low stock items')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading low stock items..." />
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
            <AlertTriangle className="h-6 w-6 text-yellow-500 mr-2" />
            Low Stock Alerts
          </h1>
          <p className="text-gray-600">Medicines below their minimum stock threshold</p>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-lg font-semibold text-gray-900">
          {lowStockItems.length} medicine(s) running low
        </p>
      </div>

      {/* Low Stock Items Table */}
      {lowStockItems.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Medicine Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Threshold
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Batches
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lowStockItems.map((item) => {
                const stockPercentage = (item.totalStock / item.threshold) * 100
                const isUrgent = item.totalStock === 0
                
                return (
                  <tr key={item.medicineId}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">{item.medicineName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${isUrgent ? 'text-red-600' : 'text-orange-600'}`}>
                        {item.totalStock} units
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.threshold} units
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-24">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-600">{Math.round(stockPercentage)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${isUrgent ? 'bg-red-500' : 'bg-orange-500'}`}
                            style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.batches.length} batch(es)
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No low stock items at the moment</p>
        </div>
      )}
    </div>
  )
}

export default LowStockAlertPage
