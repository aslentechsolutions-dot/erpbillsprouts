import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Pill, 
  Package, 
  ShoppingCart, 
  Receipt, 
  ShoppingBag,
  Users, 
  Truck, 
  UserCheck, 
  Settings, 
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  DollarSign,
  FileText,
  AlertTriangle,
  ShoppingBag as OnlineOrders,
  MessageSquare,
  Gift,
  ChevronRight
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import NotificationPanel from '../../components/NotificationPanel'

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [logo, setLogo] = useState(null)
  const [pharmacyName, setPharmacyName] = useState('BillSprout ERP')
  const [notificationCount, setNotificationCount] = useState(0)
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false)
  const [hoveredItem, setHoveredItem] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuthStore()

  useEffect(() => {
    fetchSettings()
    fetchNotificationCount()
    
    // Set up auto-refresh for notification count every 60 seconds
    const interval = setInterval(fetchNotificationCount, 60000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('logo_url, pharmacy_name')
        .limit(1)
        .single()

      if (!error && data) {
        if (data.logo_url) setLogo(data.logo_url)
        if (data.pharmacy_name) setPharmacyName(data.pharmacy_name)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  const fetchNotificationCount = async () => {
    try {
      // Get medicines and batches to calculate alerts
      const [medicinesRes, batchesRes, ordersRes] = await Promise.all([
        supabase
          .from('medicines')
          .select('id, low_stock_threshold')
          .eq('status', 'active'),
        supabase
          .from('medicine_batches')
          .select('current_quantity, expiry_date, medicine_id'),
        supabase
          .from('customer_orders')
          .select('id, order_status')
          .eq('order_status', 'pending')
      ])

      let count = 0
      const currentDate = new Date()
      const thirtyDaysFromNow = new Date(currentDate.getTime() + (30 * 24 * 60 * 60 * 1000))

      // Count low stock medicines
      if (medicinesRes.data && batchesRes.data) {
        const lowStockSet = new Set()
        
        medicinesRes.data.forEach(medicine => {
          const threshold = medicine.low_stock_threshold || 10
          const medicineStock = batchesRes.data
            .filter(batch => batch.medicine_id === medicine.id)
            .reduce((sum, batch) => sum + (batch.current_quantity || 0), 0)
          
          if (medicineStock < threshold) {
            lowStockSet.add(medicine.id)
          }
        })
        
        count += lowStockSet.size
      }

      // Count expiring and expired medicines
      if (batchesRes.data) {
        batchesRes.data.forEach(batch => {
          const expiryDate = new Date(batch.expiry_date)
          if (expiryDate < currentDate || (expiryDate <= thirtyDaysFromNow && expiryDate >= currentDate)) {
            count++
          }
        })
      }

      // Count pending orders
      if (ordersRes.data) {
        count += ordersRes.data.length
      }

      setNotificationCount(count)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'POS', href: '/admin/pos', icon: ShoppingCart },
    { name: 'Medicines', href: '/admin/medicines', icon: Pill },
    { name: 'Inventory', href: '/admin/inventory', icon: Package },
    { name: 'Schemes', href: '/admin/schemes', icon: Gift },
    { name: 'Purchases', href: '/admin/purchases', icon: ShoppingBag },
    { name: 'Sales', href: '/admin/sales', icon: Receipt },
    { name: 'Customers', href: '/admin/customers', icon: Users },
    { name: 'Customer Orders', href: '/admin/customer-orders', icon: OnlineOrders },
    { name: 'Customer Ledger', href: '/admin/ledger', icon: DollarSign },
    { name: 'Supplier Ledger', href: '/admin/supplier-ledger', icon: Truck },
    { name: 'Prescriptions', href: '/admin/prescriptions', icon: FileText },
    { name: 'Narcotic Report', href: '/admin/narcotic-report', icon: AlertTriangle },
    { name: 'ERP Inquiries', href: '/admin/erp-inquiries', icon: MessageSquare },
    { name: 'Wholesalers', href: '/admin/wholesalers', icon: Truck },
    { name: 'Users', href: '/admin/users', icon: UserCheck },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ]

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
      toast.success('Logged out successfully')
    } catch (error) {
      toast.error('Error logging out')
    }
  }

  const isActive = (href) => {
    if (href === '/admin') {
      return location.pathname === '/admin'
    }
    return location.pathname.startsWith(href)
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Vertical Card Sidebar with Icon Above Text */}
      <div className={`fixed inset-y-0 left-0 z-50 bg-white shadow-xl transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 w-screen sm:w-80 lg:w-24 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        
        {/* Sidebar Header - Logo Only (Compact) */}
        <div className="flex items-center justify-between h-20 px-2 bg-gradient-to-br from-primary-600 to-primary-700 flex-shrink-0 flex-col sm:flex-row lg:flex-col">
          <div className="flex items-center justify-center w-16 h-16 mx-auto lg:mx-0">
            <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center overflow-hidden shadow-lg">
              {logo ? (
                <img src={logo} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <span className="text-xs font-bold text-primary-600">Rx</span>
              )}
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:bg-primary-700 p-1 rounded sm:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation - Minimal Design */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          <div className="flex flex-wrap lg:flex-col gap-2">
            {navigation.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onMouseEnter={() => setHoveredItem(item.name)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`group relative flex flex-col items-center justify-center w-20 h-24 sm:w-24 sm:h-24 rounded-lg transition-all duration-200 flex-shrink-0 ${
                    active
                      ? 'bg-blue-500'
                      : hoveredItem === item.name
                      ? 'bg-gray-100'
                      : ''
                  }`}
                  onClick={() => setSidebarOpen(false)}
                  title={item.name}
                >
                  {/* Icon */}
                  <Icon
                    className={`h-6 w-6 mb-1 transition-all duration-200 ${
                      active
                        ? 'text-white'
                        : hoveredItem === item.name
                        ? 'text-gray-700'
                        : 'text-gray-500'
                    }`}
                  />
                  
                  {/* Text */}
                  <span className={`text-xs leading-tight text-center transition-all duration-200 line-clamp-2 px-1 ${
                    active
                      ? 'text-white font-medium'
                      : hoveredItem === item.name
                      ? 'text-gray-700 font-medium'
                      : 'text-gray-600'
                  }`}>
                    {item.name}
                  </span>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* User Profile Section - Bottom */}
        <div className="border-t border-gray-200 p-2 flex-shrink-0">
          {/* Settings Card */}
          <Link
            to="/admin/settings"
            className={`group relative flex flex-col items-center justify-center w-full h-20 rounded-lg transition-all duration-200 mb-2 ${
              isActive('/admin/settings')
                ? 'bg-blue-500'
                : hoveredItem === 'Settings' 
                ? 'bg-gray-100'
                : ''
            }`}
            onMouseEnter={() => setHoveredItem('Settings')}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={() => setSidebarOpen(false)}
            title="Settings"
          >
            <Settings
              className={`h-6 w-6 mb-1 transition-all duration-200 ${
                isActive('/admin/settings')
                  ? 'text-white'
                  : hoveredItem === 'Settings'
                  ? 'text-gray-700'
                  : 'text-gray-500'
              }`}
            />
            <span className={`text-xs leading-tight text-center transition-all duration-200 px-1 ${
              isActive('/admin/settings')
                ? 'text-white font-medium'
                : hoveredItem === 'Settings'
                ? 'text-gray-700 font-medium'
                : 'text-gray-600'
            }`}>
              Settings
            </span>
          </Link>

          {/* Sign Out Card */}
          <button
            onClick={handleSignOut}
            className={`w-full group relative flex flex-col items-center justify-center h-20 rounded-lg transition-all duration-200 ${
              hoveredItem === 'SignOut'
                ? 'bg-gray-100 text-red-700'
                : 'text-gray-600'
            }`}
            onMouseEnter={() => setHoveredItem('SignOut')}
            onMouseLeave={() => setHoveredItem(null)}
            title="Logout"
          >
            <LogOut
              className={`h-6 w-6 mb-1 transition-all duration-200 ${
                hoveredItem === 'SignOut'
                  ? 'text-red-600'
                  : 'text-gray-500'
              }`}
            />
            <span className={`text-xs leading-tight text-center transition-all duration-200 px-1 ${
              hoveredItem === 'SignOut'
                ? 'text-red-700 font-medium'
                : 'text-gray-600'
            }`}>
              Logout
            </span>
          </button>

          {/* User Profile Card */}
          <div className={`flex flex-col items-center justify-center h-20 rounded-lg mt-2 transition-all duration-200 ${
            hoveredItem === 'Profile'
              ? 'bg-gray-100'
              : ''
          }`}
            onMouseEnter={() => setHoveredItem('Profile')}
            onMouseLeave={() => setHoveredItem(null)}
            title={profile?.full_name || 'User'}
          >
            <div className={`h-8 w-8 rounded-md flex items-center justify-center text-xs font-semibold transition-all duration-200 ${
              hoveredItem === 'Profile'
                ? 'bg-gray-300 text-gray-700'
                : 'bg-gray-200 text-gray-600'
            }`}>
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
            <span className="text-xs text-gray-600 text-center mt-1 px-1 line-clamp-2">
              {profile?.full_name ? profile.full_name.split(' ')[0] : 'User'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700 p-2 rounded-md"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Search */}
            <div className="flex-1 max-w-lg mx-4 lg:mx-0">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search medicines, customers..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button 
                onClick={() => setNotificationPanelOpen(true)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 relative">
                <Bell className="h-6 w-6" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </button>

              {/* Profile */}
              <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-700">
                  {profile?.full_name?.charAt(0) || 'U'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Notification Panel */}
      <NotificationPanel 
        isOpen={notificationPanelOpen}
        onClose={() => setNotificationPanelOpen(false)}
        navigate={navigate}
      />
    </div>
  )
}

export default AdminLayout