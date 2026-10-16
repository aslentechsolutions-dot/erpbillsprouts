import React, { useState, useEffect } from 'react'
import { Search, ShoppingCart, Plus, Filter, Package } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useCustomerCartStore from '../../store/customerCartStore'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const MedicineStorePage = () => {
  const navigate = useNavigate()
  const [medicines, setMedicines] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [categories, setCategories] = useState([])

  const { addItem, getItemsCount, isInCart, getCartItemQuantity } = useCustomerCartStore()

  // DEBUG: Log when component mounts
  console.log('🔍 MedicineStorePage mounted')

  useEffect(() => {
    console.log('🔍 MedicineStorePage useEffect triggered')
    loadMedicines()
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('medicines')
        .select('category')
        .not('category', 'is', null)
        .order('category')

      if (error) throw error

      // Extract unique categories
      const uniqueCategories = [...new Set(data.map(m => m.category).filter(Boolean))]
      setCategories(uniqueCategories)
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadMedicines = async () => {
    try {
      setLoading(true)
      console.log('🔍 Loading medicines...') // DEBUG
      console.log('🔍 Current loading state:', true) // DEBUG
      
      // Fetch medicines with available stock
      const { data: medicinesData, error: medError } = await supabase
        .from('medicines')
        .select(`
          *,
          medicine_batches (
            id,
            batch_number,
            expiry_date,
            mrp,
            selling_price,
            current_quantity,
            rack_location
          )
        `)
        .eq('status', 'active')
        .order('name')

      console.log('🔍 Medicines data received:', medicinesData?.length || 0, 'medicines') // DEBUG
      console.log('🔍 Raw medicines data:', medicinesData) // DEBUG
      console.log('🔍 Medicine error:', medError) // DEBUG
      if (medError) {
        console.error('❌ Medicine load error:', medError) // DEBUG
        console.error('❌ Error details:', JSON.stringify(medError, null, 2)) // DEBUG
        toast.error(`Failed to load medicines: ${medError.message}`)
        setMedicines([])
        setLoading(false)
        return
      }

      if (!medicinesData || medicinesData.length === 0) {
        console.log('⚠️ No medicines found in database') // DEBUG
        setMedicines([])
        setLoading(false)
        return
      }

      // Filter medicines with available stock and valid batches
      const availableMedicines = medicinesData
        .map(medicine => {
          // Get batches with stock and not expired
          const validBatches = (medicine.medicine_batches || []).filter(batch => {
            const isNotExpired = new Date(batch.expiry_date) > new Date()
            const hasStock = batch.current_quantity > 0
            return isNotExpired && hasStock
          })

          if (validBatches.length === 0) return null

          // Sort batches by expiry date (earliest first) to sell FEFO
          validBatches.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))

          return {
            ...medicine,
            availableBatches: validBatches,
            defaultBatch: validBatches[0], // Use earliest expiring batch
            totalStock: validBatches.reduce((sum, batch) => sum + batch.current_quantity, 0)
          }
        })
        .filter(Boolean) // Remove nulls

      setMedicines(availableMedicines)
      console.log('✅ Available medicines after filtering:', availableMedicines.length) // DEBUG
    } catch (error) {
      console.error('❌ Error loading medicines:', error)
      toast.error('Failed to load medicines')
      setMedicines([])
    } finally {
      setLoading(false)
    }
  }

  const filteredMedicines = medicines.filter(medicine => {
    const matchesSearch = 
      medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (medicine.generic_name && medicine.generic_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (medicine.composition && medicine.composition.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory = categoryFilter === 'all' || medicine.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  const handleAddToCart = (medicine) => {
    try {
      const batch = medicine.defaultBatch

      // Check if already in cart
      if (isInCart(medicine.id, batch.id)) {
        const currentQty = getCartItemQuantity(medicine.id, batch.id)
        if (currentQty >= batch.current_quantity) {
          toast.error(`Maximum available quantity is ${batch.current_quantity}`)
          return
        }
      }

      addItem(medicine, batch, 1)
      toast.success(`${medicine.name} added to cart`)
    } catch (error) {
      toast.error('Failed to add to cart')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search and Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by medicine name, generic name, or composition..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="sm:w-64">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Medicine Grid Section */}
      <div>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
          </div>
        ) : filteredMedicines.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No medicines found</h3>
            <p className="text-gray-600">
              {searchTerm ? 'Try adjusting your search or filters' : 'No medicines available at the moment'}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Showing {filteredMedicines.length} medicine{filteredMedicines.length !== 1 ? 's' : ''}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredMedicines.map((medicine) => (
                <div
                  key={medicine.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
                >
                  {/* Medicine Header */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <h3 className="font-semibold text-gray-900 text-lg mb-1 line-clamp-2">
                      {medicine.name}
                    </h3>
                    {medicine.generic_name && (
                      <p className="text-xs text-gray-600 line-clamp-1">{medicine.generic_name}</p>
                    )}
                    {medicine.category && (
                      <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {medicine.category}
                      </span>
                    )}
                  </div>

                  {/* Medicine Details */}
                  <div className="p-4 space-y-2">
                    {medicine.manufacturer && (
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">Manufacturer:</span> {medicine.manufacturer}
                      </div>
                    )}

                    {medicine.strength && (
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">Strength:</span> {medicine.strength}
                      </div>
                    )}

                    {medicine.dosage_form && (
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">Form:</span> {medicine.dosage_form}
                      </div>
                    )}

                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Available:</span>{' '}
                      <span className={medicine.totalStock > 10 ? 'text-green-600' : 'text-orange-600'}>
                        {medicine.totalStock} units
                      </span>
                    </div>

                    {medicine.prescription_required && (
                      <div className="inline-flex items-center px-2 py-1 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                        ⚕️ Prescription Required
                      </div>
                    )}

                    {/* Pricing */}
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-2xl font-bold text-gray-900">
                            ₹{medicine.defaultBatch.selling_price.toFixed(2)}
                          </span>
                          {medicine.defaultBatch.mrp > medicine.defaultBatch.selling_price && (
                            <span className="ml-2 text-sm text-gray-500 line-through">
                              ₹{medicine.defaultBatch.mrp.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      {medicine.gst_percentage > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          GST: {medicine.gst_percentage}%
                        </p>
                      )}
                    </div>

                    {/* Add to Cart Button */}
                    <button
                      onClick={() => handleAddToCart(medicine)}
                      disabled={isInCart(medicine.id, medicine.defaultBatch.id) && 
                               getCartItemQuantity(medicine.id, medicine.defaultBatch.id) >= medicine.totalStock}
                      className="w-full mt-3 bg-blue-900 text-white py-2 px-4 rounded-lg hover:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span>
                        {isInCart(medicine.id, medicine.defaultBatch.id)
                          ? 'Add More'
                          : 'Add to Cart'}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default MedicineStorePage
