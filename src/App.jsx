import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { supabase } from './lib/supabase'
import useAuthStore from './store/authStore'

// Components
import LoginPage from './pages/auth/LoginPage'
import FreeTrialPage from './pages/auth/FreeTrialPage'
import ProtectedRoute from './components/ProtectedRoute'
import LoadingSpinner from './components/LoadingSpinner'
import SupabaseSetup from './components/SupabaseSetup'

// Customer Components
import CustomerLayout from './components/CustomerLayout'
import CustomerRegisterPage from './pages/customer/CustomerRegisterPage'
import MedicineStorePage from './pages/customer/MedicineStorePage'
import CustomerCartPage from './pages/customer/CustomerCartPage'
import CheckoutPage from './pages/customer/CheckoutPage'
import OrderConfirmationPage from './pages/customer/OrderConfirmationPage'
import OrderHistoryPage from './pages/customer/OrderHistoryPage'

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/dashboard/AdminDashboard'
import MedicinesPage from './pages/admin/medicines/MedicinesPage'
import InventoryPage from './pages/admin/inventory/InventoryPage'
import POSPage from './pages/admin/pos/POSPage'
import SalesPage from './pages/admin/sales/SalesPage'
import PurchasesPage from './pages/admin/purchases/PurchasesPage'
import CustomersPage from './pages/admin/customers/CustomersPage'
import WholesalersPage from './pages/admin/wholesalers/WholesalersPage'
import UsersPage from './pages/admin/users/UsersPage'
import SettingsPage from './pages/admin/settings/SettingsPage'
import LedgerPage from './pages/admin/ledger/LedgerPage'
import SupplierLedgerPage from './pages/admin/supplier-ledger/SupplierLedgerPage'
import PrescriptionsPage from './pages/admin/prescriptions/PrescriptionsPage'
import NarcoticReportPage from './pages/admin/narcotic-report/NarcoticReportPage'
import CustomerOrdersPage from './pages/admin/customer-orders/CustomerOrdersPage'
import ERPInquiriesPage from './pages/admin/erp-inquiries/ERPInquiriesPage'
import LowStockAlertPage from './pages/admin/alerts/LowStockAlertPage'
import ExpiryAlertPage from './pages/admin/alerts/ExpiryAlertPage'
import PendingPaymentsPage from './pages/admin/alerts/PendingPaymentsPage'
import ReportsPage from './pages/admin/reports/ReportsPage'
import InvoicePrintPage from './pages/admin/invoice/InvoicePrintPage'
import SchemesPage from './pages/admin/schemes/SchemesPage'
import DemoRequests from './pages/admin/DemoRequests'
import FreeTrials from './pages/admin/FreeTrials'

// Other Role Pages
import PharmacistDashboard from './pages/pharmacist/PharmacistDashboard'
import StaffDashboard from './pages/staff/StaffDashboard'
import PatientDashboard from './pages/patient/PatientDashboard'
import RetailerDashboard from './pages/retailer/RetailerDashboard'
import WholesalerDashboard from './pages/wholesaler/WholesalerDashboard'

function App() {
  const { user, loading, initialize } = useAuthStore()

  useEffect(() => {
    if (supabase) {
      initialize()
    }
  }, [initialize])

  // Show setup page if Supabase is not configured
  if (!supabase) {
    return <SupabaseSetup />
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={!user ? <LoginPage /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/register" 
            element={!user ? <CustomerRegisterPage /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/free-trial" 
            element={<FreeTrialPage />} 
          />
          
          {/* Root redirect based on role */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <RoleBasedRedirect />
              </ProtectedRoute>
            } 
          />

          {/* Admin Routes */}
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout>
                  <Routes>
                    <Route index element={<AdminDashboard />} />
                    <Route path="medicines" element={<MedicinesPage />} />
                    <Route path="inventory" element={<InventoryPage />} />
                    <Route path="pos" element={<POSPage />} />
                    <Route path="sales" element={<SalesPage />} />
                    <Route path="purchases" element={<PurchasesPage />} />
                    <Route path="customers" element={<CustomersPage />} />
                    <Route path="customer-orders" element={<CustomerOrdersPage />} />
                    <Route path="ledger" element={<LedgerPage />} />
                    <Route path="supplier-ledger" element={<SupplierLedgerPage />} />
                    <Route path="prescriptions" element={<PrescriptionsPage />} />
                    <Route path="narcotic-report" element={<NarcoticReportPage />} />
                    <Route path="erp-inquiries" element={<ERPInquiriesPage />} />
                    <Route path="demo-requests" element={<DemoRequests />} />
                    <Route path="free-trials" element={<FreeTrials />} />
                    <Route path="wholesalers" element={<WholesalersPage />} />
                    <Route path="users" element={<UsersPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="schemes" element={<SchemesPage />} />
                    {/* Alert Routes */}
                    <Route path="alerts/low-stock" element={<LowStockAlertPage />} />
                    <Route path="alerts/expiry" element={<ExpiryAlertPage />} />
                    <Route path="alerts/pending-payments" element={<PendingPaymentsPage />} />
                    {/* Reports Route */}
                    <Route path="reports" element={<ReportsPage />} />
                    {/* Invoice Print Route */}
                    <Route path="invoice/:invoiceId/print" element={<InvoicePrintPage />} />
                  </Routes>
                </AdminLayout>
              </ProtectedRoute>
            } 
          />

          {/* Pharmacist Routes */}
          <Route 
            path="/pharmacist" 
            element={
              <ProtectedRoute requiredRole="pharmacist">
                <PharmacistDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Staff Routes */}
          <Route 
            path="/staff" 
            element={
              <ProtectedRoute requiredRole="staff">
                <StaffDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Patient Routes */}
          <Route 
            path="/patient" 
            element={
              <ProtectedRoute requiredRole="patient">
                <PatientDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Customer Routes (using patient role) */}
          <Route 
            path="/customer" 
            element={
              <ProtectedRoute requiredRole="patient">
                <CustomerLayout />
              </ProtectedRoute>
            }
          >
            <Route path="store" element={<MedicineStorePage />} />
            <Route path="cart" element={<CustomerCartPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="order-confirmation" element={<OrderConfirmationPage />} />
            <Route path="orders" element={<OrderHistoryPage />} />
          </Route>

          {/* Retailer Routes */}
          <Route 
            path="/retailer" 
            element={
              <ProtectedRoute requiredRole="retailer">
                <RetailerDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Wholesaler Routes */}
          <Route 
            path="/wholesaler" 
            element={
              <ProtectedRoute requiredRole="wholesaler">
                <WholesalerDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Catch all - redirect to login if not authenticated */}
          <Route 
            path="*" 
            element={<Navigate to={user ? "/" : "/login"} replace />} 
          />
        </Routes>

        {/* Global Toast Notifications */}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </div>
    </Router>
  )
}

// Component to redirect based on user role
function RoleBasedRedirect() {
  const { profile, getRedirectPath } = useAuthStore()
  
  console.log('ðŸ”„ RoleBasedRedirect - Profile:', profile)
  console.log('ðŸ”„ RoleBasedRedirect - Role:', profile?.role)
  
  const redirectPath = getRedirectPath()
  console.log('ðŸ”„ RoleBasedRedirect - Redirecting to:', redirectPath)
  
  return <Navigate to={redirectPath} replace />
}

export default App
