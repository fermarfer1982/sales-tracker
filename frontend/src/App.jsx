import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import LoginPage from './pages/LoginPage';
import ActivitiesTodayPage from './pages/ActivitiesTodayPage';
import QuickRegisterPage from './pages/QuickRegisterPage';
import MyActivitiesPage from './pages/MyActivitiesPage';
import ClientsPage from './pages/ClientsPage';
import ClientCreatePage from './pages/ClientCreatePage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminCatalogsPage from './pages/AdminCatalogsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AuditPage from './pages/AuditPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/activities/today" replace />} />
              <Route path="/activities/today" element={<ActivitiesTodayPage />} />
              <Route path="/activities/quick" element={<QuickRegisterPage />} />
              <Route path="/activities/my" element={<MyActivitiesPage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/clients/new" element={<ClientCreatePage />} />
              <Route element={<ProtectedRoute roles={['manager', 'admin']} />}>
                <Route path="/dashboard" element={<AdminDashboardPage />} />
              </Route>
              <Route element={<ProtectedRoute roles={['admin']} />}>
                <Route path="/admin/catalogs" element={<AdminCatalogsPage />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/audit" element={<AuditPage />} />
                <Route path="/admin/settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
