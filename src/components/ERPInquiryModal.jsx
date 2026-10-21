import React, { useState } from 'react'
import { X, Send, Building, User, Phone, Mail, MapPin, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const ERPInquiryModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    businessName: '',
    phone: '',
    email: '',
    location: '',
    additionalRequirements: ''
  })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      toast.error('Please enter your full name')
      return false
    }

    if (!formData.businessName.trim()) {
      toast.error('Please enter your business/store name')
      return false
    }

    if (!formData.phone.trim()) {
      toast.error('Please enter your phone number')
      return false
    }

    const phoneRegex = /^[0-9]{10}$/
    if (!phoneRegex.test(formData.phone.replace(/\D/g, ''))) {
      toast.error('Please enter a valid 10-digit phone number')
      return false
    }

    if (!formData.email.trim()) {
      toast.error('Please enter your email address')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address')
      return false
    }

    if (!formData.location.trim()) {
      toast.error('Please enter your location')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('erp_inquiries')
        .insert({
          full_name: formData.fullName,
          business_name: formData.businessName,
          phone: formData.phone,
          email: formData.email,
          location: formData.location,
          additional_requirements: formData.additionalRequirements || null,
          inquiry_status: 'new'
        })

      if (error) throw error

      toast.success('Thank you! Your inquiry has been submitted successfully.')
      
      // Reset form
      setFormData({
        fullName: '',
        businessName: '',
        phone: '',
        email: '',
        location: '',
        additionalRequirements: ''
      })

      // Close modal after short delay
      setTimeout(() => {
        onClose()
      }, 1500)

    } catch (error) {
      console.error('Error submitting inquiry:', error)
      toast.error('Failed to submit inquiry. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-t-lg">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <h2 className="text-2xl font-bold mb-2">Purchase ERP Software</h2>
            <p className="text-blue-100">Get our complete pharmacy management system for your business</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>

            {/* Business/Store Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medical Store / Business Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your business/store name"
                  required
                />
              </div>
            </div>

            {/* Phone & Email in Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="10-digit mobile number"
                    required
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location (City/State) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="City, State"
                  required
                />
              </div>
            </div>

            {/* Additional Requirements */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Requirements (Optional)
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none">
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
                <textarea
                  name="additionalRequirements"
                  value={formData.additionalRequirements}
                  onChange={handleChange}
                  rows="4"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tell us about your specific requirements, number of users, existing system, etc."
                />
              </div>
            </div>

            {/* Features List */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">What You Get:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✓ Complete POS & Billing System</li>
                <li>✓ Inventory & Stock Management</li>
                <li>✓ Customer & Supplier Management</li>
                <li>✓ GST Compliant Invoicing</li>
                <li>✓ Reports & Analytics</li>
                <li>✓ Online Customer Portal</li>
                <li>✓ Multiple Payment Integrations</li>
                <li>✓ Training & Support Included</li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-900 text-white py-3 px-4 rounded-lg hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center font-semibold"
            >
              {loading ? (
                'Submitting...'
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Submit Inquiry
                </>
              )}
            </button>

            {/* Contact Info */}
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-gray-600 mb-2">Or contact us directly:</p>
              <p className="text-sm">
                <a href="tel:+447747571513" className="text-blue-900 hover:underline font-medium">
                  +44 7747 571513
                </a>
                {' '} • {' '}
                <a href="mailto:support@billsprout.online" className="text-blue-900 hover:underline font-medium">
                  support@billsprout.online
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ERPInquiryModal
