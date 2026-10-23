import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft, Check, Eye, EyeOff } from "lucide-react"
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

const FreeTrialPage = () => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    pharmacyName: "",
    drugLicenseNumber: "",
    ownerName: "",
    email: "",
    phoneNumber: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    selectedPlan: "",
    password: "",
    confirmPassword: ""
  })
  const [errors, setErrors] = useState({})

  const plans = [
    {
      id: 'basic',
      name: 'Basic Plan',
      price: 5000,
      gst: 18,
      features: [
        '5 Users',
        '1 Branch',
        'Basic Inventory Management'
      ]
    },
    {
      id: 'professional',
      name: 'Professional Plan',
      price: 20000,
      gst: 18,
      features: [
        '5 Users',
        '5 Branches',
        'Unlimited Products',
        'Advanced Reporting'
      ]
    },
    {
      id: 'gold',
      name: 'Gold Edition',
      price: 35000,
      gst: 18,
      features: [
        'Unlimited Users',
        'Unlimited Branches',
        'Unlimited Products',
        'Premium Support'
      ]
    }
  ]

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateStep1 = () => {
    const newErrors = {}
    if (!formData.pharmacyName.trim()) newErrors.pharmacyName = "Pharmacy name is required"
    if (!formData.drugLicenseNumber.trim()) newErrors.drugLicenseNumber = "Drug License Number is required"
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = () => {
    const newErrors = {}
    if (!formData.ownerName.trim()) newErrors.ownerName = "Owner name is required"
    if (!formData.email.trim()) newErrors.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format"
    }
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = "Phone number is required"
    if (!formData.address.trim()) newErrors.address = "Address is required"
    if (!formData.city.trim()) newErrors.city = "City is required"
    if (!formData.state.trim()) newErrors.state = "State is required"
    if (!formData.pincode.trim()) newErrors.pincode = "Pincode is required"
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep3 = () => {
    const newErrors = {}
    if (!formData.selectedPlan) newErrors.selectedPlan = "Please select a plan"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep4 = () => {
    const newErrors = {}
    if (!formData.password) newErrors.password = "Password is required"
    else if (formData.password.length < 6) newErrors.password = "Password must be at least 6 characters"
    
    if (!formData.confirmPassword) newErrors.confirmPassword = "Please confirm password"
    else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    if (!agreedToTerms) newErrors.terms = "You must agree to terms and conditions"
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleContinue = async () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2)
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3)
    } else if (currentStep === 3 && validateStep3()) {
      setCurrentStep(4)
    } else if (currentStep === 4 && validateStep4()) {
      await handleRegistration()
    }
  }

  const handleRegistration = async () => {
    try {
      setLoading(true)
      
      // Save to free_trials table
      const { error } = await supabase
        .from('free_trials')
        .insert([{
          pharmacy_name: formData.pharmacyName,
          drug_license_number: formData.drugLicenseNumber,
          owner_name: formData.ownerName,
          email: formData.email,
          phone_number: formData.phoneNumber,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          selected_plan: formData.selectedPlan,
          status: 'active'
        }])

      if (error) {
        console.error('Error saving free trial:', error)
        setErrors({ submit: 'Failed to save registration. Please try again.' })
        return
      }

      toast.success('Registration successful! Please sign in with your credentials.')
      navigate('/login')
    } catch (error) {
      console.error('Registration error:', error)
      setErrors({ submit: 'An unexpected error occurred. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    } else {
      navigate("/login")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-900 text-white p-6">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-blue-800 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Business Registration</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-8">
        {/* Title */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Start Your Free Trial</h2>
          <p className="text-gray-600">Join hundreds of pharmacies using BillSprout. No credit card required</p>
        </div>

        {/* Step Progress */}
        <div className="flex justify-center gap-8 mb-12">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step < currentStep ? "bg-green-500 text-white" :
                step === currentStep ? "bg-blue-900 text-white" :
                "bg-gray-300 text-gray-600"
              }`}>
                {step < currentStep ? <Check className="w-6 h-6" /> : step}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                {step === 1 ? "Business Info" : step === 2 ? "Contact Info" : step === 3 ? "Plan Selection" : "Password"}
              </span>
              {step < 4 && <div className="hidden sm:block w-12 h-0.5 bg-gray-300"></div>}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 max-w-2xl mx-auto">
          {/* Step 1: Business Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="bg-blue-900 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">1</span>
                Business Information
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pharmacy Name *
                </label>
                <input
                  type="text"
                  name="pharmacyName"
                  value={formData.pharmacyName}
                  onChange={handleInputChange}
                  placeholder="Enter your pharmacy name"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    errors.pharmacyName ? "border-red-300" : "border-gray-300"
                  }`}
                />
                {errors.pharmacyName && <p className="text-red-600 text-sm mt-1">{errors.pharmacyName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Drug License Number *
                </label>
                <input
                  type="text"
                  name="drugLicenseNumber"
                  value={formData.drugLicenseNumber}
                  onChange={handleInputChange}
                  placeholder="Enter drug license number"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    errors.drugLicenseNumber ? "border-red-300" : "border-gray-300"
                  }`}
                />
                {errors.drugLicenseNumber && <p className="text-red-600 text-sm mt-1">{errors.drugLicenseNumber}</p>}
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleContinue}
                  className="flex-1 bg-blue-900 hover:bg-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Continue
                </button>
                <button
                  onClick={handleBack}
                  className="flex-1 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Contact Information */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="bg-blue-900 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">2</span>
                Contact Information
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Owner Name *
                </label>
                <input
                  type="text"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleInputChange}
                  placeholder="Enter owner name"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    errors.ownerName ? "border-red-300" : "border-gray-300"
                  }`}
                />
                {errors.ownerName && <p className="text-red-600 text-sm mt-1">{errors.ownerName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    errors.email ? "border-red-300" : "border-gray-300"
                  }`}
                />
                {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="+91 XXXXX XXXXX"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    errors.phoneNumber ? "border-red-300" : "border-gray-300"
                  }`}
                />
                {errors.phoneNumber && <p className="text-red-600 text-sm mt-1">{errors.phoneNumber}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address *
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter your address"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    errors.address ? "border-red-300" : "border-gray-300"
                  }`}
                />
                {errors.address && <p className="text-red-600 text-sm mt-1">{errors.address}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Enter city"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                      errors.city ? "border-red-300" : "border-gray-300"
                    }`}
                  />
                  {errors.city && <p className="text-red-600 text-sm mt-1">{errors.city}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    placeholder="Enter state"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                      errors.state ? "border-red-300" : "border-gray-300"
                    }`}
                  />
                  {errors.state && <p className="text-red-600 text-sm mt-1">{errors.state}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pincode *
                </label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleInputChange}
                  placeholder="Enter pincode"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    errors.pincode ? "border-red-300" : "border-gray-300"
                  }`}
                />
                {errors.pincode && <p className="text-red-600 text-sm mt-1">{errors.pincode}</p>}
              </div>

              <div className="text-right text-xs text-gray-500">0/6</div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleContinue}
                  className="flex-1 bg-blue-900 hover:bg-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Continue
                </button>
                <button
                  onClick={handleBack}
                  className="flex-1 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Plan Selection */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="bg-blue-900 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">3</span>
                Select Your Plan
              </h3>

              <p className="text-gray-600">Choose the plan that best fits your pharmacy's needs</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => {
                  const totalPrice = plan.price + (plan.price * plan.gst / 100)
                  const isSelected = formData.selectedPlan === plan.id
                  
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setFormData(prev => ({ ...prev, selectedPlan: plan.id }))}
                      className={`relative border-2 rounded-lg p-6 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-900 bg-blue-50'
                          : 'border-gray-300 bg-white hover:border-blue-500'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-6 h-6 bg-blue-900 text-white rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                      
                      <h4 className="text-lg font-bold text-gray-900 mb-2">{plan.name}</h4>
                      
                      <div className="mb-4">
                        <span className="text-3xl font-bold text-gray-900">₹{plan.price.toLocaleString('en-IN')}</span>
                        <div className="text-sm text-gray-600 mt-1">
                          <span>+ ₹{Math.round(plan.price * plan.gst / 100).toLocaleString('en-IN')} GST ({plan.gst}%)</span>
                          <div className="text-base font-semibold text-blue-900 mt-1">
                            Total: ₹{Math.round(totalPrice).toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>

                      <ul className="space-y-3">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                            <div className="w-1.5 h-1.5 bg-blue-900 rounded-full"></div>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>

              {errors.selectedPlan && <p className="text-red-600 text-sm">{errors.selectedPlan}</p>}

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleContinue}
                  className="flex-1 bg-blue-900 hover:bg-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Continue
                </button>
                <button
                  onClick={handleBack}
                  className="flex-1 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Create Password */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="bg-blue-900 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">4</span>
                Create Password
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter a strong password"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                      errors.password ? "border-red-300" : "border-gray-300"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-gray-400" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Re-enter your password"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                      errors.confirmPassword ? "border-red-300" : "border-gray-300"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5 text-gray-400" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-red-600 text-sm mt-1">{errors.confirmPassword}</p>}
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-gray-300"
                />
                <label htmlFor="terms" className="text-sm text-gray-700">
                  I agree to the Terms & Conditions and Privacy Policy
                </label>
              </div>
              {errors.terms && <p className="text-red-600 text-sm">{errors.terms}</p>}
              {errors.submit && <p className="text-red-600 text-sm">{errors.submit}</p>}

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleContinue}
                  disabled={loading}
                  className="flex-1 bg-blue-900 hover:bg-blue-800 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  {loading ? 'Registering...' : 'Register'}
                </button>
                <button
                  onClick={handleBack}
                  disabled={loading}
                  className="flex-1 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sign In Link */}
        <div className="text-center mt-8">
          <p className="text-gray-600">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-blue-900 hover:underline font-semibold"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default FreeTrialPage
