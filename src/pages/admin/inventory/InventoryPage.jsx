import React, { useState, useEffect } from 'react'
import { Package, AlertTriangle, Clock, TrendingUp, Search, Filter, Eye, Edit, Plus } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

const InventoryPage = () => {
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [stockFilter, setStockFilter] = useState('all')
  const [expiryFilter, setExpiryFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [medicines, setMedicines] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [formData, setFormData] = useState({
    medicine_id: '',
    supplier_id: '',
    batch_number: '',
    manufacturing_date: '',
    expiry_date: '',
    initial_quantity: '',
    free_quantity: 0,
    supplier_purchase_price: '',
    purchase_price: '',
    mrp: '',
    selling_price: '',
    wholesale_price: '',
    gst_percentage: 12,
    rack_location: ''
  })
  const [selectedMedicineInventory, setSelectedMedicineInventory] = useState([])
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStock: 0,
    expiringSoon: 0,
    stockValue: 0
  })

  useEffect(() => {
    fetchInventory()
  }, [searchTerm, stockFilter, expiryFilter])

  useEffect(() => {
    if (showAddModal) {
      fetchMedicines()
      fetchSuppliers()
    }
  }, [showAddModal])

  useEffect(() => {
    if (formData.medicine_id) {
      fetchExistingInventory(formData.medicine_id)
    }
  }, [formData.medicine_id])

  const fetchInventory = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('inventory_view')
        .select('*')
        .order('name')

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,generic_name.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%`)
      }

      if (stockFilter !== 'all') {
        query = query.eq('stock_status', stockFilter)
      }

      if (expiryFilter !== 'all') {
        query = query.eq('expiry_status', expiryFilter)
      }

      const { data, error } = await query

      if (error) throw error

      setInventory(data || [])
      
      const totalItems = data?.length || 0
      const lowStock = data?.filter(item => item.stock_status === 'low_stock').length || 0
      const expiringSoon = data?.filter(item => item.expiry_status === 'expiring_soon').length || 0
      const stockValue = data?.reduce((total, item) => {
        return total + (item.current_quantity * item.purchase_price)
      }, 0) || 0

      setStats({
        totalItems,
        lowStock,
        expiringSoon,
        stockValue
      })
      
    } catch (error) {
      console.error('Error fetching inventory:', error)
      toast.error('Error loading inventory')
    } finally {
      setLoading(false)
    }
  }

  const fetchMedicines = async () => {
    try {
      const { data, error } = await supabase
        .from('medicines')
        .select('id, name, generic_name, brand, strength, dosage_form')
        .order('name')

      if (error) throw error
      setMedicines(data || [])
    } catch (error) {
      console.error('Error fetching medicines:', error)
      toast.error('Error loading medicines')
    }
  }

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('wholesalers')
        .select('id, business_name')
        .eq('status', 'active')
        .order('business_name')

      if (error) throw error
      setSuppliers(data || [])
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    }
  }

  const fetchExistingInventory = async (medicineId) => {
    try {
      const { data, error } = await supabase
        .from('medicine_batches')
        .select(`*,
          supplier:wholesalers(business_name, drug_license_number)`)
        .eq('medicine_id', medicineId)
        .gt('current_quantity', 0)
        .order('expiry_date', { ascending: true })

      if (error) throw error
      setSelectedMedicineInventory(data || [])
    } catch (error) {
      console.error('Error fetching existing inventory:', error)
      setSelectedMedicineInventory([])
    }
  }

  const handleAddInventory = async (e) => {
    e.preventDefault()
    
    try {
      // Validation
      if (!formData.medicine_id) {
        toast.error('Please select a medicine')
        return
      }
      if (!formData.batch_number) {
        toast.error('Please enter batch number')
        return
      }
      if (!formData.expiry_date) {
        toast.error('Please enter expiry date')
        return
      }
      if (!formData.initial_quantity) {
        toast.error('Please enter initial quantity')
        return
      }
      if (!formData.supplier_purchase_price || !formData.purchase_price || !formData.mrp || !formData.selling_price || !formData.wholesale_price) {
        toast.error('Please enter all pricing information')
        return
      }

      const expiryDate = new Date(formData.expiry_date)
      if (expiryDate <= new Date()) {
        toast.error('Expiry date must be in the future')
        return
      }

      if (formData.manufacturing_date) {
        const manufacturingDate = new Date(formData.manufacturing_date)
        if (manufacturingDate >= expiryDate) {
          toast.error('Manufacturing date must be before expiry date')
          return
        }
      }

      if (formData.selling_price > formData.mrp) {
        toast.error('Selling price cannot be greater than MRP')
        return
      }

      // Check if batch already exists
      const { data: existing } = await supabase
        .from('medicine_batches')
        .select('id')
        .eq('medicine_id', formData.medicine_id)
        .eq('batch_number', formData.batch_number)
        .single()

      if (existing) {
        toast.error('Batch number already exists for this medicine')
        return
      }

      const batchData = {
        medicine_id: formData.medicine_id,
        supplier_id: formData.supplier_id || null,
        batch_number: formData.batch_number,
        manufacturing_date: formData.manufacturing_date || null,
        expiry_date: formData.expiry_date,
        current_quantity: parseInt(formData.initial_quantity),
        free_quantity: parseInt(formData.free_quantity) || 0,
        supplier_purchase_price: parseFloat(formData.supplier_purchase_price),
        purchase_price: parseFloat(formData.purchase_price),
        mrp: parseFloat(formData.mrp),
        selling_price: parseFloat(formData.selling_price),
        wholesale_price: parseFloat(formData.wholesale_price),
        gst_percentage: parseInt(formData.gst_percentage),
        rack_location: formData.rack_location || null,
        created_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('medicine_batches')
        .insert(batchData)

      if (error) throw error

      toast.success('Inventory added successfully')
      setShowAddModal(false)
      setFormData({
        medicine_id: '',
        supplier_id: '',
        batch_number: '',
        manufacturing_date: '',
        expiry_date: '',
        initial_quantity: '',
        free_quantity: 0,
        supplier_purchase_price: '',
        purchase_price: '',
        mrp: '',
        selling_price: '',
        wholesale_price: '',
        gst_percentage: 12,
        rack_location: ''
      })
      setSelectedMedicineInventory([])
      fetchInventory()
    } catch (error) {
      console.error('Error adding inventory:', error)
      toast.error(error.message || 'Error adding inventory')
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleNumberInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value ? parseFloat(value) : ''
    }))
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-IN')
  }

  const StatusBadge = ({ status, text }) => {
    const statusColors = {
      'in_stock': 'bg-green-100 text-green-800',
      'low_stock': 'bg-yellow-100 text-yellow-800',
      'out_of_stock': 'bg-red-100 text-red-800',
      'good': 'bg-green-100 text-green-800',
      'expiring_soon': 'bg-yellow-100 text-yellow-800',
      'expired': 'bg-red-100 text-red-800'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}>
        {text}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600">Monitor stock levels, expiry dates, and inventory movements</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Inventory
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Stock Items</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalItems.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-gray-900">{stats.lowStock}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Clock className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-gray-900">{stats.expiringSoon}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Stock Value</p>
              <p className="text-2xl font-bold text-gray-900">₹{stats.stockValue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search medicines by name, generic name, or brand..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          <div className="sm:w-48">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">All Stock Status</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>

          <div className="sm:w-48">
            <select
              value={expiryFilter}
              onChange={(e) => setExpiryFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">All Expiry Status</option>
              <option value="good">Good</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Medicine Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Batch Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expiry Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pricing
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Supplier
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inventory.map((item) => (
                    <tr key={`${item.medicine_id}-${item.batch_id}`} className="table-row">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.generic_name} • {item.brand}
                          </div>
                          <div className="text-xs text-gray-400">
                            {item.dosage_form} • {item.strength}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          Batch: {item.batch_number}
                        </div>
                        <div className="text-sm text-gray-500">
                          Mfg: {formatDate(item.manufacturing_date)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Exp: {formatDate(item.expiry_date)}
                        </div>
                        {item.rack_location && (
                          <div className="text-xs text-gray-400">
                            Location: {item.rack_location}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <StatusBadge 
                            status={item.stock_status}
                            text={
                              item.stock_status === 'in_stock' ? `${item.current_quantity} units` :
                              item.stock_status === 'low_stock' ? `${item.current_quantity} units (Low)` :
                              'Out of Stock'
                            }
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge 
                          status={item.expiry_status}
                          text={
                            item.expiry_status === 'good' ? 'Good' :
                            item.expiry_status === 'expiring_soon' ? 'Expiring Soon' :
                            item.expiry_status === 'expired' ? 'Expired' :
                            'Unknown'
                          }
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div>Customer: ₹{item.customer_price?.toFixed(2) || item.selling_price?.toFixed(2)}</div>
                          <div className="text-gray-500">Wholesale: ₹{item.wholesale_price?.toFixed(2)}</div>
                          <div className="text-gray-400">Purchase: ₹{item.purchase_price?.toFixed(2)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {item.supplier_name || 'N/A'}
                        </div>
                        {item.supplier_drug_reg && (
                          <div className="text-xs text-gray-400">
                            Reg: {item.supplier_drug_reg}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {inventory.length === 0 && (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No inventory found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || stockFilter !== 'all' || expiryFilter !== 'all'
                    ? 'Try adjusting your search criteria' 
                    : 'No medicines with stock available. Add medicine batches to see inventory here.'
                  }
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Inventory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-900">Add New Inventory</h2>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setSelectedMedicineInventory([])
                  setFormData({
                    medicine_id: '',
                    supplier_id: '',
                    batch_number: '',
                    manufacturing_date: '',
                    expiry_date: '',
                    initial_quantity: '',
                    free_quantity: 0,
                    supplier_purchase_price: '',
                    purchase_price: '',
                    mrp: '',
                    selling_price: '',
                    wholesale_price: '',
                    gst_percentage: 12,
                    rack_location: ''
                  })
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddInventory} className="p-6 space-y-6">
              {/* Existing Inventory Alert */}
              {selectedMedicineInventory.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-3 flex items-center">
                    <Package className="h-4 w-4 mr-2" />
                    Existing Inventory
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedMedicineInventory.map((inv) => (
                      <div key={inv.id} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-blue-100">
                        <div>
                          <span className="font-medium text-gray-900">Batch: {inv.batch_number}</span>
                          <span className="text-gray-500 mx-2">•</span>
                          <span className="text-gray-600">Qty: {inv.current_quantity}</span>
                          {inv.supplier && (
                            <>
                              <span className="text-gray-500 mx-2">•</span>
                              <span className="text-gray-600">{inv.supplier.business_name}</span>
                            </>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-gray-900">₹{inv.supplier_purchase_price?.toFixed(2) || inv.purchase_price?.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">
                            Exp: {inv.expiry_date ? new Date(inv.expiry_date).toLocaleDateString('en-IN') : 'N/A'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Medicine Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Select Medicine</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medicine *
                  </label>
                  <select
                    name="medicine_id"
                    value={formData.medicine_id}
                    onChange={handleInputChange}
                    className="input-field w-full"
                  >
                    <option value="">Select a medicine</option>
                    {medicines.map(med => (
                      <option key={med.id} value={med.id}>
                        {med.name} - {med.generic_name} ({med.strength})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Batch Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Batch Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Batch Number *
                    </label>
                    <input
                      type="text"
                      name="batch_number"
                      value={formData.batch_number}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder="Enter batch number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Supplier
                    </label>
                    <select
                      name="supplier_id"
                      value={formData.supplier_id}
                      onChange={handleInputChange}
                      className="input-field"
                    >
                      <option value="">Select supplier</option>
                      {suppliers.map(sup => (
                        <option key={sup.id} value={sup.id}>
                          {sup.business_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Manufacturing Date
                    </label>
                    <input
                      type="date"
                      name="manufacturing_date"
                      value={formData.manufacturing_date}
                      onChange={handleInputChange}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expiry Date *
                    </label>
                    <input
                      type="date"
                      name="expiry_date"
                      value={formData.expiry_date}
                      onChange={handleInputChange}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rack Location
                    </label>
                    <input
                      type="text"
                      name="rack_location"
                      value={formData.rack_location}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder="e.g., A1, B2, Shelf-3"
                    />
                  </div>
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Quantity</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Initial Quantity *
                    </label>
                    <input
                      type="number"
                      name="initial_quantity"
                      value={formData.initial_quantity}
                      onChange={handleNumberInputChange}
                      className="input-field"
                      placeholder="Enter quantity"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Free Quantity
                    </label>
                    <input
                      type="number"
                      name="free_quantity"
                      value={formData.free_quantity}
                      onChange={handleNumberInputChange}
                      className="input-field"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Pricing</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Wholesaler Purchase Price * <span className="text-xs text-gray-500">(Price from this supplier)</span>
                    </label>
                    <input
                      type="number"
                      name="supplier_purchase_price"
                      value={formData.supplier_purchase_price}
                      onChange={handleNumberInputChange}
                      className="input-field"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Standard Purchase Price * <span className="text-xs text-gray-500">(For accounting)</span>
                    </label>
                    <input
                      type="number"
                      name="purchase_price"
                      value={formData.purchase_price}
                      onChange={handleNumberInputChange}
                      className="input-field"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      MRP *
                    </label>
                    <input
                      type="number"
                      name="mrp"
                      value={formData.mrp}
                      onChange={handleNumberInputChange}
                      className="input-field"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selling Price * <span className="text-xs text-gray-500">(Retail/Customer)</span>
                    </label>
                    <input
                      type="number"
                      name="selling_price"
                      value={formData.selling_price}
                      onChange={handleNumberInputChange}
                      className="input-field"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Wholesale Price *
                    </label>
                    <input
                      type="number"
                      name="wholesale_price"
                      value={formData.wholesale_price}
                      onChange={handleNumberInputChange}
                      className="input-field"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GST Rate (%)
                    </label>
                    <select
                      name="gst_percentage"
                      value={formData.gst_percentage}
                      onChange={handleInputChange}
                      className="input-field"
                    >
                      <option value={0}>0%</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setSelectedMedicineInventory([])
                    setFormData({
                      medicine_id: '',
                      supplier_id: '',
                      batch_number: '',
                      manufacturing_date: '',
                      expiry_date: '',
                      initial_quantity: '',
                      free_quantity: 0,
                      supplier_purchase_price: '',
                      purchase_price: '',
                      mrp: '',
                      selling_price: '',
                      wholesale_price: '',
                      gst_percentage: 12,
                      rack_location: ''
                    })
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Add Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryPage
