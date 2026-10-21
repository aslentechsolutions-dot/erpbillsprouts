import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * PatientDashboard - Now redirects to customer medicine store
 * Patient role is used for customer access to online medicine shopping
 */
const PatientDashboard = () => {
  const navigate = useNavigate()

  useEffect(() => {
    // Redirect to medicine store
    navigate('/customer/store', { replace: true })
  }, [navigate])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading medicine store...</p>
      </div>
    </div>
  )
}

export default PatientDashboard