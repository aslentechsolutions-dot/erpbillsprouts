import React, { useState, useEffect } from 'react'
import { Search, ChevronUp, ChevronDown, Filter, Download, Eye, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const DemoRequests = () => {
  const [demoRequests, setDemoRequests] = useState([])
  const [filteredRequests, setFilteredRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' })
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    fetchDemoRequests()
  }, [])

  useEffect(() => {
    filterAndSortRequests()
  }, [demoRequests, searchTerm, sortConfig, filterStatus])

  const fetchDemoRequests = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('demo_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching demo requests:', error)
        toast.error('Failed to load demo requests')
      } else {
        setDemoRequests(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('An error occurred while fetching data')
    } finally {
      setIsLoading(false)
    }
  }

  const filterAndSortRequests = () => {
    let filtered = demoRequests

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(req =>
        req.name?.toLowerCase().includes(searchLower) ||
        req.business_name?.toLowerCase().includes(searchLower) ||
        req.email?.toLowerCase().includes(searchLower) ||
        req.mobile_number?.includes(searchTerm) ||
        req.city?.toLowerCase().includes(searchLower)
      )
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(req => req.status === filterStatus)
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

    setFilteredRequests(filtered)
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

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <ChevronUp className="w-4 h-4 text-gray-400" />
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="w-4 h-4 text-blue-600" /> : 
      <ChevronDown className="w-4 h-4 text-blue-600" />
  }

  const handleDeleteRequest = async (id) => {
    if (!window.confirm('Are you sure you want to delete this demo request?')) return

    try {
      const { error } = await supabase
        .from('demo_requests')
        .delete()
        .eq('id', id)

      if (error) {
        toast.error('Failed to delete request')
      } else {
        toast.success('Demo request deleted')
        fetchDemoRequests()
      }
    } catch (error) {
      toast.error('An error occurred')
    }
  }

  const handleExportCSV = () => {
    if (filteredRequests.length === 0) {
      toast.error('No data to export')
      return
    }

    const headers = ['Name', 'Business Name', 'Mobile', 'Email', 'City', 'Pincode', 'Business Type', 'Branches', 'Request', 'Status', 'Created Date']
    const rows = filteredRequests.map(req => [
      req.name || '',
      req.business_name || '',
      req.mobile_number || '',
      req.email || '',
      req.city || '',
      req.pincode || '',
      req.business_type || '',
      req.branches || '',
      req.specific_request || '',
      req.status || 'Pending',
      formatDate(req.created_at)
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent))
    element.setAttribute('download', `demo_requests_${new Date().toISOString().slice(0, 10)}.csv`)
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
          <h1 className="text-3xl font-bold text-gray-900">Demo Requests</h1>
          <p className="text-gray-600 text-sm mt-1">
            Total requests: <span className="font-semibold">{demoRequests.length}</span> | 
            Showing: <span className="font-semibold">{filteredRequests.length}</span>
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

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, business, email, mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Contacted">Contacted</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchDemoRequests}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-2">Loading demo requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">No demo requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Name
                      <SortIcon column="name" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('business_name')}
                  >
                    <div className="flex items-center gap-2">
                      Business Name
                      <SortIcon column="business_name" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('mobile_number')}
                  >
                    <div className="flex items-center gap-2">
                      Mobile
                      <SortIcon column="mobile_number" />
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
                    onClick={() => handleSort('city')}
                  >
                    <div className="flex items-center gap-2">
                      City
                      <SortIcon column="city" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('business_type')}
                  >
                    <div className="flex items-center gap-2">
                      Business Type
                      <SortIcon column="business_type" />
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
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{request.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{request.business_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{request.mobile_number}</td>
                    <td className="px-6 py-4 text-sm text-blue-600 hover:underline">
                      <a href={`mailto:${request.email}`}>{request.email}</a>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{request.city}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
                        {request.business_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(request.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedRequest(request)
                            setShowDetailModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRequest(request.id)}
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
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-96 max-w-[90vw] max-h-[90vh] flex flex-col box-border" style={{ boxSizing: 'border-box' }}>
            {/* Header */}
            <div className="flex justify-between items-start px-4 py-3 border-b border-gray-200 flex-shrink-0">
              <h2 style={{ fontSize: '16px' }} className="font-semibold text-gray-900">Demo Request Details</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 flex-shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 px-4 py-3" style={{ maxHeight: 'calc(90vh - 140px)' }}>
              <div className="space-y-3">
                {/* Personal Info */}
                <div className="pb-3 border-b border-gray-200">
                  <h3 style={{ fontSize: '13px' }} className="font-semibold text-gray-900 mb-2">Personal Information</h3>
                  <div className="space-y-2">
                    <div>
                      <label style={{ fontSize: '11px' }} className="text-gray-600 block mb-0.5">Name</label>
                      <p style={{ fontSize: '12px' }} className="text-gray-900 font-medium">{selectedRequest.name}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px' }} className="text-gray-600 block mb-0.5">Mobile Number</label>
                      <a href={'tel:' + selectedRequest.mobile_number} style={{ fontSize: '12px' }} className="text-blue-600 hover:underline font-medium">
                        {selectedRequest.mobile_number}
                      </a>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px' }} className="text-gray-600 block mb-0.5">Email</label>
                      <a href={'mailto:' + selectedRequest.email} style={{ fontSize: '12px' }} className="text-blue-600 hover:underline font-medium break-all">
                        {selectedRequest.email}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Business Info */}
                <div className="pb-3 border-b border-gray-200">
                  <h3 style={{ fontSize: '13px' }} className="font-semibold text-gray-900 mb-2">Business Information</h3>
                  <div className="space-y-2">
                    <div>
                      <label style={{ fontSize: '11px' }} className="text-gray-600 block mb-0.5">Business Name</label>
                      <p style={{ fontSize: '12px' }} className="text-gray-900 font-medium">{selectedRequest.business_name}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px' }} className="text-gray-600 block mb-0.5">Business Type</label>
                      <p style={{ fontSize: '12px' }} className="text-gray-900 font-medium">{selectedRequest.business_type}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px' }} className="text-gray-600 block mb-0.5">Branches</label>
                      <p style={{ fontSize: '12px' }} className="text-gray-900 font-medium">{selectedRequest.branches}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px' }} className="text-gray-600 block mb-0.5">Location</label>
                      <p style={{ fontSize: '12px' }} className="text-gray-900 font-medium">{selectedRequest.city}, {selectedRequest.pincode}</p>
                    </div>
                  </div>
                </div>

                {/* Request Details */}
                <div className="pb-3 border-b border-gray-200">
                  <h3 style={{ fontSize: '13px' }} className="font-semibold text-gray-900 mb-2">Request</h3>
                  <div>
                    <label style={{ fontSize: '11px' }} className="text-gray-600 block mb-1">Specific Request</label>
                    <p style={{ fontSize: '12px' }} className="text-gray-900 p-2 bg-gray-50 rounded text-gray-700 max-h-24 overflow-y-auto">
                      {selectedRequest.specific_request || 'No specific request provided'}
                    </p>
                  </div>
                </div>

                {/* Metadata */}
                <div>
                  <div className="space-y-2">
                    <div>
                      <label style={{ fontSize: '11px' }} className="text-gray-600 block mb-0.5">Submitted On</label>
                      <p style={{ fontSize: '12px' }} className="text-gray-900 font-medium">{formatDate(selectedRequest.created_at)}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px' }} className="text-gray-600 block mb-0.5">Status</label>
                      <p style={{ fontSize: '12px' }} className="text-gray-900 font-medium">{selectedRequest.status || 'Pending'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-2 px-4 py-3 border-t border-gray-200 flex-shrink-0" style={{ boxSizing: 'border-box' }}>
              <a
                href={'tel:' + selectedRequest.mobile_number}
                style={{ fontSize: '13px', height: '32px' }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 rounded-md text-center flex items-center justify-center transition-colors"
              >
                Call
              </a>
              <a
                href={'mailto:' + selectedRequest.email}
                style={{ fontSize: '13px', height: '32px' }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 rounded-md text-center flex items-center justify-center transition-colors"
              >
                Email
              </a>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{ fontSize: '13px', height: '32px' }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold px-3 rounded-md transition-colors"
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

export default DemoRequests
