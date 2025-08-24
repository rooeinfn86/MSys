import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from "./Dashboard";
import LoginPage from "./LoginPage";
import PrivateRoute from "./PrivateRoute";
import PlatformAdminDashboard from "./PlatformAdminDashboard";
import { jwtDecode } from "jwt-decode";
import "./index.css";
import DeviceLogs from './DeviceLogs';
import NetworkTopology from './pages/NetworkTopology';
import CompanyTokenManagement from './CompanyTokenManagement';

import Agents from './Agents';

// Context Providers
import { AuthProvider } from './contexts/AuthContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import ErrorBoundary from './components/ErrorBoundary';

// Security utilities
import { enableRobustSecureLogging } from './utils/robustSecureLogging';
import { tokenManager } from './utils/secureStorage';

// ✅ Synchronous role-based redirect logic
const RedirectHandler = () => {
  const token = tokenManager.getToken();

  if (!token || !tokenManager.isValidToken(token)) {
    return <Navigate to="/login" replace />;
  }

  try {
    const decoded = jwtDecode(token);
    if (decoded.role === "superadmin") {
      return <Navigate to="/platform-admin" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  } catch (err) {
    return <Navigate to="/login" replace />;
  }
};

function App() {
  // Enable robust secure logging
  React.useEffect(() => {
    const restoreLogging = enableRobustSecureLogging();
    
    // Test secure logging in development
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        console.log('🔒 Secure logging is active!');
      }, 1000);
    }
    
    return restoreLogging;
  }, []);

  return (
    <AuthProvider>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<RedirectHandler />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <OrganizationProvider>
                  <Dashboard />
                </OrganizationProvider>
              </PrivateRoute>
            }
          />
          <Route
            path="/platform-admin"
            element={
              <PrivateRoute>
                <PlatformAdminDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/device-logs"
            element={
              <PrivateRoute>
                <OrganizationProvider>
                  <DeviceLogs />
                </OrganizationProvider>
              </PrivateRoute>
            }
          />
          <Route
            path="/network-topology"
            element={
              <PrivateRoute>
                <OrganizationProvider>
                  <NetworkTopology />
                </OrganizationProvider>
              </PrivateRoute>
            }
          />
          <Route
            path="/company-tokens"
            element={
              <PrivateRoute>
                <OrganizationProvider>
                  <CompanyTokenManagement />
                </OrganizationProvider>
              </PrivateRoute>
            }
          />

          <Route
            path="/agents"
            element={
              <PrivateRoute>
                <OrganizationProvider>
                  <Agents />
                </OrganizationProvider>
              </PrivateRoute>
            }
          />
        </Routes>
      </ErrorBoundary>
    </AuthProvider>
  );
}

export default App;
