import React, { useState, useEffect } from 'react'
import { Search, Filter, Eye, CheckCircle, XCircle, Clock, Phone, Mail, MapPin, Building, User, FileText } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

const ERPInquiriesPage = () => {
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedInquiry, setSelectedInquiry] = useState(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    loadInquiries()
  }, [])

  const loadInquiries = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('erp_inquiries')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setInquiries(data || [])
    } catch (error) {
      console.error('Error loading inquiries:', error)
      toast.error('Failed to load inquiries')
    } finally {
      setLoading(false)
    }
  }

  const updateInquiryStatus = async (inquiryId, newStatus) => {
    try {
      const { error } = await supabase
        .from('erp_inquiries')
        .update({ 
          inquiry_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', inquiryId)

      if (error) throw error

      toast.success('Inquiry status updated successfully')
      loadInquiries()
      
      // Update selected inquiry if it's being viewed
      if (selectedInquiry?.id === inquiryId) {
        setSelectedInquiry({ ...selectedInquiry, inquiry_status: newStatus })
      }
    } catch (error) {
      console.error('Error updating inquiry status:', error)
      toast.error('Failed to update inquiry status')
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-purple-100 text-purple-800',
      converted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusIcon = (status) => {
    const icons = {
      new: Clock,
      contacted: Phone,
      in_progress: FileText,
      converted: CheckCircle,
      rejected: XCircle
    }
    const Icon = icons[status] || Clock
    return <Icon className="h-4 w-4" />
  }

  const filteredInquiries = inquiries.filter(inquiry => {
    const matchesSearch = 
      inquiry.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.phone.includes(searchTerm)

    const matchesStatus = statusFilter === 'all' || inquiry.inquiry_status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusStats = () => {
    return {
      total: inquiries.length,
      new: inquiries.filter(i => i.inquiry_status === 'new').length,
      contacted: inquiries.filter(i => i.inquiry_status === 'contacted').length,
      in_progress: inquiries.filter(i => i.inquiry_status === 'in_progress').length,
      converted: inquiries.filter(i => i.inquiry_status === 'converted').length,
      rejected: inquiries.filter(i => i.inquiry_status === 'rejected').length
    }
  }

  const stats = getStatusStats()

  const viewInquiryDetails = (inquiry) => {
    setSelectedInquiry(inquiry)
    setShowDetails(true)
  }

  const closeDetails = () => {
    setShowDetails(false)
    setSelectedInquiry(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading inquiries...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ERP Inquiries</h1>
        <p className="text-gray-600">Manage customer inquiries for ERP software purchase</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-600">New</p>
          <p className="text-2xl font-bold text-blue-900">{stats.new}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-600">Contacted</p>
          <p className="text-2xl font-bold text-yellow-900">{stats.contacted}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <p className="text-sm text-purple-600">In Progress</p>
          <p className="text-2xl font-bold text-purple-900">{stats.in_progress}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-green-600">Converted</p>
          <p className="text-2xl font-bold text-green-900">{stats.converted}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-sm text-red-600">Rejected</p>
          <p className="text-2xl font-bold text-red-900">{stats.rejected}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, business, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="in_progress">In Progress</option>
              <option value="converted">Converted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inquiries Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredInquiries.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No inquiries found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Business
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInquiries.map((inquiry) => (
                  <tr key={inquiry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(inquiry.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">{inquiry.full_name}</p>
                        <p className="text-gray-600">{inquiry.phone}</p>
                        <p className="text-gray-600">{inquiry.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {inquiry.business_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {inquiry.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(inquiry.inquiry_status)}`}>
                        {getStatusIcon(inquiry.inquiry_status)}
                        <span className="ml-1 capitalize">{inquiry.inquiry_status.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => viewInquiryDetails(inquiry)}
                        className="text-blue-900 hover:text-blue-700 font-medium inline-flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetails && selectedInquiry && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={closeDetails} />
            
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="bg-blue-900 text-white p-6 rounded-t-lg">
                <h3 className="text-xl font-bold">Inquiry Details</h3>
                <p className="text-blue-100 text-sm mt-1">
                  Submitted on {new Date(selectedInquiry.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Contact Information */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <User className="h-5 w-5 mr-2 text-blue-900" />
                    Contact Information
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center text-sm">
                      <User className="h-4 w-4 mr-2 text-gray-600" />
                      <span className="font-medium text-gray-700 w-24">Name:</span>
                      <span className="text-gray-900">{selectedInquiry.full_name}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Phone className="h-4 w-4 mr-2 text-gray-600" />
                      <span className="font-medium text-gray-700 w-24">Phone:</span>
                      <a href={`tel:${selectedInquiry.phone}`} className="text-blue-900 hover:underline">
                        {selectedInquiry.phone}
                      </a>
                    </div>
                    <div className="flex items-center text-sm">
                      <Mail className="h-4 w-4 mr-2 text-gray-600" />
                      <span className="font-medium text-gray-700 w-24">Email:</span>
                      <a href={`mailto:${selectedInquiry.email}`} className="text-blue-900 hover:underline">
                        {selectedInquiry.email}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Business Information */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Building className="h-5 w-5 mr-2 text-blue-900" />
                    Business Information
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center text-sm">
                      <Building className="h-4 w-4 mr-2 text-gray-600" />
                      <span className="font-medium text-gray-700 w-24">Business:</span>
                      <span className="text-gray-900">{selectedInquiry.business_name}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <MapPin className="h-4 w-4 mr-2 text-gray-600" />
                      <span className="font-medium text-gray-700 w-24">Location:</span>
                      <span className="text-gray-900">{selectedInquiry.location}</span>
                    </div>
                  </div>
                </div>

                {/* Additional Requirements */}
                {selectedInquiry.additional_requirements && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-blue-900" />
                      Additional Requirements
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                        {selectedInquiry.additional_requirements}
                      </p>
                    </div>
                  </div>
                )}

                {/* Status Update */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Update Status</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {['new', 'contacted', 'in_progress', 'converted', 'rejected'].map((status) => (
                      <button
                        key={status}
                        onClick={() => updateInquiryStatus(selectedInquiry.id, status)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedInquiry.inquiry_status === status
                            ? getStatusColor(status)
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end">
                <button
                  onClick={closeDetails}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ERPInquiriesPage
