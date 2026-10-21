import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, TrendingUp, BarChart3, PieChart as PieChartIcon } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { supabase } from '../../../lib/supabase'
import LoadingSpinner from '../../../components/LoadingSpinner'
import toast from 'react-hot-toast'

const ReportsPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState({
    salesTrend: [],
    categoryBreakdown: [],
    topMedicines: [],
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0
  })

  useEffect(() => {
    fetchReportData()
  }, [])

  const fetchReportData = async () => {
    try {
      setLoading(true)

      // Get all customer orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('customer_orders')
        .select(`
          id,
          total,
          created_at,
          order_status
        `)
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      // Get order items with medicine details
      const { data: itemsData, error: itemsError } = await supabase
        .from('customer_order_items')
        .select(`
          id,
          quantity,
          unit_price,
          medicine_id,
          order_id
        `)

      if (itemsError) throw itemsError

      // Get medicines for category data
      const { data: medicinesData } = await supabase
        .from('medicines')
        .select('id, name, category')

      // Process data for charts
      const orders = ordersData || []
      const items = itemsData || []
      const medicines = medicinesData || []

      // Calculate revenue and order stats
      let totalRevenue = 0
      const completedOrders = []

      orders.forEach(order => {
        if (order.order_status === 'delivered' || order.order_status === 'completed') {
          totalRevenue += order.total || 0
          completedOrders.push(order)
        }
      })

      const averageOrderValue = completedOrders.length > 0 
        ? Math.round(totalRevenue / completedOrders.length) 
        : 0

      // Generate daily sales trend (last 7 days)
      const last7Days = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        
        const daySales = orders
          .filter(o => {
            const oDate = new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            return oDate === dateStr
          })
          .reduce((sum, o) => sum + (o.total || 0), 0)

        last7Days.push({
          date: dateStr,
          sales: daySales,
          orders: orders.filter(o => {
            const oDate = new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            return oDate === dateStr
          }).length
        })
      }

      // Top medicines by quantity sold
      const medicineQty = {}
      items.forEach(item => {
        const med = medicines.find(m => m.id === item.medicine_id)
        if (med) {
          if (!medicineQty[med.name]) {
            medicineQty[med.name] = 0
          }
          medicineQty[med.name] += item.quantity || 0
        }
      })

      const topMeds = Object.entries(medicineQty)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, qty]) => ({ name, sales: qty }))

      // Category breakdown
      const categoryData = {}
      items.forEach(item => {
        const med = medicines.find(m => m.id === item.medicine_id)
        if (med && med.category) {
          if (!categoryData[med.category]) {
            categoryData[med.category] = 0
          }
          categoryData[med.category] += (item.quantity || 0)
        }
      })

      const categoryBreakdown = Object.entries(categoryData)
        .map(([name, value]) => ({ 
          name, 
          value,
          color: `hsl(${Math.random() * 360}, 70%, 60%)`
        }))

      setReportData({
        salesTrend: last7Days,
        categoryBreakdown,
        topMedicines: topMeds,
        totalRevenue,
        totalOrders: orders.length,
        averageOrderValue
      })
    } catch (error) {
      console.error('Error fetching report data:', error)
      toast.error('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading reports..." />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center text-blue-600 hover:text-blue-800 mr-4"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <FileText className="h-6 w-6 text-blue-600 mr-2" />
            Reports & Analytics
          </h1>
          <p className="text-gray-600">View detailed sales and inventory reports</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 font-medium">Total Revenue</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">₹{reportData.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 font-medium">Total Orders</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{reportData.totalOrders}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 font-medium">Avg Order Value</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">₹{reportData.averageOrderValue.toLocaleString()}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
            Sales Trend (Last 7 Days)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportData.salesTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="#0ea5e9" strokeWidth={2} name="Sales (₹)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Medicines */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
            Top Selling Medicines
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.topMedicines}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="sales" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <PieChartIcon className="h-5 w-5 mr-2 text-blue-600" />
            Category Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reportData.categoryBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {reportData.categoryBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default ReportsPage
