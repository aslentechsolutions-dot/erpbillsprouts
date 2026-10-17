import React, { useState } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { ShoppingCart, Package, LogOut, User, Home, ShoppingBag } from 'lucide-react'
import useAuthStore from '../store/authStore'
import useCustomerCartStore from '../store/customerCartStore'
import ERPInquiryModal from './ERPInquiryModal'
import toast from 'react-hot-toast'

const CustomerLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut, user } = useAuthStore()
  const { items } = useCustomerCartStore()
  const [showERPModal, setShowERPModal] = useState(false)

  const cartItemCount = items.reduce((total, item) => total + item.quantity, 0)

  const handleLogout = async () => {
    try {
      await signOut()
      toast.success('Logged out successfully')
      navigate('/login')
    } catch (error) {
      toast.error('Failed to logout')
    }
  }

  const isActivePath = (path) => {
    return location.pathname === path
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/customer/store" className="flex items-center">
              <ShoppingBag className="h-8 w-8 text-blue-900" />
              <span className="ml-2 text-xl font-bold text-gray-900">LifeSprout Care</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link
                to="/customer/store"
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActivePath('/customer/store')
                    ? 'text-blue-900 bg-blue-50'
                    : 'text-gray-700 hover:text-blue-900 hover:bg-gray-50'
                }`}
              >
                <Home className="h-5 w-5 mr-1" />
                Store
              </Link>

              <Link
                to="/customer/orders"
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActivePath('/customer/orders')
                    ? 'text-blue-900 bg-blue-50'
                    : 'text-gray-700 hover:text-blue-900 hover:bg-gray-50'
                }`}
              >
                <Package className="h-5 w-5 mr-1" />
                My Orders
              </Link>

              <Link
                to="/customer/cart"
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors relative ${
                  isActivePath('/customer/cart')
                    ? 'text-blue-900 bg-blue-50'
                    : 'text-gray-700 hover:text-blue-900 hover:bg-gray-50'
                }`}
              >
                <ShoppingCart className="h-5 w-5 mr-1" />
                Cart
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                    {cartItemCount}
                  </span>
                )}
              </Link>
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center text-sm text-gray-700">
                <User className="h-5 w-5 mr-1" />
                <span className="font-medium">{user?.email}</span>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center text-gray-700 hover:text-red-600 transition-colors"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
                <span className="ml-1 text-sm font-medium hidden md:inline">Logout</span>
              </button>

              {/* Mobile Cart Icon */}
              <Link to="/customer/cart" className="md:hidden relative">
                <ShoppingCart className="h-6 w-6 text-gray-700" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                    {cartItemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Mobile Navigation */}
          <nav className="md:hidden flex items-center space-x-4 pb-3 border-t mt-2 pt-3">
            <Link
              to="/customer/store"
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActivePath('/customer/store')
                  ? 'text-blue-900 bg-blue-50'
                  : 'text-gray-700 hover:text-blue-900 hover:bg-gray-50'
              }`}
            >
              <Home className="h-5 w-5 mr-1" />
              Store
            </Link>

            <Link
              to="/customer/orders"
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActivePath('/customer/orders')
                  ? 'text-blue-900 bg-blue-50'
                  : 'text-gray-700 hover:text-blue-900 hover:bg-gray-50'
              }`}
            >
              <Package className="h-5 w-5 mr-1" />
              Orders
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer with Purchase ERP Button */}
      <footer className="bg-gray-900 text-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* About */}
            <div>
              <h3 className="text-lg font-semibold mb-4">LifeSprout Care</h3>
              <p className="text-gray-400 text-sm">
                Your trusted online pharmacy for quality medicines delivered to your doorstep.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/customer/store" className="text-gray-400 hover:text-white transition-colors">
                    Browse Medicines
                  </Link>
                </li>
                <li>
                  <Link to="/customer/orders" className="text-gray-400 hover:text-white transition-colors">
                    My Orders
                  </Link>
                </li>
                <li>
                  <Link to="/customer/cart" className="text-gray-400 hover:text-white transition-colors">
                    Shopping Cart
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Phone: +91 9666105832</li>
                <li>Email: care@lifesproutcare.com</li>
                <li>Address: Hyderabad, India</li>
              </ul>
            </div>
          </div>

          {/* Purchase ERP Button */}
          <div className="mt-8 pt-8 border-t border-gray-800">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-center">
              <h3 className="text-xl font-bold mb-2">Want This ERP System for Your Pharmacy?</h3>
              <p className="text-blue-100 mb-4">
                Get our complete pharmacy management system with POS, inventory, billing, and online portal
              </p>
              <button
                onClick={() => setShowERPModal(true)}
                className="bg-white text-blue-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center shadow-lg"
              >
                <ShoppingBag className="h-5 w-5 mr-2" />
                Purchase ERP Software
              </button>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} LifeSprout Care. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* ERP Inquiry Modal */}
      <ERPInquiryModal isOpen={showERPModal} onClose={() => setShowERPModal(false)} />
    </div>
  )
}

export default CustomerLayout
