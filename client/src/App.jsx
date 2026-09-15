import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import {
  AuthProvider,
  useAuth,
} from "./context/AuthContext";

import Layout from "./components/Layout";

import {
  Login,
  Register,
} from "./pages/Auth";

import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import NewOrder from "./pages/NewOrder";
import Inventory from "./pages/Inventory";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import ComingSoon from "./pages/ComingSoon";
import Expenses from "./pages/Expenses";
import Settings from "./pages/Settings";
import Services from "./pages/Services";
import CustomerChats from "./pages/CustomerChats";

import {
  Files,
  Customers,
  Movements,
  Logs,
  Payments,
  Reports,
} from "./pages/AdminPages";

// Protect pages that require login
function Protected({ children, role }) {
  const { user } = useAuth();

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (role && user.role !== role) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  return (
    <Layout>
      {children}
    </Layout>
  );
}

// Admin-only page wrapper
function AdminRoute({ children }) {
  return (
    <Protected role="admin">
      {children}
    </Protected>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public pages */}
      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      {/* Dashboard */}
      <Route
        path="/"
        element={
          <Protected>
            <Dashboard />
          </Protected>
        }
      />

      {/* Order pages */}
      <Route
        path="/orders"
        element={
          <Protected>
            <Orders />
          </Protected>
        }
      />

      <Route
        path="/new-order"
        element={
          <Protected>
            <NewOrder />
          </Protected>
        }
      />

      {/* Profile */}
      <Route
        path="/profile"
        element={
          <Protected>
            <Profile />
          </Protected>
        }
      />

      {/* Notifications */}
      <Route
        path="/notifications"
        element={
          <Protected>
            <Notifications />
          </Protected>
        }
      />

      {/* Uploaded files */}
      <Route
        path="/files"
        element={
          <Protected>
            <Files />
          </Protected>
        }
      />

      {/* Payments */}
      <Route
        path="/payments"
        element={
          <Protected>
            <Payments />
          </Protected>
        }
      />

      {/* Customer help page */}
      <Route
        path="/help"
        element={
          <Protected>
            <ComingSoon title="Help & Support" />
          </Protected>
        }
      />

      {/* Admin customer chats */}
      <Route
        path="/admin/chats"
        element={
          <AdminRoute>
            <CustomerChats />
          </AdminRoute>
        }
      />

      {/* Admin customers */}
      <Route
        path="/customers"
        element={
          <AdminRoute>
            <Customers />
          </AdminRoute>
        }
      />

      {/* Admin inventory */}
      <Route
        path="/inventory"
        element={
          <AdminRoute>
            <Inventory />
          </AdminRoute>
        }
      />

      {/* Admin inventory movements */}
      <Route
        path="/movements"
        element={
          <AdminRoute>
            <Movements />
          </AdminRoute>
        }
      />

      {/* Admin services */}
      <Route
        path="/services"
        element={
          <AdminRoute>
            <Services />
          </AdminRoute>
        }
      />

      {/* Admin expenses */}
      <Route
        path="/expenses"
        element={
          <AdminRoute>
            <Expenses />
          </AdminRoute>
        }
      />

      {/* Admin reports */}
      <Route
        path="/reports"
        element={
          <AdminRoute>
            <Reports />
          </AdminRoute>
        }
      />

      {/* Admin activity logs */}
      <Route
        path="/logs"
        element={
          <AdminRoute>
            <Logs />
          </AdminRoute>
        }
      />

      {/* Admin settings */}
      <Route
        path="/settings"
        element={
          <AdminRoute>
            <Settings />
          </AdminRoute>
        }
      />

      {/* Admin walk-in orders */}
      <Route
        path="/walk-in"
        element={
          <AdminRoute>
            <ComingSoon title="Walk-In Orders" />
          </AdminRoute>
        }
      />

      {/* Invalid address */}
      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
    </Routes>
  );
}

export default function App() {
  if (localStorage.theme === "dark") {
    document.documentElement.classList.add("dark");
  }

  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}