import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DevicesPage from './pages/DevicesPage';
import PersonsPage from './pages/PersonsPage';
import CredentialsPage from './pages/CredentialsPage';
import DoorsPage from './pages/DoorsPage';
import EventsPage from './pages/EventsPage';
import DeploymentsPage from './pages/DeploymentsPage';
import PoliciesPage from './pages/PoliciesPage';
import AuditPage from './pages/AuditPage';
import DeviceManagementPage from './pages/DeviceManagementPage';

function PrivateRoute({ children }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { isLoggedIn } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <Layout>
              <Routes>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/devices" element={<DevicesPage />} />
                <Route path="/persons" element={<PersonsPage />} />
                <Route path="/credentials" element={<CredentialsPage />} />
                <Route path="/doors" element={<DoorsPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/deployments" element={<DeploymentsPage />} />
                <Route path="/policies" element={<PoliciesPage />} />
                <Route path="/audit" element={<AuditPage />} />
                <Route path="/device-mgmt" element={<DeviceManagementPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </PrivateRoute>
        }
      />
      <Route path="/" element={<Navigate to={isLoggedIn ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1d2e',
              color: '#e2e8f0',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#a78bfa', secondary: '#1a1d2e' } },
            error: { iconTheme: { primary: '#f87171', secondary: '#1a1d2e' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
