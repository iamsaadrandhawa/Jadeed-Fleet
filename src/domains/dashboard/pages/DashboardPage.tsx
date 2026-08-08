import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Car,
  Users as UsersIcon,
  UserCheck,
  AlertTriangle,
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  ChevronRight,
  BarChart3,
  LineChart,
  PieChart,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sun,
  Moon,
  Cloud,
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
  monthlyGrowth: {
    vehicles: number;
    drivers: number;
  };
}

interface MonthlyData {
  month: string;
  vehicles: number;
  drivers: number;
  users: number;
}

// Helper function to get greeting based on time
const getGreeting = () => {
  const hour = new Date().getHours();
  let greeting = "Good evening";
  let emoji = "🌙";
  let Icon = Moon;

  if (hour >= 5 && hour < 12) {
    greeting = "Good morning";
    emoji = "🌅";
    Icon = Sun;
  } else if (hour >= 12 && hour < 17) {
    greeting = "Good afternoon";
    emoji = "☀️";
    Icon = Sun;
  } else if (hour >= 17 && hour < 20) {
    greeting = "Good evening";
    emoji = "🌆";
    Icon = Cloud;
  } else {
    greeting = "Good night";
    emoji = "🌙";
    Icon = Moon;
  }

  return { greeting, emoji, Icon };
};

