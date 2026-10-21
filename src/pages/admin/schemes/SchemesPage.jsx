import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, AlertCircle, Check, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'
import SchemeModal from './SchemeModal'

const SchemesPage = () => {
  const [schemes, setSchemes] = useState([])
  const [medicines, setMedicines] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingScheme, setEditingScheme] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchSchemes()
    fetchMedicines()
  }, [])

  const fetchSchemes = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('schemes')
        .select('*, qualifying_product:medicines!qualifying_product_id(name), free_product:medicines!free_product_id(name)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSchemes(data || [])
    } catch (error) {
      console.error('Error fetching schemes:', error)
      toast.error('Failed to load schemes')
    } finally {
      setLoading(false)
    }
  }

  const fetchMedicines = async () => {
    try {
      const { data, error } = await supabase
        .from('medicines')
        .select('id, name')
        .eq('status', 'active')
        .order('name')

      if (error) throw error
      setMedicines(data || [])
    } catch (error) {
      console.error('Error fetching medicines:', error)
    }
  }

  const handleAddScheme = () => {
    setEditingScheme(null)
    setShowModal(true)
  }

  const handleEditScheme = (scheme) => {
    setEditingScheme(scheme)
    setShowModal(true)
  }

  const handleDeleteScheme = async (schemeId) => {
    if (!window.confirm('Are you sure you want to delete this scheme?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('schemes')
        .delete()
        .eq('id', schemeId)

      if (error) throw error
      toast.success('Scheme deleted successfully')
      fetchSchemes()
    } catch (error) {
      console.error('Error deleting scheme:', error)
      toast.error('Failed to delete scheme')
    }
  }

  const handleToggleActive = async (scheme) => {
    try {
      const { error } = await supabase
        .from('schemes')
        .update({ is_active: !scheme.is_active })
        .eq('id', scheme.id)

      if (error) throw error
      toast.success(`Scheme ${!scheme.is_active ? 'activated' : 'deactivated'}`)
      fetchSchemes()
    } catch (error) {
      console.error('Error updating scheme:', error)
      toast.error('Failed to update scheme')
    }
  }

  const handleSaveScheme = async (schemeData) => {
    try {
      // Get current user ID from auth
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        toast.error('Authentication error. Please log in again.')
        return
      }

      // For updates: don't include created_by, only updated_by
      // For inserts: include both created_by and updated_by
      const payload = editingScheme
        ? {
            ...schemeData,
            updated_by: user.id
            // DO NOT include created_by on update
          }
        : {
            ...schemeData,
            created_by: user.id,
            updated_by: user.id
          }

      if (editingScheme) {
        const { error } = await supabase
          .from('schemes')
          .update(payload)
          .eq('id', editingScheme.id)

        if (error) {
          console.error('Update error:', error)
          throw error
        }
        toast.success('Scheme updated successfully')
      } else {
        const { error } = await supabase
          .from('schemes')
          .insert(payload)

        if (error) {
          console.error('Insert error:', error)
          throw error
        }
        toast.success('Scheme created successfully')
      }

      setShowModal(false)
      fetchSchemes()
    } catch (error) {
      console.error('Error saving scheme:', error)
      toast.error(error.message || 'Failed to save scheme')
    }
  }

  const filteredSchemes = schemes.filter(scheme =>
    scheme.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    scheme.qualifying_product?.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const isSchemeActive = (scheme) => {
    const today = new Date()
    const startDate = new Date(scheme.start_date)
    const endDate = new Date(scheme.end_date)
    return scheme.is_active && today >= startDate && today <= endDate
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Scheme Management</h1>
            <button
              onClick={handleAddScheme}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Add Scheme
            </button>
          </div>
          <p className="text-gray-600">Manage buy-get-free and promotional schemes</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search schemes by name or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : filteredSchemes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchTerm ? 'No schemes found matching your search' : 'No schemes created yet. Add one to get started!'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Scheme Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Product</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Buy</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Get Free</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Valid Period</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSchemes.map(scheme => {
                    const active = isSchemeActive(scheme)
                    const today = new Date()
                    const endDate = new Date(scheme.end_date)
                    const isExpired = today > endDate

                    return (
                      <tr key={scheme.id} className={isExpired ? 'bg-gray-50 opacity-60' : ''}>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{scheme.name}</p>
                            <p className="text-sm text-gray-500">{scheme.scheme_type}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {scheme.qualifying_product?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {scheme.minimum_quantity} {scheme.unit_of_measure}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <div>
                            <p>{scheme.free_quantity} {scheme.unit_of_measure}</p>
                            {scheme.free_product_id !== scheme.qualifying_product_id && (
                              <p className="text-xs text-blue-600">{scheme.free_product?.name}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <div>
                            <p>{new Date(scheme.start_date).toLocaleDateString()}</p>
                            <p className="text-xs text-gray-500">to {new Date(scheme.end_date).toLocaleDateString()}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {active ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <Check className="w-3 h-3" />
                                Active
                              </span>
                            ) : isExpired ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <X className="w-3 h-3" />
                                Expired
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                <AlertCircle className="w-3 h-3" />
                                Inactive
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditScheme(scheme)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Edit scheme"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(scheme)}
                              className={`p-2 rounded-lg ${
                                scheme.is_active
                                  ? 'text-yellow-600 hover:bg-yellow-50'
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={scheme.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {scheme.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleDeleteScheme(scheme.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Delete scheme"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        {schemes.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">Total Schemes</p>
              <p className="text-2xl font-bold text-gray-900">{schemes.length}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">Active Now</p>
              <p className="text-2xl font-bold text-green-600">
                {schemes.filter(isSchemeActive).length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">Expired</p>
              <p className="text-2xl font-bold text-red-600">
                {schemes.filter(s => new Date() > new Date(s.end_date)).length}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <SchemeModal
          scheme={editingScheme}
          medicines={medicines}
          onSave={handleSaveScheme}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

export default SchemesPage
