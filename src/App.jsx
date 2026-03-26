import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
// Context & Auth
import { CartProvider } from './context/CartContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';

// Customer Pages
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import Success from './pages/Success';

import AdminMenu from './pages/AdminMenu';
import AdminTables from './pages/AdminTables';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import AdminOrders from './pages/AdminOrders';
import AdminSettings from './pages/AdminSettings';

function App() {
  return (
    <CartProvider>
      <Toaster position="top-center" reverseOrder={false} 
        toastOptions={{ 
            style: { 
                borderRadius: '1.5rem', 
                background: '#fff', 
                color: '#0b1c30', 
                fontWeight: 'bold', 
                fontSize: '12px',
                padding: '16px'
            } 
        }} 
      />
      <Router>
        <Routes>
          {/* Customer Routes (Mobile-first) */}
          <Route path="/menu/:tableId" element={<Menu />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/success/:orderId" element={<Success />} />
          
          {/* Public Admin Route */}
          <Route path="/admin/login" element={<Login />} />
          
          {/* Protected Admin Routes */}
          <Route element={<ProtectedRoute />}>
              <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
              <Route path="/admin/orders" element={<AdminLayout><AdminOrders /></AdminLayout>} />
              <Route path="/admin/menu" element={<AdminLayout><AdminMenu /></AdminLayout>} />
              <Route path="/admin/tables" element={<AdminLayout><AdminTables /></AdminLayout>} />
              <Route path="/admin/settings" element={<AdminLayout><AdminSettings /></AdminLayout>} />
              <Route path="/admin/waiter-calls" element={<AdminLayout>
                  <div className="p-10 text-center font-bold text-slate-300">Waiters management screen coming soon!</div>
              </AdminLayout>} />
          </Route>
          
          {/* Default Redirects */}
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="*" element={<div className="min-h-screen flex items-center justify-center font-bold text-slate-200 text-6xl">404</div>} />
        </Routes>
      </Router>
    </CartProvider>
  );
}

export default App;
