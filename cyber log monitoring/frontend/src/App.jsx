import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AuditTrail from "./pages/AuditTrail";
import Alerts from "./pages/Alerts";
import SessionTimeline from "./pages/SessionTimeline";
import Simulate from "./pages/Simulate";

function Shell({ children }) {
  return (
    <div className="min-h-full bg-slate-950 text-slate-100">
      <Navbar />
      {children}
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Shell>
              <Dashboard />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit-trail"
        element={
          <ProtectedRoute>
            <Shell>
              <AuditTrail />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/alerts"
        element={
          <ProtectedRoute>
            <Shell>
              <Alerts />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions"
        element={
          <ProtectedRoute>
            <Shell>
              <SessionTimeline />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/simulate"
        element={
          <ProtectedRoute>
            <Shell>
              <Simulate />
            </Shell>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
