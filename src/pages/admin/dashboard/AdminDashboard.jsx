import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Users, 
  AlertTriangle, 
  Calendar,
  DollarSign,
  ShoppingCart,
  Receipt,
  Clock
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { supabase } from '../../../lib/supabase'
import LoadingSpinner from '../../../components/LoadingSpinner'

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState({
    stats: {
      todaySales: 0,
      todayPurchases: 0,
      todayProfit: 0,
      totalMedicines: 0,
      totalStock: 0,
      lowStockMedicines: 0,
      expiringMedicines: 0,
      expiredMedicines: 0,
      totalCustomers: 0,
      totalRetailers: 0,
      totalWholesalers: 0,
      pendingPayments: 0,
      outstandingCredit: 0,
      todayInvoices: 0
    },
    charts: {
      dailySales: [],
      monthlySales: [],
      purchaseVsSales: [],
      topMedicines: [],
      categorySales: []
    }
  })

  useEffect(() => {
    fetchDashboardData()
    
    // Set up auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchDashboardData, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Get today's date range
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString()

      // Get last 7 days for charts
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
      const sevenDaysAgoStart = new Date(sevenDaysAgo.getFullYear(), sevenDaysAgo.getMonth(), sevenDaysAgo.getDate()).toISOString()

      // Get last 6 months for monthly chart
      const sixMonthsAgo = new Date(today)
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
      const sixMonthsAgoStart = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth(), 1).toISOString()

      // Fetch all required data in parallel
      const [
        medicinesResponse,
        batchesResponse,
        customersResponse,
        paymentsResponse,
        todaySalesResponse,
        todayPurchasesResponse,
        sevenDaysSalesResponse,
        sevenDaysPurchasesResponse,
        monthlyResponse,
        topMedicinesResponse,
        categorySalesResponse
      ] = await Promise.all([
        // Medicines count
        supabase
          .from('medicines')
          .select('id, low_stock_threshold')
          .eq('status', 'active'),
        
        // Stock and expiry data
        supabase
          .from('medicine_batches')
          .select('current_quantity, expiry_date, medicine_id'),
        
        // Customers count
        supabase
          .from('customers')
          .select('id')
          .eq('status', 'active'),
        
        // Pending payments from customer_orders
        supabase
          .from('customer_orders')
          .select('total, payment_status')
          .eq('payment_status', 'pending'),
        
        // Today's sales total
        supabase
          .from('sales')
          .select('id, total')
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay),
        
        // Today's purchases total
        supabase
          .from('purchases')
          .select('id, total')
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay),
        
        // Last 7 days sales for chart
        supabase
          .from('sales')
          .select('total, created_at')
          .gte('created_at', sevenDaysAgoStart)
          .lte('created_at', endOfDay),
        
        // Last 7 days purchases for chart
        supabase
          .from('purchases')
          .select('total, created_at')
          .gte('created_at', sevenDaysAgoStart)
          .lte('created_at', endOfDay),
        
        // Last 6 months sales for monthly chart
        supabase
          .from('sales')
          .select('total, created_at')
          .gte('created_at', sixMonthsAgoStart)
          .lte('created_at', endOfDay),
        
        // Top selling medicines
        supabase
          .from('sale_items')
          .select('medicine_id, quantity, medicines(name)')
          .gte('created_at', sevenDaysAgoStart)
          .order('quantity', { ascending: false })
          .limit(5),
        
        // Category sales data
        supabase
          .from('sale_items')
          .select('medicines(category), quantity, total')
          .gte('created_at', sevenDaysAgoStart)
      ])

      // Calculate today's sales and invoices
      const todaySalesTotal = todaySalesResponse.data?.reduce((sum, sale) => sum + (sale.total || 0), 0) || 0
      const todayInvoicesCount = todaySalesResponse.data?.length || 0

      // Calculate today's purchases
      const todayPurchasesTotal = todayPurchasesResponse.data?.reduce((sum, purchase) => sum + (purchase.total || 0), 0) || 0

      // Calculate profit (25% of sales as simplified profit margin)
      const todayProfit = todaySalesTotal * 0.25

      // Calculate stats
      const stats = {
        todaySales: todaySalesTotal,
        todayPurchases: todayPurchasesTotal,
        todayProfit: todayProfit,
        totalMedicines: medicinesResponse.data?.length || 0,
        totalStock: batchesResponse.data?.reduce((sum, batch) => sum + (batch.current_quantity || 0), 0) || 0,
        lowStockMedicines: 0, // Will calculate based on threshold
        expiringMedicines: 0, // Expiring within 30 days
        expiredMedicines: 0, // Already expired
        totalCustomers: customersResponse.data?.length || 0,
        totalRetailers: 0,
        totalWholesalers: 0,
        pendingPayments: paymentsResponse.data?.reduce((sum, payment) => sum + (payment.total || 0), 0) || 0,
        outstandingCredit: 0,
        todayInvoices: todayInvoicesCount
      }

      // Calculate low stock medicines based on thresholds
      if (medicinesResponse.data && batchesResponse.data) {
        const lowStockSet = new Set()
        
        medicinesResponse.data.forEach(medicine => {
          const threshold = medicine.low_stock_threshold || 10
          const medicineStock = batchesResponse.data
            .filter(batch => batch.medicine_id === medicine.id)
            .reduce((sum, batch) => sum + (batch.current_quantity || 0), 0)
          
          if (medicineStock < threshold) {
            lowStockSet.add(medicine.id)
          }
        })
        
        stats.lowStockMedicines = lowStockSet.size
      }

      // Calculate expiry data
      const currentDate = new Date()
      const thirtyDaysFromNow = new Date(currentDate.getTime() + (30 * 24 * 60 * 60 * 1000))

      if (batchesResponse.data) {
        batchesResponse.data.forEach(batch => {
          const expiryDate = new Date(batch.expiry_date)
          if (expiryDate < currentDate) {
            stats.expiredMedicines++
          } else if (expiryDate <= thirtyDaysFromNow) {
            stats.expiringMedicines++
          }
        })
      }

      // Generate real chart data from database
      const dailySalesChart = generateRealSalesData(sevenDaysSalesResponse.data, sevenDaysPurchasesResponse.data)
      const monthlySalesChart = generateRealMonthlyData(monthlyResponse.data)
      const purchaseVsSalesChart = generateRealComparisonData(sevenDaysSalesResponse.data, sevenDaysPurchasesResponse.data)
      const topMedicinesChart = generateRealTopMedicines(topMedicinesResponse.data)
      const categorySalesChart = generateRealCategoryData(categorySalesResponse.data)

      const charts = {
        dailySales: dailySalesChart,
        monthlySales: monthlySalesChart,
        purchaseVsSales: purchaseVsSalesChart,
        topMedicines: topMedicinesChart,
        categorySales: categorySalesChart
      }

      setDashboardData({ stats, charts })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Generate real sales data from database (last 7 days)
  const generateRealSalesData = (salesData, purchasesData) => {
    const data = {}
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      data[dateStr] = { date: dateStr, sales: 0, purchases: 0 }
    }

    // Aggregate sales by date
    if (salesData) {
      salesData.forEach(sale => {
        const saleDate = new Date(sale.created_at)
        const dateStr = saleDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        if (data[dateStr]) {
          data[dateStr].sales += sale.total || 0
        }
      })
    }

    // Aggregate purchases by date
    if (purchasesData) {
      purchasesData.forEach(purchase => {
        const purchaseDate = new Date(purchase.created_at)
        const dateStr = purchaseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        if (data[dateStr]) {
          data[dateStr].purchases += purchase.total || 0
        }
      })
    }

    return Object.values(data)
  }

  // Generate real monthly sales data
  const generateRealMonthlyData = (monthlyData) => {
    const monthlyMap = {}

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthStr = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      monthlyMap[monthStr] = { month: date.toLocaleDateString('en-US', { month: 'short' }), sales: 0, profit: 0 }
    }

    // Aggregate by month
    if (monthlyData) {
      monthlyData.forEach(sale => {
        const saleDate = new Date(sale.created_at)
        const monthStr = saleDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        if (monthlyMap[monthStr]) {
          monthlyMap[monthStr].sales += sale.total || 0
          monthlyMap[monthStr].profit += (sale.total || 0) * 0.25
        }
      })
    }

    return Object.values(monthlyMap)
  }

  // Generate real comparison data (purchase vs sales by day of week)
  const generateRealComparisonData = (salesData, purchasesData) => {
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const dayMap = {}

    // Initialize days
    daysOfWeek.forEach(day => {
      dayMap[day] = { name: day, purchases: 0, sales: 0 }
    })

    // Aggregate sales by day of week
    if (salesData) {
      salesData.forEach(sale => {
        const saleDate = new Date(sale.created_at)
        const dayOfWeek = daysOfWeek[saleDate.getDay()]
        if (dayMap[dayOfWeek]) {
          dayMap[dayOfWeek].sales += sale.total || 0
        }
      })
    }

    // Aggregate purchases by day of week
    if (purchasesData) {
      purchasesData.forEach(purchase => {
        const purchaseDate = new Date(purchase.created_at)
        const dayOfWeek = daysOfWeek[purchaseDate.getDay()]
        if (dayMap[dayOfWeek]) {
          dayMap[dayOfWeek].purchases += purchase.total || 0
        }
      })
    }

    return Object.values(dayMap)
  }

  // Generate real top medicines data
  const generateRealTopMedicines = (topMedicinesData) => {
    if (!topMedicinesData || topMedicinesData.length === 0) {
      return []
    }

    // Group by medicine and sum quantities
    const medicineMap = {}
    topMedicinesData.forEach(item => {
      const medicineName = item.medicines?.name || 'Unknown'
      if (!medicineMap[medicineName]) {
        medicineMap[medicineName] = 0
      }
      medicineMap[medicineName] += item.quantity || 0
    })

    // Convert to array and sort
    return Object.entries(medicineMap)
      .map(([name, sales]) => ({ name, sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5)
  }

  // Generate real category sales data
  const generateRealCategoryData = (categorySalesData) => {
    const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']
    
    if (!categorySalesData || categorySalesData.length === 0) {
      return []
    }

    // Group by category
    const categoryMap = {}
    categorySalesData.forEach((item, index) => {
      const categoryName = item.medicines?.category || 'Other'
      if (!categoryMap[categoryName]) {
        categoryMap[categoryName] = 0
      }
      categoryMap[categoryName] += item.quantity || 0
    })

    // Convert to array with colors
    return Object.entries(categoryMap)
      .map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.value - a.value)
  }

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />
  }

  const StatCard = ({ title, value, icon: Icon, change, changeType = 'positive' }) => (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {typeof value === 'number' && title.includes('₹') ? `₹${value.toLocaleString()}` : value.toLocaleString()}
          </p>
          {change && (
            <p className={`text-sm flex items-center mt-1 ${changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
              {changeType === 'positive' ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
              {change}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${changeType === 'positive' ? 'bg-green-100' : 'bg-red-100'}`}>
          <Icon className={`h-6 w-6 ${changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening in your pharmacy today.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate('/admin/reports')}
            className="btn-secondary">
            <Calendar className="h-4 w-4 mr-2" />
            Today
          </button>
          <button 
            onClick={() => navigate('/admin/reports')}
            className="btn-primary">
            View Reports
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Today's Sales"
          value={dashboardData.stats.todaySales}
          icon={DollarSign}
          change="+12.5%"
          changeType="positive"
        />
        <StatCard
          title="Today's Purchases"
          value={dashboardData.stats.todayPurchases}
          icon={ShoppingCart}
          change="+8.2%"
          changeType="positive"
        />
        <StatCard
          title="Today's Profit"
          value={dashboardData.stats.todayProfit}
          icon={TrendingUp}
          change="+15.3%"
          changeType="positive"
        />
        <StatCard
          title="Today's Invoices"
          value={dashboardData.stats.todayInvoices}
          icon={Receipt}
          change="+5"
          changeType="positive"
        />
      </div>

      {/* Second Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Medicines"
          value={dashboardData.stats.totalMedicines}
          icon={Package}
        />
        <StatCard
          title="Low Stock Items"
          value={dashboardData.stats.lowStockMedicines}
          icon={AlertTriangle}
          changeType="warning"
        />
        <StatCard
          title="Expiring Soon"
          value={dashboardData.stats.expiringMedicines}
          icon={Clock}
          changeType="warning"
        />
        <StatCard
          title="Total Customers"
          value={dashboardData.stats.totalCustomers}
          icon={Users}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Sales Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dashboardData.charts.dailySales}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="#0ea5e9" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Purchase vs Sales */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Purchase vs Sales</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboardData.charts.purchaseVsSales}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="purchases" fill="#f59e0b" />
              <Bar dataKey="sales" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Medicines */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Medicines</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboardData.charts.topMedicines} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={80} />
              <Tooltip />
              <Bar dataKey="sales" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Sales */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dashboardData.charts.categorySales}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {dashboardData.charts.categorySales.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Alert */}
        <div 
          className="card border-l-4 border-l-yellow-500 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/admin/alerts/low-stock')}
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-900">Low Stock Alert</h4>
              <p className="text-sm text-gray-600">{dashboardData.stats.lowStockMedicines} medicines are running low</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
          <button className="mt-3 text-sm text-yellow-700 hover:text-yellow-800 font-medium">
            View Details →
          </button>
        </div>

        {/* Expiry Alert */}
        <div 
          className="card border-l-4 border-l-red-500 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/admin/alerts/expiry')}
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-900">Expiry Alert</h4>
              <p className="text-sm text-gray-600">{dashboardData.stats.expiringMedicines} medicines expiring soon</p>
            </div>
            <Clock className="h-8 w-8 text-red-500" />
          </div>
          <button className="mt-3 text-sm text-red-700 hover:text-red-800 font-medium">
            View Details →
          </button>
        </div>

        {/* Pending Payments */}
        <div 
          className="card border-l-4 border-l-blue-500 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/admin/alerts/pending-payments')}
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-900">Pending Payments</h4>
              <p className="text-sm text-gray-600">₹{dashboardData.stats.pendingPayments.toLocaleString()} pending</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
          <button className="mt-3 text-sm text-blue-700 hover:text-blue-800 font-medium">
            View Details →
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard