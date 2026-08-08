import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Car,
  Users as UsersIcon,
  UserCheck,
  Plus,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { supabase } from "@/shared/lib/supabaseClient";
import { useAuthStore } from "@/shared/store/authStore";
import { can } from "@/shared/lib/permissions";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { formatDateTime, daysUntil } from "@/shared/lib/formatters";
import type { AuditLog, Driver, Vehicle } from "@/shared/lib/types";

interface Metrics {
  totalVehicles: number;
  totalDrivers: number;
  activeUsers: number;
}

export function DashboardPage() {
  const { permissions, profile } = useAuthStore();
  const [metrics, setMetrics] = useState<Metrics>({
    totalVehicles: 0,
    totalDrivers: 0,
    activeUsers: 0,
  });
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [expiringLicenses, setExpiringLicenses] = useState<Driver[]>([]);
  const [vehicleStatus, setVehicleStatus] = useState({ active: 0, maintenance: 0, inactive: 0 });
  const [driverStatus, setDriverStatus] = useState({ active: 0, suspended: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const [vehiclesRes, driversRes, usersRes, logsRes, expiringRes] =
        await Promise.all([
          supabase.from("vehicles").select("status"),
          supabase.from("drivers").select("status, license_expiry"),
          supabase.from("profiles").select("status"),
          supabase
            .from("audit_logs")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(8),
          supabase
            .from("drivers")
            .select("id, full_name, license_expiry, status")
            .order("license_expiry", { ascending: true })
            .limit(50),
        ]);

      if (!mounted) return;

      const vehicles = (vehiclesRes.data ?? []) as Pick<Vehicle, "status">[];
      const drivers = (driversRes.data ?? []) as Pick<Driver, "status" | "license_expiry">[];
      const users = usersRes.data ?? [];
      const allLogs = (logsRes.data ?? []) as AuditLog[];
      const allDrivers = (expiringRes.data ?? []) as Driver[];

      setMetrics({
        totalVehicles: vehicles.length,
        totalDrivers: drivers.length,
        activeUsers: users.filter((u) => u.status === "active").length,
      });

      setVehicleStatus({
        active: vehicles.filter((v) => v.status === "active").length,
        maintenance: vehicles.filter((v) => v.status === "maintenance").length,
        inactive: vehicles.filter((v) => v.status === "inactive").length,
      });
      setDriverStatus({
        active: drivers.filter((d) => d.status === "active").length,
        suspended: drivers.filter((d) => d.status === "suspended").length,
        inactive: drivers.filter((d) => d.status === "inactive").length,
      });

      setLogs(allLogs);
      setExpiringLicenses(
        allDrivers.filter((d) => {
          const days = daysUntil(d.license_expiry);
          return days !== null && days <= 30 && days >= 0;
        })
      );
      setLoading(false);
    }

    load();
    const interval = setInterval(load, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const canAddDriver = can(permissions, "drivers", "create");
  const canAddVehicle = can(permissions, "vehicles", "create");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${profile?.full_name ?? "User"}.`}
        actions={
          <div className="flex gap-2">
            {canAddDriver && (
              <Link to="/UI/drivers/new">
                <Button variant="secondary" size="sm">
                  <Plus size={16} /> Add Driver
                </Button>
              </Link>
            )}
            {canAddVehicle && (
              <Link to="/UI/vehicles/new">
                <Button size="sm">
                  <Plus size={16} /> Add Vehicle
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          icon={<Car size={20} />}
          label="Total Vehicles"
          value={metrics.totalVehicles}
          loading={loading}
        />
        <MetricCard
          icon={<UsersIcon size={20} />}
          label="Total Drivers"
          value={metrics.totalDrivers}
          loading={loading}
        />
        <MetricCard
          icon={<UserCheck size={20} />}
          label="Active Users"
          value={metrics.activeUsers}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Status overview */}
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Status Overview</h3>
          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">
                Vehicles
              </p>
              <div className="space-y-2">
                <StatusRow label="Active" count={vehicleStatus.active} tone="success" total={metrics.totalVehicles} />
                <StatusRow label="In Maintenance" count={vehicleStatus.maintenance} tone="warning" total={metrics.totalVehicles} />
                <StatusRow label="Inactive" count={vehicleStatus.inactive} tone="neutral" total={metrics.totalVehicles} />
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">
                Drivers
              </p>
              <div className="space-y-2">
                <StatusRow label="Active" count={driverStatus.active} tone="success" total={metrics.totalDrivers} />
                <StatusRow label="Suspended" count={driverStatus.suspended} tone="danger" total={metrics.totalDrivers} />
                <StatusRow label="Inactive" count={driverStatus.inactive} tone="neutral" total={metrics.totalDrivers} />
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">System Alerts</h3>
          </div>
          <div className="mt-4 space-y-2">
            {expiringLicenses.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">No upcoming alerts.</p>
            ) : (
              expiringLicenses.slice(0, 5).map((d) => {
                const days = daysUntil(d.license_expiry) ?? 0;
                return (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-md border border-amber-100 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/30 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{d.full_name}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">
                        License expires in {days} day{days === 1 ? "" : "s"}
                      </p>
                    </div>
                    <Badge tone="warning" dot>
                      {days}d
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Activity feed */}
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-neutral-400 dark:text-neutral-500" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Recent Activity</h3>
          </div>
          <div className="mt-4 space-y-3">
            {logs.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">No recent activity.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3">
                  <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-neutral-900 dark:text-neutral-100">
                      <span className="font-medium">{log.user_email ?? "System"}</span>{" "}
                      <span className="text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">{log.description ?? `${log.action} ${log.entity}`}</span>
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">{formatDateTime(log.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600">
          {icon}
        </div>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
        {loading ? "—" : value}
      </p>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">{label}</p>
    </div>
  );
}

function StatusRow({
  label,
  count,
  tone,
  total,
}: {
  label: string;
  count: number;
  tone: "success" | "warning" | "danger" | "neutral";
  total: number;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const barColors: Record<string, string> = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
    neutral: "bg-neutral-400",
  };
  return (
    <div className="flex items-center gap-3">
      <Badge tone={tone} dot>
        {label}
      </Badge>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div className={`h-full rounded-full ${barColors[tone]}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-xs font-medium text-neutral-700 dark:text-neutral-300">{count}</span>
    </div>
  );
}
