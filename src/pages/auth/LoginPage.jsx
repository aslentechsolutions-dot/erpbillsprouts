import React, { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff, AlertCircle, Zap, Package, FileText, RefreshCw, Database, Phone, UserPlus, X, Check } from "lucide-react"
import useAuthStore from "../../store/authStore"
import { supabase } from "../../lib/supabase"
import toast from "react-hot-toast"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
})

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [logo, setLogo] = useState(null)
  const [pharmacyName, setPharmacyName] = useState("BillSprout")
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [showDemoModal, setShowDemoModal] = useState(false)
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [demoFormData, setDemoFormData] = useState({
    yourName: "",
    businessName: "",
    mobileNumber: "",
    email: "",
    city: "",
    pincode: "",
    businessType: "",
    branches: "",
    specificRequest: ""
  })
  const [demoErrors, setDemoErrors] = useState({})
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoSuccess, setDemoSuccess] = useState(false)
  const { signIn } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("logo_url, pharmacy_name")
        .limit(1)
        .single()

      if (!error && data) {
        if (data.logo_url) setLogo(data.logo_url)
        if (data.pharmacy_name) setPharmacyName(data.pharmacy_name)
      }
    } catch (error) {
      // Silently handle
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(loginSchema)
  })

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      const result = await signIn(data.email, data.password)
      if (result.success) {
        toast.success("Login successful!")
      } else {
        toast.error(result.error || "Login failed")
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }
  const handleDemoInputChange = (e) => {
    const { name, value } = e.target
    setDemoFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (demoErrors[name]) {
      setDemoErrors(prev => ({
        ...prev,
        [name]: ""
      }))
    }
  }

  const validateDemoForm = () => {
    const newErrors = {}
    if (!demoFormData.yourName.trim()) newErrors.yourName = "Name is required"
    if (!demoFormData.businessName.trim()) newErrors.businessName = "Business name is required"
    if (!demoFormData.mobileNumber.trim()) {
      newErrors.mobileNumber = "Mobile number is required"
    } else if (!/^[0-9]{10}$/.test(demoFormData.mobileNumber.replace(/[^0-9]/g, ""))) {
      newErrors.mobileNumber = "Please enter a valid 10-digit number"
    }
    if (!demoFormData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(demoFormData.email)) {
      newErrors.email = "Invalid email"
    }
    if (!demoFormData.city.trim()) newErrors.city = "City is required"
    if (!demoFormData.pincode.trim()) newErrors.pincode = "Pincode is required"
    setDemoErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleDemoSubmit = async (e) => {
    e.preventDefault()
    if (!validateDemoForm()) return
    setDemoLoading(true)
    try {
      const { error } = await supabase
        .from("demo_requests")
        .insert([{
          name: demoFormData.yourName,
          business_name: demoFormData.businessName,
          mobile_number: demoFormData.mobileNumber,
          email: demoFormData.email,
          city: demoFormData.city,
          pincode: demoFormData.pincode,
          business_type: demoFormData.businessType,
          branches: demoFormData.branches,
          specific_request: demoFormData.specificRequest
        }])
      if (error) {
        console.error("Demo request error:", error)
        toast.error(error.message || "Failed to submit demo request")
      } else {
        // Show success state
        setDemoSuccess(true)
        toast.success("Demo request submitted successfully!")
        
        // Auto-close after 2 seconds
        setTimeout(() => {
          setShowDemoModal(false)
          setDemoSuccess(false)
          setDemoFormData({
            yourName: "",
            businessName: "",
            mobileNumber: "",
            email: "",
            city: "",
            pincode: "",
            businessType: "",
            branches: "",
            specificRequest: ""
          })
        }, 2000)
      }
    } catch (error) {
      console.error("Demo request exception:", error)
      toast.error(error.message || "An error occurred")
    } finally {
      setDemoLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Panel - Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white p-12 flex-col justify-between">
        <div>
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3 mb-12">
            <div className="h-14 w-14 bg-white rounded-lg flex items-center justify-center overflow-hidden">
              {logo ? (
                <img src={logo} alt="Logo" className="h-full w-full object-contain p-1" />
              ) : (
                <span className="text-2xl font-bold text-blue-900">Rx</span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{pharmacyName}</h1>
              <p className="text-sm text-blue-200">Smart ERP & Fast POS Billing System</p>
              <p className="text-xs text-blue-300">by LIFESPROUT Care</p>
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold">Hybrid Offline-to-Online Zero Latency Engine</h3>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold">FEFO Batch Selection & Schedule H/H1 Regulatory Logs</h3>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold">Dual Thermal & PDF Printing + WhatsApp Receipt Sharing</h3>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold">Over-The-Air (OTA) Enterprise Updates</h3>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold">Supabase PostgreSQL Real-time Cloud Sync</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Support Info */}
        <div className="bg-blue-800/50 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Phone className="w-5 h-5 text-orange-400" />
            <div>
              <p className="text-sm font-semibold">Support: +44 7747 571513</p>
              <p className="text-xs text-blue-200">Support@billsprout.online</p>
            </div>
          </div>
          <div className="text-blue-200">→</div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="w-full max-w-md space-y-6">
          {/* Portal Access Header */}
          <div className="text-center mb-4">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Portal Access</h2>
            <p className="text-gray-600 text-sm">Select your portal and sign in.</p>
          </div>

          {/* Login Form Card */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 space-y-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email Field */}
              <div>
                <input
                  {...register("email")}
                  type="email"
                  autoComplete="email"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder-gray-400 ${
                    errors.email ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder="Email Address"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <div className="relative">
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder-gray-400 ${
                      errors.password ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          </div>

          {/* Promotional Card */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-gray-300 p-8 text-center space-y-4">
            <div className="flex justify-center mb-2">
              <span className="text-3xl">🚀</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900">Start Your Pharmacy Software Journey</h3>
            <p className="text-gray-600 text-sm">Join hundreds of pharmacies using BillSprout</p>
            
            <button onClick={() => navigate("/free-trial")} className="w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2">
              <span>📊</span>
              Start Free Trial
            </button>
            
            <p className="text-xs text-gray-500">No credit card required • 7-day free trial</p>
            
            <div className="pt-4 border-t border-gray-300">
              <p className="text-sm text-gray-600 mb-3">Are you a customer?</p>
              <button
                onClick={() => navigate("/register")}
                className="w-full border-2 border-blue-900 text-blue-900 hover:bg-blue-50 font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Create Customer Account
              </button>
            </div>
          </div>

          {/* Support Links */}
          <div className="text-center space-y-3 text-sm text-gray-600">
            <div className="flex items-center justify-center gap-1">
              <span>❓</span>
              <button onClick={() => setShowSupportModal(true)} className="hover:text-blue-900 font-medium">Need Help? Contact Lifessprout Care Support</button>
            </div>
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => setShowDemoModal(true)} className="hover:text-blue-900 flex items-center gap-1">
                <span>▶</span> Request a Demo
              </button>
              <span>•</span>
              <button onClick={() => setShowPricingModal(true)} className="hover:text-blue-900 flex items-center gap-1">
                <span>🏷️</span> View Pricing
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-200">
            <p>© 2024 BillSprout Smart ERP - LIFESPROUT Care</p>
          </div>
        </div>
      </div>

      {/* Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
            <div className="flex justify-end mb-4">
              <button onClick={() => setShowSupportModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="mb-6">
              <div className="flex justify-center mb-3">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl">🛟</span>
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">LIFESPROUT Care Support Desk</h2>
              <p className="text-sm text-gray-600">BillSprout ERP Technical & Operational Assistance</p>
            </div>
            <div className="space-y-4">
              <div className="border-2 border-green-500 rounded-lg p-4 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-lg">💬</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900 text-sm">WhatsApp Support & Leads Desk</h3>
                    <p className="text-xs text-gray-600">+44 7747 571513</p>
                  </div>
                </div>
                <a href="https://wa.me/447747571513" target="_blank" rel="noopener noreferrer" className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-3 rounded-lg text-xs whitespace-nowrap">
                  Chat Now
                </a>
              </div>
              <div className="border border-gray-300 rounded-lg p-4 flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">✉️</span>
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm">Technical Support Email</h3>
                  <a href="mailto:Support@billsprout.online" className="text-blue-600 hover:underline text-xs">
                    Support@billsprout.online
                  </a>
                </div>
              </div>
              <div className="border border-gray-300 rounded-lg p-4 flex items-start gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">📧</span>
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm">Customer Care Email</h3>
                  <a href="mailto:info@lifessproutcare.com" className="text-blue-600 hover:underline text-xs">
                    info@lifessproutcare.com
                  </a>
                </div>
              </div>
            </div>
            <button onClick={() => setShowSupportModal(false)} className="w-full mt-6 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-2 px-4 rounded-lg text-sm">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Demo Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 my-8">
            {demoSuccess ? (
              // Success Screen
              <div className="text-center py-8">
                <div className="mb-6">
                  <div className="flex justify-center mb-4">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
                      <Check className="w-10 h-10 text-green-500" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Sent!</h2>
                  <p className="text-sm text-gray-600">
                    Thank you for your interest. Our team will contact you shortly to schedule a demo.
                  </p>
                </div>
              </div>
            ) : (
              // Form Screen
              <>
                {/* Header */}
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-2xl font-bold text-gray-900">Request a Demo</h2>
                  <button onClick={() => setShowDemoModal(false)} className="text-gray-400 hover:text-gray-600 -mt-1">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-6">Tell us about your business and we will set up a walkthrough.</p>

                <form onSubmit={handleDemoSubmit} className="space-y-4">
                  {/* Row 1: Your Name (Full Width) */}
                  <input
                    type="text"
                    name="yourName"
                    value={demoFormData.yourName}
                    onChange={handleDemoInputChange}
                    placeholder="Your Name *"
                    className="w-full px-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white placeholder-gray-600 transition-colors"
                  />

                  {/* Row 2: Business Name (Full Width) */}
                  <input
                    type="text"
                    name="businessName"
                    value={demoFormData.businessName}
                    onChange={handleDemoInputChange}
                    placeholder="Business Name"
                    className="w-full px-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white placeholder-gray-600 transition-colors"
                  />

                  {/* Row 3: Mobile Number & Email (2-column grid) */}
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="tel"
                      name="mobileNumber"
                      value={demoFormData.mobileNumber}
                      onChange={handleDemoInputChange}
                      placeholder="Mobile Number *"
                      className="px-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white placeholder-gray-600 transition-colors"
                    />
                    <input
                      type="email"
                      name="email"
                      value={demoFormData.email}
                      onChange={handleDemoInputChange}
                      placeholder="Email"
                      className="px-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white placeholder-gray-600 transition-colors"
                    />
                  </div>

                  {/* Row 4: City & Pincode (2-column grid) */}
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      name="city"
                      value={demoFormData.city}
                      onChange={handleDemoInputChange}
                      placeholder="City"
                      className="px-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white placeholder-gray-600 transition-colors"
                    />
                    <input
                      type="text"
                      name="pincode"
                      value={demoFormData.pincode}
                      onChange={handleDemoInputChange}
                      placeholder="Pincode"
                      className="px-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white placeholder-gray-600 transition-colors"
                    />
                  </div>

                  {/* Row 5: Business Type & Branches (2-column grid) */}
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      name="businessType"
                      value={demoFormData.businessType}
                      onChange={handleDemoInputChange}
                      className="px-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-gray-700 transition-colors"
                    >
                      <option value="">-- Select Business Type --</option>
                      <option value="Pharmacy / Medical">Pharmacy / Medical</option>
                      <option value="Retail">Retail</option>
                      <option value="Supermarket">Supermarket</option>
                      <option value="Other">Other</option>
                    </select>
                    <select
                      name="branches"
                      value={demoFormData.branches}
                      onChange={handleDemoInputChange}
                      className="px-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-gray-700 transition-colors"
                    >
                      <option value="">-- Select Branches --</option>
                      <option value="1">1</option>
                      <option value="2-5">2-5</option>
                      <option value="6-10">6-10</option>
                      <option value="10+">10+</option>
                    </select>
                  </div>

                  {/* Row 6: Specific Request (Full Width) */}
                  <textarea
                    name="specificRequest"
                    value={demoFormData.specificRequest}
                    onChange={handleDemoInputChange}
                    rows="3"
                    placeholder="Anything specific you want to see?"
                    className="w-full px-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white placeholder-gray-600 transition-colors resize-none"
                  />

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={demoLoading}
                    className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center mt-6 gap-2"
                  >
                    {demoLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Request Demo</span>
                      </>
                    ) : (
                      <>
                        <span>▶</span>
                        <span>Request Demo</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Pricing Modal */}
      {showPricingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg max-w-6xl w-full p-8 my-8">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Pricing</h2>
                <p className="text-sm text-gray-600 mt-1">One-time license per store. GST applicable as shown.</p>
              </div>
              <button onClick={() => setShowPricingModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Pricing Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Basic Plan Card */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-bold text-gray-900 mb-1">Basic Plan</h3>
                <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded mb-4">🏪 Retail Only</span>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">₹5000</span>
                  <p className="text-sm text-gray-600 mt-1">+ 18% GST</p>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">5 Users</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">1 Branch</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">1000 Products</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Retail Billing</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">GST Reports</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Email Support</span>
                  </li>
                </ul>
              </div>

              {/* Professional Plan Card */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-bold text-gray-900 mb-1">Professional Plan</h3>
                <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded mb-4">🏢 Retail + Wholesale</span>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">₹20000</span>
                  <p className="text-sm text-gray-600 mt-1">+ 18% GST</p>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">5 Users</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">5 Branches</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Unlimited Products</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Retail + Wholesale</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Multi-Tenant Support</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Advanced Reports</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Priority Support</span>
                  </li>
                </ul>
              </div>

              {/* Gold Edition Card - Recommended */}
              <div className="bg-white border-2 border-yellow-500 rounded-lg p-6 relative hover:shadow-lg transition-shadow">
                {/* Recommended Badge */}
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-semibold">RECOMMENDED</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1 mt-2">Gold Edition</h3>
                <span className="inline-block bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-1 rounded mb-4">🌐 Wholesale & Distributors</span>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">₹35000</span>
                  <p className="text-sm text-gray-600 mt-1">+ 18% GST</p>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Unlimited Users</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Unlimited Branches</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Unlimited Products</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Wholesale & Distributors</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Multi-Tenant Support</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">Advanced Reports</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">24/7 Support</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
              <button onClick={() => setShowPricingModal(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-2 px-6 rounded-lg text-sm transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
export default LoginPage







