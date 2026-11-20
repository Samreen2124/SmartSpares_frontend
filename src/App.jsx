import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProductList from './pages/Products/ProductList';
import CategoryList from './pages/Categories/CategoryList';
import SupplierList from './pages/Suppliers/SupplierList';
import CustomerList from './pages/Customers/CustomerList';
import PurchaseOrderList from './pages/Purchases/PurchaseOrderList';
import SalesPOS from './pages/Sales/SalesPOS';
import BatteryManagement from './pages/Batteries/BatteryManagement';
import InventoryLogs from './pages/Inventory/InventoryLogs';
import ReportsCenter from './pages/Reports/ReportsCenter';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Protected Routes inside AppLayout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ProductList />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/categories"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <CategoryList />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/suppliers"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <SupplierList />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <CustomerList />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/purchases"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <PurchaseOrderList />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/sales"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <SalesPOS />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/batteries"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <BatteryManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/inventory"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <InventoryLogs />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ReportsCenter />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
