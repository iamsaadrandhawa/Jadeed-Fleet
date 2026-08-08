import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { useAuthStore } from "@/shared/store/authStore";
import { ProtectedRoute } from "./ProtectedRoute";
import { LoginPage } from "@/domains/auth/ui/LoginPage";

const DashboardPage = lazy(() =>
  import("@/domains/dashboard/pages/DashboardPage").then((m) => ({ default: m.DashboardPage }))
);
const DriverListPage = lazy(() =>
  import("@/domains/drivers/pages/DriverListPage").then((m) => ({ default: m.DriverListPage }))
);
const AddDriverPage = lazy(() =>
  import("@/domains/drivers/pages/AddDriverPage").then((m) => ({ default: m.AddDriverPage }))
);
const DriverDetailPage = lazy(() =>
  import("@/domains/drivers/pages/DriverDetailPage").then((m) => ({ default: m.DriverDetailPage }))
);
const VehicleListPage = lazy(() =>
  import("@/domains/vehicles/pages/VehicleListPage").then((m) => ({ default: m.VehicleListPage }))
);
const AddVehiclePage = lazy(() =>
  import("@/domains/vehicles/pages/AddVehiclePage").then((m) => ({ default: m.AddVehiclePage }))
);
const VehicleDetailPage = lazy(() =>
  import("@/domains/vehicles/pages/VehicleDetailPage").then((m) => ({ default: m.VehicleDetailPage }))
);
const UsersPage = lazy(() =>
  import("@/domains/users/pages/UsersPage").then((m) => ({ default: m.UsersPage }))
);
const RolesPage = lazy(() =>
  import("@/domains/roles/pages/RolesPage").then((m) => ({ default: m.RolesPage }))
);
const AuditLogsPage = lazy(() =>
  import("@/domains/audit-logs/pages/AuditLogsPage").then((m) => ({ default: m.AuditLogsPage }))
);
const SettingsPage = lazy(() =>
  import("@/domains/settings/pages/SettingsPage").then((m) => ({ default: m.SettingsPage }))
);

function RouteSpinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900 dark:border-neutral-700 dark:border-t-neutral-100" />
    </div>
  );
}

export function AppRouter() {
  const { ready, session } = useAuthStore();

  if (!ready) {
    return <RouteSpinner />;
  }

  return (
    <Suspense fallback={<RouteSpinner />}>
      <Routes>
        <Route path="/UI/login" element={session ? <Navigate to="/UI/dashboard" replace /> : <LoginPage />} />
        <Route path="/UI/dashboard" element={<ProtectedRoute domain="dashboard"><DashboardPage /></ProtectedRoute>} />
        <Route path="/UI/drivers" element={<ProtectedRoute domain="drivers"><DriverListPage /></ProtectedRoute>} />
        <Route path="/UI/drivers/new" element={<ProtectedRoute domain="drivers"><AddDriverPage /></ProtectedRoute>} />
        <Route path="/UI/drivers/:id" element={<ProtectedRoute domain="drivers"><DriverDetailPage /></ProtectedRoute>} />
        <Route path="/UI/vehicles" element={<ProtectedRoute domain="vehicles"><VehicleListPage /></ProtectedRoute>} />
        <Route path="/UI/vehicles/new" element={<ProtectedRoute domain="vehicles"><AddVehiclePage /></ProtectedRoute>} />
        <Route path="/UI/vehicles/:id" element={<ProtectedRoute domain="vehicles"><VehicleDetailPage /></ProtectedRoute>} />
        <Route path="/UI/users" element={<ProtectedRoute domain="users"><UsersPage /></ProtectedRoute>} />
        <Route path="/UI/roles" element={<ProtectedRoute domain="roles"><RolesPage /></ProtectedRoute>} />
        <Route path="/UI/logs" element={<ProtectedRoute domain="logs"><AuditLogsPage /></ProtectedRoute>} />
        <Route path="/UI/settings" element={<ProtectedRoute domain="settings"><SettingsPage /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/UI/login" replace />} />
        <Route path="*" element={<Navigate to="/UI/login" replace />} />
      </Routes>
    </Suspense>
  );
}