export function DashboardPage() {
  const { permissions, profile } = useAuthStore();
  const [metrics, setMetrics] = useState<Metrics>({
    totalVehicles: 0,
    totalDrivers: 0,
    activeUsers: 0,
    monthlyGrowth: { vehicles: 0, drivers: 0 },
  });
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [expiringLicenses, setExpiringLicenses] = useState<Driver[]>([]);
  const [expiringInsurance, setExpiringInsurance] = useState<Vehicle[]>([]);
  const [vehicleStatus, setVehicleStatus] = useState({ active: 0, maintenance: 0, inactive: 0 });
  const [driverStatus, setDriverStatus] = useState({ active: 0, suspended: 0, inactive: 0 });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentVehicles, setRecentVehicles] = useState<Vehicle[]>([]);
  const [recentDrivers, setRecentDrivers] = useState<Driver[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const { greeting, emoji, Icon } = getGreeting();

  useEffect(() => {
    let mounted = true;

    async function load() {
      const [
        vehiclesRes,
        driversRes,
        usersRes,
        logsRes,
        expiringRes,
        recentVehiclesRes,
        recentDriversRes,
        monthlyVehiclesRes,
        monthlyDriversRes,
      ] = await Promise.all([
        supabase.from("vehicles").select("status, created_at"),
        supabase.from("drivers").select("status, license_expiry, created_at"),
        supabase.from("profiles").select("status, created_at"),
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
        supabase
          .from("vehicles")
          .select("id, make, model, registration_number, status, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("drivers")
          .select("id, full_name, email, status, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("vehicles")
          .select("created_at")
          .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from("drivers")
          .select("created_at")
          .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      if (!mounted) return;

      const vehicles = (vehiclesRes.data ?? []) as Pick<Vehicle, "status" | "created_at">[];
      const drivers = (driversRes.data ?? []) as Pick<Driver, "status" | "license_expiry" | "created_at">[];
      const users = usersRes.data ?? [];
      const allLogs = (logsRes.data ?? []) as AuditLog[];
      const allDrivers = (expiringRes.data ?? []) as Driver[];
      const recentVehiclesData = (recentVehiclesRes.data ?? []) as Vehicle[];
      const recentDriversData = (recentDriversRes.data ?? []) as Driver[];

      // Calculate monthly growth
      const currentMonthVehicles = monthlyVehiclesRes.data?.length ?? 0;
      const currentMonthDrivers = monthlyDriversRes.data?.length ?? 0;

      // Get previous month data (simplified - you can make this more accurate)
      const prevMonthVehicles = Math.max(0, currentMonthVehicles - Math.floor(currentMonthVehicles * 0.2));
      const prevMonthDrivers = Math.max(0, currentMonthDrivers - Math.floor(currentMonthDrivers * 0.15));

      setMetrics({
        totalVehicles: vehicles.length,
        totalDrivers: drivers.length,
        activeUsers: users.filter((u) => u.status === "active").length,
        monthlyGrowth: {
          vehicles: currentMonthVehicles > 0 ? Math.round(((currentMonthVehicles - prevMonthVehicles) / prevMonthVehicles) * 100) : 0,
          drivers: currentMonthDrivers > 0 ? Math.round(((currentMonthDrivers - prevMonthDrivers) / prevMonthDrivers) * 100) : 0,
        },
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
      
      setRecentVehicles(recentVehiclesData);
      setRecentDrivers(recentDriversData);

      // Generate monthly data for chart (mock data - replace with real data)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = new Date().getMonth();
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const idx = (currentMonth - i + 12) % 12;
        monthlyData.push({
          month: months[idx],
          vehicles: Math.floor(Math.random() * 20) + 5,
          drivers: Math.floor(Math.random() * 15) + 3,
          users: Math.floor(Math.random() * 10) + 2,
        });
      }
      setMonthlyData(monthlyData);

      setLoading(false);
    }

    load();
    const interval = setInterval(load, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const canAddDriver = can(permissions, "drivers", "create");
  const canAddVehicle = can(permissions, "vehicles", "create");

  // Calculate max value for chart
  const maxValue = Math.max(
    ...monthlyData.flatMap(d => [d.vehicles, d.drivers, d.users])
  );

  // Format current time
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-6">
      {/* Custom Header without title */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                {greeting}, <span className="text-red-600 dark:text-red-500">{profile?.full_name ?? "User"}</span>!
              </h1>
              
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
            <Activity size={16} /> Refresh
          </Button>
        </div>
      </div>

      {/* Metric cards with growth indicators */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          icon={<Car size={20} />}
          label="Total Vehicles"
          value={metrics.totalVehicles}
          loading={loading}
          growth={metrics.monthlyGrowth.vehicles}
          color="blue"
        />
        <MetricCard
          icon={<UsersIcon size={20} />}
          label="Total Drivers"
          value={metrics.totalDrivers}
          loading={loading}
          growth={metrics.monthlyGrowth.drivers}
          color="green"
        />
        <MetricCard
          icon={<UserCheck size={20} />}
          label="Active Users"
          value={metrics.activeUsers}
          loading={loading}
          color="purple"
        />
      </div>

      {/* Chart Section */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-neutral-400 dark:text-neutral-500" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Growth Overview</h3>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <span className="text-neutral-500 dark:text-neutral-400">Vehicles</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-neutral-500 dark:text-neutral-400">Drivers</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-purple-500" />
              <span className="text-neutral-500 dark:text-neutral-400">Users</span>
            </div>
          </div>
        </div>
        
        <div className="h-64 w-full">
          <svg className="w-full h-full" viewBox="0 0 800 240" preserveAspectRatio="none">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((percent) => {
              const y = 220 - (percent / 100) * 200;
              return (
                <g key={percent}>
                  <line
                    x1="40"
                    y1={y}
                    x2="780"
                    y2={y}
                    stroke="#e5e7eb"
                    strokeWidth="0.5"
                    className="dark:stroke-neutral-700"
                  />
                  <text
                    x="35"
                    y={y + 4}
                    textAnchor="end"
                    fontSize="10"
                    className="fill-neutral-400 dark:fill-neutral-500"
                  >
                    {percent}%
                  </text>
                </g>
              );
            })}

            {/* Data lines */}
            {[
              { data: monthlyData.map(d => d.vehicles), color: '#3b82f6', label: 'Vehicles' },
              { data: monthlyData.map(d => d.drivers), color: '#22c55e', label: 'Drivers' },
              { data: monthlyData.map(d => d.users), color: '#a855f7', label: 'Users' },
            ].map((series, seriesIndex) => {
              const max = Math.max(...series.data, 1);
              const points = series.data.map((value, index) => {
                const x = 40 + (index / (series.data.length - 1)) * 740;
                const y = 220 - (value / max) * 200 * 0.8 - 20;
                return `${x},${y}`;
              }).join(' ');

              const areaPoints = series.data.map((value, index) => {
                const x = 40 + (index / (series.data.length - 1)) * 740;
                const y = 220 - (value / max) * 200 * 0.8 - 20;
                return `${x},${y}`;
              }).join(' ') + ` 780,220 40,220`;

              return (
                <g key={seriesIndex}>
                  {/* Area fill */}
                  <polygon
                    points={areaPoints}
                    fill={series.color}
                    opacity="0.08"
                  />
                  {/* Line */}
                  <polyline
                    points={points}
                    fill="none"
                    stroke={series.color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Data points */}
                  {series.data.map((value, index) => {
                    const x = 40 + (index / (series.data.length - 1)) * 740;
                    const y = 220 - (value / max) * 200 * 0.8 - 20;
                    return (
                      <circle
                        key={index}
                        cx={x}
                        cy={y}
                        r="3.5"
                        fill={series.color}
                        stroke="white"
                        strokeWidth="1.5"
                      />
                    );
                  })}
                </g>
              );
            })}

            {/* X-axis labels */}
            {monthlyData.map((d, index) => {
              const x = 40 + (index / (monthlyData.length - 1)) * 740;
              return (
                <text
                  key={index}
                  x={x}
                  y="235"
                  textAnchor="middle"
                  fontSize="10"
                  className="fill-neutral-400 dark:fill-neutral-500"
                >
                  {d.month}
                </text>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Status overview with gauge */}
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Gauge size={18} className="text-neutral-400 dark:text-neutral-500" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Status Overview</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Vehicles
              </p>
              <div className="space-y-3">
                <StatusRow label="Active" count={vehicleStatus.active} tone="success" total={metrics.totalVehicles} />
                <StatusRow label="In Maintenance" count={vehicleStatus.maintenance} tone="warning" total={metrics.totalVehicles} />
                <StatusRow label="Inactive" count={vehicleStatus.inactive} tone="neutral" total={metrics.totalVehicles} />
              </div>
            </div>
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Drivers
              </p>
              <div className="space-y-3">
                <StatusRow label="Active" count={driverStatus.active} tone="success" total={metrics.totalDrivers} />
                <StatusRow label="Suspended" count={driverStatus.suspended} tone="danger" total={metrics.totalDrivers} />
                <StatusRow label="Inactive" count={driverStatus.inactive} tone="neutral" total={metrics.totalDrivers} />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity & Alerts */}
        <div className="space-y-6">
          {/* Alerts */}
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">System Alerts</h3>
              <Badge tone="neutral" className="ml-auto">
                {expiringLicenses.length}
              </Badge>
            </div>
            <div className="mt-3 space-y-2 max-h-[180px] overflow-y-auto">
              {expiringLicenses.length === 0 ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">All clear! No upcoming alerts.</p>
              ) : (
                expiringLicenses.slice(0, 4).map((d) => {
                  const days = daysUntil(d.license_expiry) ?? 0;
                  return (
                    <Link
                      key={d.id}
                      to={`/UI/drivers/${d.id}`}
                      className="flex items-center justify-between rounded-md border border-amber-100 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/30 px-3 py-2 hover:bg-amber-100/50 dark:hover:bg-amber-950/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                          {d.full_name}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          License expires in {days} day{days === 1 ? "" : "s"}
                        </p>
                      </div>
                      <Badge tone="warning" dot className="ml-2 flex-shrink-0">
                        {days}d
                      </Badge>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-neutral-400 dark:text-neutral-500" />
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Recent Activity</h3>
            </div>
            <div className="mt-3 space-y-3 max-h-[180px] overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">No recent activity.</p>
              ) : (
                logs.slice(0, 4).map((log) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-neutral-900 dark:text-neutral-100">
                        <span className="font-medium">{log.user_email ?? "System"}</span>
                        <span className="text-neutral-500 dark:text-neutral-400 ml-1">
                          {log.description ?? `${log.action} ${log.entity}`}
                        </span>
                      </p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500">{formatDateTime(log.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Items */}
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Recent Activity Feed</h3>
          
          <div className="space-y-4">
            {/* Recent Vehicles */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Recent Vehicles
                </p>
                <Link to="/UI/vehicles" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  View all
                </Link>
              </div>
              <div className="space-y-2">
                {recentVehicles.length === 0 ? (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">No vehicles added recently.</p>
                ) : (
                  recentVehicles.slice(0, 3).map((v) => (
                    <Link
                      key={v.id}
                      to={`/UI/vehicles/${v.id}`}
                      className="flex items-center justify-between rounded-md border border-neutral-100 dark:border-neutral-800 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                          {v.make} {v.model}
                        </p>
                        {v.registration_number && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {v.registration_number}
                          </p>
                        )}
                      </div>
                      <Badge tone={v.status === 'active' ? 'success' : v.status === 'maintenance' ? 'warning' : 'neutral'} dot className="ml-2 flex-shrink-0">
                        {v.status}
                      </Badge>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Recent Drivers
                </p>
                <Link to="/UI/drivers" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  View all
                </Link>
              </div>
              <div className="space-y-2">
                {recentDrivers.length === 0 ? (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">No drivers added recently.</p>
                ) : (
                  recentDrivers.slice(0, 3).map((d) => (
                    <Link
                      key={d.id}
                      to={`/UI/drivers/${d.id}`}
                      className="flex items-center justify-between rounded-md border border-neutral-100 dark:border-neutral-800 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                          {d.full_name}
                        </p>
                        {d.email && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                            {d.email}
                          </p>
                        )}
                      </div>
                      <Badge tone={d.status === 'active' ? 'success' : d.status === 'suspended' ? 'danger' : 'neutral'} dot className="ml-2 flex-shrink-0">
                        {d.status}
                      </Badge>
                    </Link>
                  ))
                )}
              </div>
            </div>
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
  growth,
  color = "blue",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  loading: boolean;
  growth?: number;
  color?: "blue" | "green" | "purple" | "orange";
}) {
  const colors = {
    blue: "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400",
    green: "bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400",
    purple: "bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400",
    orange: "bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400",
  };

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-md ${colors[color]}`}>
          {icon}
        </div>
        {growth !== undefined && !loading && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            growth > 0 ? 'text-green-600 dark:text-green-400' : 
            growth < 0 ? 'text-red-600 dark:text-red-400' : 
            'text-neutral-500 dark:text-neutral-400'
          }`}>
            {growth > 0 ? <ArrowUpRight size={14} /> : 
             growth < 0 ? <ArrowDownRight size={14} /> : 
             <Minus size={14} />}
            {growth !== 0 ? `${Math.abs(growth)}%` : '0%'}
          </div>
        )}
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
        {loading ? "—" : value.toLocaleString()}
      </p>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
      {growth !== undefined && !loading && (
        <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
          {growth > 0 ? '↑' : growth < 0 ? '↓' : '→'} {Math.abs(growth)}% from last month
        </p>
      )}
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
      <Badge tone={tone} dot className="min-w-[80px]">
        {label}
      </Badge>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${barColors[tone]}`} 
          style={{ width: `${pct}%` }} 
        />
      </div>
      <span className="w-12 text-right text-xs font-medium text-neutral-700 dark:text-neutral-300 tabular-nums">
        {count}
        <span className="text-neutral-400 dark:text-neutral-500 text-[10px] ml-0.5">
          ({Math.round(pct)}%)
        </span>
      </span>
    </div>
  );
}