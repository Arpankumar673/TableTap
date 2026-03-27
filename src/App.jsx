import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from './context/CartContext';

// Customer Pages
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import Success from './pages/Success';

// Admin Pages
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminOrders from './pages/AdminOrders';
import AdminMenu from './pages/AdminMenu';
import AdminTables from './pages/AdminTables';
import AdminSettings from './pages/AdminSettings';
import AdminSMS from './pages/AdminSMS';

// Protected Layout
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <CartProvider>
      <Router>
        <Toaster position="top-center" />
        <Routes>
          {/* Customer Routes */}
          <Route path="/menu/:tableId" element={<Menu />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/success/:orderId" element={<Success />} />
          
          {/* Admin Auth */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          
          {/* Protected Admin Routes */}
          <Route element={<ProtectedRoute />}>
              <Route path="/admin/dashboard" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
              <Route path="/admin/orders" element={<AdminLayout><AdminOrders /></AdminLayout>} />
              <Route path="/admin/menu" element={<AdminLayout><AdminMenu /></AdminLayout>} />
              <Route path="/admin/tables" element={<AdminLayout><AdminTables /></AdminLayout>} />
              <Route path="/admin/settings" element={<AdminLayout><AdminSettings /></AdminLayout>} />
              <Route path="/admin/sms" element={<AdminLayout><AdminSMS /></AdminLayout>} />
              <Route path="/admin/waiter-calls" element={<AdminLayout>
                  <div className="p-10 text-center font-bold text-slate-300">Waiters management screen coming soon!</div>
              </AdminLayout>} />
          </Route>
          
          {/* Default Redirects */}
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="*" element={<div className="min-h-screen flex items-center justify-center font-bold text-slate-200 text-6xl italic">404</div>} />
        </Routes>
      </Router>
    </CartProvider>
  );
}

export default App;
