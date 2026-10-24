import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Search, Pill, Users, Package, ShoppingCart, ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const GlobalSearchResults = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const query = searchParams.get('q') || ''
  
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState({
    medicines: [],
    customers: [],
    wholesalers: [],
    purchases: []
  })

  useEffect(() => {
    if (query.trim()) {
      searchGlobally()
    }
  }, [query])

  const searchGlobally = async () => {
    try {
      setLoading(true)
      const searchTerm = query.toLowerCase()

      const [medicinesRes, customersRes, wholesalersRes, purchasesRes] = await Promise.all([
        supabase
          .from('medicines')
          .select('id, name, generic_name, brand, strength')
          .or(`name.ilike.%${query}%,generic_name.ilike.%${query}%,brand.ilike.%${query}%`)
          .limit(10),
        
        supabase
          .from('customers')
          .select('id, name, phone, email')
          .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(10),
        
        supabase
          .from('wholesalers')
          .select('id, business_name, owner_name, phone')
          .or(`business_name.ilike.%${query}%,owner_name.ilike.%${query}%,phone.ilike.%${query}%`)
          .limit(10),
        
        supabase
          .from('purchases')
          .select('id, invoice_number, supplier_id, total')
          .or(`invoice_number.ilike.%${query}%`)
          .limit(10)
      ])

      setResults({
        medicines: medicinesRes.data || [],
        customers: customersRes.data || [],
        wholesalers: wholesalersRes.data || [],
        purchases: purchasesRes.data || []
      })
    } catch (error) {
      console.error('Error searching:', error)
      toast.error('Error performing search')
    } finally {
      setLoading(false)
    }
  }

  const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Search Results</h1>
          <p className="text-gray-600">
            {loading ? 'Searching...' : `Found ${totalResults} result${totalResults !== 1 ? 's' : ''} for "${query}"`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Searching across all sections...</p>
        </div>
      ) : totalResults === 0 ? (
        <div className="text-center py-12 card">
          <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No results found</h3>
          <p className="text-gray-600">Try searching with different keywords</p>
        </div>
      ) : (
        <div className="space-y-6">
          {results.medicines.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Pill className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Medicines ({results.medicines.length})</h2>
              </div>
              <div className="space-y-2">
                {results.medicines.map(medicine => (
                  <div
                    key={medicine.id}
                    onClick={() => navigate(`/admin/medicines?search=${query}`)}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-blue-50 cursor-pointer transition"
                  >
                    <p className="font-medium text-gray-900">{medicine.name}</p>
                    <p className="text-sm text-gray-600">{medicine.generic_name}</p>
                    <p className="text-xs text-gray-500">{medicine.brand} • {medicine.strength}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.customers.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">Customers ({results.customers.length})</h2>
              </div>
              <div className="space-y-2">
                {results.customers.map(customer => (
                  <div
                    key={customer.id}
                    onClick={() => navigate(`/admin/customers?search=${query}`)}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-green-50 cursor-pointer transition"
                  >
                    <p className="font-medium text-gray-900">{customer.name}</p>
                    <p className="text-sm text-gray-600">{customer.phone}</p>
                    {customer.email && <p className="text-xs text-gray-500">{customer.email}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.wholesalers.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingCart className="h-5 w-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">Wholesalers ({results.wholesalers.length})</h2>
              </div>
              <div className="space-y-2">
                {results.wholesalers.map(wholesaler => (
                  <div
                    key={wholesaler.id}
                    onClick={() => navigate(`/admin/wholesalers?search=${query}`)}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-purple-50 cursor-pointer transition"
                  >
                    <p className="font-medium text-gray-900">{wholesaler.business_name}</p>
                    <p className="text-sm text-gray-600">{wholesaler.owner_name}</p>
                    <p className="text-xs text-gray-500">{wholesaler.phone}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.purchases.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-orange-600" />
                <h2 className="text-lg font-semibold text-gray-900">Purchases ({results.purchases.length})</h2>
              </div>
              <div className="space-y-2">
                {results.purchases.map(purchase => (
                  <div
                    key={purchase.id}
                    onClick={() => navigate(`/admin/purchases?search=${query}`)}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-orange-50 cursor-pointer transition"
                  >
                    <p className="font-medium text-gray-900">Invoice: {purchase.invoice_number}</p>
                    <p className="text-sm text-gray-600">Rs. {purchase.total?.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default GlobalSearchResults


