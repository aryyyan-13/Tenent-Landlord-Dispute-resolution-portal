import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import FileDispute from './pages/FileDispute.jsx';
import CaseTracking from './pages/CaseTracking.jsx';
import CaseDetail from './pages/CaseDetail.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/file-dispute"
        element={
          <PrivateRoute roles={['tenant', 'landlord']}>
            <FileDispute />
          </PrivateRoute>
        }
      />
      <Route
        path="/cases"
        element={
          <PrivateRoute>
            <CaseTracking />
          </PrivateRoute>
        }
      />
      <Route
        path="/cases/:id"
        element={
          <PrivateRoute>
            <CaseDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <PrivateRoute roles={['admin']}>
            <AdminPanel />
          </PrivateRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
