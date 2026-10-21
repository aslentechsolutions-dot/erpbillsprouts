import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, Package } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import LoadingSpinner from '../../../components/LoadingSpinner'
import toast from 'react-hot-toast'

const ExpiryAlertPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [expiryItems, setExpiryItems] = useState([])

  useEffect(() => {
    fetchExpiryItems()
  }, [])

  const fetchExpiryItems = async () => {
    try {
      setLoading(true)
      
      const [medicinesRes, batchesRes] = await Promise.all([
        supabase
          .from('medicines')
          .select('id, name'),
        supabase
          .from('medicine_batches')
          .select('id, medicine_id, batch_number, current_quantity, expiry_date')
      ])

      const medicines = medicinesRes.data || []
      const batches = batchesRes.data || []

      const currentDate = new Date()
      const thirtyDaysFromNow = new Date(currentDate.getTime() + (30 * 24 * 60 * 60 * 1000))

      // Separate expired and expiring soon
      const expired = []
      const expiringSoon = []

      batches.forEach(batch => {
        const expiryDate = new Date(batch.expiry_date)
        const medicine = medicines.find(m => m.id === batch.medicine_id)

        if (expiryDate < currentDate) {
          expired.push({
            ...batch,
            medicineName: medicine?.name || 'Unknown',
            daysUntilExpiry: Math.floor((expiryDate - currentDate) / (1000 * 60 * 60 * 24)),
            status: 'expired'
          })
        } else if (expiryDate <= thirtyDaysFromNow) {
          expiringSoon.push({
            ...batch,
            medicineName: medicine?.name || 'Unknown',
            daysUntilExpiry: Math.floor((expiryDate - currentDate) / (1000 * 60 * 60 * 24)),
            status: 'expiring'
          })
        }
      })

      // Sort by expiry date
      const allItems = [...expired.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date)), 
                         ...expiringSoon.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))]
      
      setExpiryItems(allItems)
    } catch (error) {
      console.error('Error fetching expiry items:', error)
      toast.error('Failed to load expiry items')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading expiry alerts..." />
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
            <Clock className="h-6 w-6 text-red-500 mr-2" />
            Expiry Alerts
          </h1>
          <p className="text-gray-600">Medicines expiring soon or already expired</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-red-50 rounded-lg shadow p-4 border-l-4 border-l-red-500">
          <p className="text-sm text-red-600 font-medium">Expired</p>
          <p className="text-2xl font-bold text-red-700">
            {expiryItems.filter(i => i.status === 'expired').length}
          </p>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4 border-l-4 border-l-yellow-500">
          <p className="text-sm text-yellow-600 font-medium">Expiring Soon (30 days)</p>
          <p className="text-2xl font-bold text-yellow-700">
            {expiryItems.filter(i => i.status === 'expiring').length}
          </p>
        </div>
      </div>

      {/* Expiry Items Table */}
      {expiryItems.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Medicine Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Batch Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expiry Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days Left
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expiryItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Package className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">{item.medicineName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {item.batch_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {new Date(item.expiry_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-semibold ${
                      item.status === 'expired' ? 'text-red-600' : 
                      item.daysUntilExpiry <= 7 ? 'text-orange-600' : 'text-yellow-600'
                    }`}>
                      {item.daysUntilExpiry < 0 ? `${Math.abs(item.daysUntilExpiry)} days ago` : `${item.daysUntilExpiry} days`}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {item.current_quantity} units
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      item.status === 'expired' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.status === 'expired' ? 'Expired' : 'Expiring Soon'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No expiry alerts at the moment</p>
        </div>
      )}
    </div>
  )
}

export default ExpiryAlertPage
