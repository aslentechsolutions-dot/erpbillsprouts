import React, { useState, useEffect } from 'react'
import { Search, ChevronUp, ChevronDown, Filter, Download, Eye, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const FreeTrials = () => {
  const [freeTrials, setFreeTrials] = useState([])
  const [filteredTrials, setFilteredTrials] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' })
  const [filterPlan, setFilterPlan] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedTrial, setSelectedTrial] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    thisMonth: 0,
    active: 0,
    byPlan: { basic: 0, professional: 0, gold: 0 }
  })

  useEffect(() => {
    fetchFreeTrials()
  }, [])

  useEffect(() => {
    filterAndSortTrials()
    calculateStats()
  }, [freeTrials, searchTerm, sortConfig, filterPlan, filterStatus])

  const fetchFreeTrials = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('free_trials')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching free trials:', error)
        toast.error('Failed to load free trials')
      } else {
        setFreeTrials(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('An error occurred while fetching data')
    } finally {
      setIsLoading(false)
    }
  }

  const calculateStats = () => {
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const total = freeTrials.length
    const thisMonth = freeTrials.filter(trial => {
      const createdDate = new Date(trial.created_at)
      return createdDate >= thisMonthStart
    }).length
    const active = freeTrials.filter(trial => trial.status === 'active').length
    
    const byPlan = {
      basic: freeTrials.filter(trial => trial.selected_plan === 'basic').length,
      professional: freeTrials.filter(trial => trial.selected_plan === 'professional').length,
      gold: freeTrials.filter(trial => trial.selected_plan === 'gold').length
    }

    setStats({ total, thisMonth, active, byPlan })
  }

  const filterAndSortTrials = () => {
    let filtered = freeTrials

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(trial =>
        trial.pharmacy_name?.toLowerCase().includes(searchLower) ||
        trial.owner_name?.toLowerCase().includes(searchLower) ||
        trial.email?.toLowerCase().includes(searchLower) ||
        trial.phone_number?.includes(searchTerm) ||
        trial.city?.toLowerCase().includes(searchLower)
      )
    }

    // Plan filter
    if (filterPlan !== 'all') {
      filtered = filtered.filter(trial => trial.selected_plan === filterPlan)
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(trial => trial.status === filterStatus)
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = a[sortConfig.key]
      const bVal = b[sortConfig.key]

      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1

      if (typeof aVal === 'string') {
        const comparison = aVal.localeCompare(bVal)
        return sortConfig.direction === 'asc' ? comparison : -comparison
      }

      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0
      return sortConfig.direction === 'asc' ? comparison : -comparison
    })

    setFilteredTrials(filtered)
  }

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPlanLabel = (plan) => {
    const plans = {
      basic: 'Basic Plan',
      professional: 'Professional Plan',
      gold: 'Gold Edition'
    }
    return plans[plan] || plan
  }

  const getPlanColor = (plan) => {
    const colors = {
      basic: 'bg-blue-100 text-blue-800',
      professional: 'bg-purple-100 text-purple-800',
      gold: 'bg-amber-100 text-amber-800'
    }
    return colors[plan] || 'bg-gray-100 text-gray-800'
  }

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <ChevronUp className="w-4 h-4 text-gray-400" />
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="w-4 h-4 text-blue-600" /> : 
      <ChevronDown className="w-4 h-4 text-blue-600" />
  }

  const handleDeleteTrial = async (id) => {
    if (!window.confirm('Are you sure you want to delete this free trial record?')) return

    try {
      const { error } = await supabase
        .from('free_trials')
        .delete()
        .eq('id', id)

      if (error) {
        toast.error('Failed to delete record')
      } else {
        toast.success('Free trial record deleted')
        fetchFreeTrials()
      }
    } catch (error) {
      toast.error('An error occurred')
    }
  }

  const handleExportCSV = () => {
    if (filteredTrials.length === 0) {
      toast.error('No data to export')
      return
    }

    const headers = ['Pharmacy Name', 'Owner Name', 'Email', 'Phone', 'City', 'Address', 'Drug License', 'Selected Plan', 'Status', 'Date']
    const rows = filteredTrials.map(trial => [
      trial.pharmacy_name || '',
      trial.owner_name || '',
      trial.email || '',
      trial.phone_number || '',
      trial.city || '',
      trial.address || '',
      trial.drug_license_number || '',
      getPlanLabel(trial.selected_plan) || '',
      trial.status || 'Active',
      formatDate(trial.created_at)
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent))
    element.setAttribute('download', `free_trials_${new Date().toISOString().slice(0, 10)}.csv`)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    toast.success('Data exported successfully')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Free Trials</h1>
          <p className="text-gray-600 text-sm mt-1">
            Total registrations: <span className="font-semibold">{stats.total}</span> | 
            Showing: <span className="font-semibold">{filteredTrials.length}</span>
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-600">
          <div className="text-sm font-medium text-gray-600">Total Free Trials</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-600">
          <div className="text-sm font-medium text-gray-600">This Month</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.thisMonth}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-purple-600">
          <div className="text-sm font-medium text-gray-600">Active</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.active}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-xs font-medium text-gray-600">Basic</div>
          <div className="text-lg font-bold text-blue-600 mt-1">{stats.byPlan.basic}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-xs font-medium text-gray-600">Professional</div>
          <div className="text-lg font-bold text-purple-600 mt-1">{stats.byPlan.professional}</div>
        </div>
      </div>

      {/* Plan Breakdown Card */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Plan Breakdown</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.byPlan.basic}</div>
            <div className="text-sm text-gray-600 mt-1">Basic Plan</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.byPlan.professional}</div>
            <div className="text-sm text-gray-600 mt-1">Professional Plan</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.byPlan.gold}</div>
            <div className="text-sm text-gray-600 mt-1">Gold Edition</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by pharmacy, owner, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Plan Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">All Plans</option>
              <option value="basic">Basic Plan</option>
              <option value="professional">Professional Plan</option>
              <option value="gold">Gold Edition</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Refresh Button */}
          <div className="flex gap-2">
            <button
              onClick={fetchFreeTrials}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-2">Loading free trials...</p>
          </div>
        ) : filteredTrials.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">No free trial registrations found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('pharmacy_name')}
                  >
                    <div className="flex items-center gap-2">
                      Pharmacy Name
                      <SortIcon column="pharmacy_name" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('owner_name')}
                  >
                    <div className="flex items-center gap-2">
                      Owner
                      <SortIcon column="owner_name" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center gap-2">
                      Email
                      <SortIcon column="email" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('phone_number')}
                  >
                    <div className="flex items-center gap-2">
                      Phone
                      <SortIcon column="phone_number" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('city')}
                  >
                    <div className="flex items-center gap-2">
                      City
                      <SortIcon column="city" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('selected_plan')}
                  >
                    <div className="flex items-center gap-2">
                      Plan
                      <SortIcon column="selected_plan" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-2">
                      Date
                      <SortIcon column="created_at" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTrials.map((trial) => (
                  <tr key={trial.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{trial.pharmacy_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{trial.owner_name}</td>
                    <td className="px-6 py-4 text-sm text-blue-600 hover:underline">
                      <a href={`mailto:${trial.email}`}>{trial.email}</a>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <a href={`tel:${trial.phone_number}`} className="hover:text-blue-600">
                        {trial.phone_number}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{trial.city}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-block ${getPlanColor(trial.selected_plan)} px-3 py-1 rounded-full text-xs font-semibold`}>
                        {getPlanLabel(trial.selected_plan)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(trial.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedTrial(trial)
                            setShowDetailModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTrial(trial.id)}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedTrial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-8 my-8">
            <div className="flex justify-between items-start mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Free Trial Details</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-8">
              {/* Pharmacy Info */}
              <div className="pb-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Pharmacy Information</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-base text-gray-600 block mb-2">Pharmacy Name</label>
                    <p className="text-gray-900 font-medium text-base">{selectedTrial.pharmacy_name}</p>
                  </div>
                  <div>
                    <label className="text-base text-gray-600 block mb-2">Drug License Number</label>
                    <p className="text-gray-900 font-medium text-base">{selectedTrial.drug_license_number}</p>
                  </div>
                </div>
              </div>

              {/* Owner Info */}
              <div className="pb-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Owner Information</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-base text-gray-600 block mb-2">Owner Name</label>
                    <p className="text-gray-900 font-medium text-base">{selectedTrial.owner_name}</p>
                  </div>
                  <div>
                    <label className="text-base text-gray-600 block mb-2">Email</label>
                    <a href={`mailto:${selectedTrial.email}`} className="text-blue-600 hover:underline font-medium text-base">
                      {selectedTrial.email}
                    </a>
                  </div>
                  <div>
                    <label className="text-base text-gray-600 block mb-2">Phone Number</label>
                    <a href={`tel:${selectedTrial.phone_number}`} className="text-blue-600 hover:underline font-medium text-base">
                      {selectedTrial.phone_number}
                    </a>
                  </div>
                </div>
              </div>

              {/* Address Info */}
              <div className="pb-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Address Information</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="text-base text-gray-600 block mb-2">Address</label>
                    <p className="text-gray-900 font-medium text-base">{selectedTrial.address}</p>
                  </div>
                  <div>
                    <label className="text-base text-gray-600 block mb-2">City</label>
                    <p className="text-gray-900 font-medium text-base">{selectedTrial.city}</p>
                  </div>
                  <div>
                    <label className="text-base text-gray-600 block mb-2">State</label>
                    <p className="text-gray-900 font-medium text-base">{selectedTrial.state}</p>
                  </div>
                  <div>
                    <label className="text-base text-gray-600 block mb-2">Pincode</label>
                    <p className="text-gray-900 font-medium text-base">{selectedTrial.pincode}</p>
                  </div>
                </div>
              </div>

              {/* Plan Info */}
              <div className="pb-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Plan Information</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-base text-gray-600 block mb-2">Selected Plan</label>
                    <span className={`inline-block ${getPlanColor(selectedTrial.selected_plan)} px-4 py-2 rounded-full text-base font-semibold`}>
                      {getPlanLabel(selectedTrial.selected_plan)}
                    </span>
                  </div>
                  <div>
                    <label className="text-base text-gray-600 block mb-2">Status</label>
                    <p className="text-gray-900 font-medium text-base">{selectedTrial.status}</p>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div>
                <label className="text-base text-gray-600 block mb-2">Registered On</label>
                <p className="text-gray-900 font-medium text-base">{formatDate(selectedTrial.created_at)}</p>
              </div>
            </div>

            <div className="mt-10 flex gap-4">
              <a
                href={`tel:${selectedTrial.phone_number}`}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg text-center transition-colors"
              >
                Call
              </a>
              <a
                href={`mailto:${selectedTrial.email}`}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg text-center transition-colors"
              >
                Email
              </a>
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FreeTrials
