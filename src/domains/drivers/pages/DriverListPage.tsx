import { useEffect, useState, useMemo, memo, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, Plus, Users as UsersIcon, ChevronRight, RefreshCw, Calendar, Hash, Mail, Car } from "lucide-react";
import { supabase } from "@/shared/lib/supabaseClient";
import { useAuthStore } from "@/shared/store/authStore";
import { can } from "@/shared/lib/permissions";
import { useDebouncedValue } from "@/shared/lib/useDebouncedValue";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Button } from "@/shared/ui/Button";
import { Input, Select } from "@/shared/ui/Input";
import { Badge, statusTone } from "@/shared/ui/Badge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Pagination } from "@/shared/ui/Pagination";
import { formatDate, daysUntil } from "@/shared/lib/formatters";
import type { Driver } from "@/shared/lib/types";

const PAGE_SIZE = 10;

interface DriverRow extends Driver {
  daysLeft: number | null;
  expiring: boolean;
}

const DriverDesktopRow = memo(function DriverDesktopRow({ d }: { d: DriverRow }) {
  const licenseDays = d.license_expiry ? daysUntil(d.license_expiry) : null;
  const isExpiring = licenseDays !== null && licenseDays <= 30 && licenseDays >= 0;
  const isExpired = licenseDays !== null && licenseDays < 0;

  return (
    <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:bg-neutral-800">
      <td className="px-4 py-3">
        <Link 
          to={`/UI/drivers/${d.id}`} 
          className="font-medium text-neutral-900 dark:text-neutral-100 hover:underline"
        >
          {d.full_name}
        </Link>
        {d.email && (
          <p className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
            <Mail size={12} />
            {d.email}
          </p>
        )}
      </td>
      <td className="px-4 py-3">
        {d.license_number ? (
          <div className="flex flex-col">
            <span className="text-neutral-700 dark:text-neutral-300">{d.license_number}</span>
            {d.license_class && (
              <span className="text-xs text-neutral-400 dark:text-neutral-500">Class: {d.license_class}</span>
            )}
          </div>
        ) : (
          <span className="text-neutral-400 dark:text-neutral-500">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {d.license_expiry ? (
          <div className="flex flex-col">
            <span className="text-neutral-700 dark:text-neutral-300">
              {formatDate(d.license_expiry)}
            </span>
            {isExpiring && (
              <Badge tone="warning" className="mt-1 text-xs">
                {licenseDays} days left
              </Badge>
            )}
            {isExpired && (
              <Badge tone="danger" className="mt-1 text-xs">
                Expired
              </Badge>
            )}
            {!isExpiring && !isExpired && licenseDays !== null && (
              <Badge tone="success" className="mt-1 text-xs">
                {licenseDays} days left
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-neutral-400 dark:text-neutral-500">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {d.assigned_vehicle ? (
          <div className="flex flex-col">
            <span className="text-neutral-700 dark:text-neutral-300">
              {d.assigned_vehicle.make} {d.assigned_vehicle.model}
            </span>
            <Link 
              to={`/UI/vehicles/${d.assigned_vehicle.id}`}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              View Vehicle
            </Link>
          </div>
        ) : (
          <span className="text-neutral-400 dark:text-neutral-500">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge tone={statusTone(d.status)} dot>
          {d.status}
        </Badge>
      </td>
      <td className="px-4 py-3 text-right">
        <Link 
          to={`/UI/drivers/${d.id}`} 
          className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <ChevronRight size={18} />
        </Link>
      </td>
    </tr>
  );
});

const DriverMobileCard = memo(function DriverMobileCard({ d }: { d: DriverRow }) {
  const licenseDays = d.license_expiry ? daysUntil(d.license_expiry) : null;
  const isExpiring = licenseDays !== null && licenseDays <= 30 && licenseDays >= 0;
  const isExpired = licenseDays !== null && licenseDays < 0;

  return (
    <Link
      key={d.id}
      to={`/UI/drivers/${d.id}`}
      className="block px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-neutral-900 dark:text-neutral-100">{d.full_name}</p>
          {d.email && (
            <p className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
              <Mail size={12} />
              {d.email}
            </p>
          )}
        </div>
        <Badge tone={statusTone(d.status)} dot>{d.status}</Badge>
      </div>
      
      <div className="mt-2 space-y-1 text-sm">
        {d.license_number && (
          <p className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
            <Hash size={14} className="text-neutral-400 dark:text-neutral-500" />
            <span>License: {d.license_number}</span>
            {d.license_class && (
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                ({d.license_class})
              </span>
            )}
          </p>
        )}
        {d.license_expiry && (
          <p className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
            <Calendar size={14} className="text-neutral-400 dark:text-neutral-500" />
            <span>
              Expires: {formatDate(d.license_expiry)}
              {isExpiring && (
                <Badge tone="warning" className="ml-2 text-xs">
                  {licenseDays}d left
                </Badge>
              )}
              {isExpired && (
                <Badge tone="danger" className="ml-2 text-xs">
                  Expired
                </Badge>
              )}
            </span>
          </p>
        )}
        {d.assigned_vehicle && (
          <p className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
            <Car size={14} className="text-neutral-400 dark:text-neutral-500" />
            <span>
              Vehicle: {d.assigned_vehicle.make} {d.assigned_vehicle.model}
            </span>
          </p>
        )}
      </div>
    </Link>
  );
});

export function DriverListPage() {
  const location = useLocation();
  const { permissions } = useAuthStore();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search);
  const debouncedStatus = useDebouncedValue(statusFilter);

  const canCreate = can(permissions, "drivers", "create");

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, debouncedStatus]);

  // Optimized load function with better error handling
  const loadDrivers = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    
    setError(null);

    try {
      let query = supabase
        .from("drivers")
        .select(`
          id, 
          full_name, 
          email, 
          license_number, 
          license_class, 
          license_expiry, 
          status,
          assigned_vehicle:assigned_vehicle_id (
            id,
            make,
            model
          )
        `, { count: "exact" });

      if (debouncedSearch) {
        query = query.or(
          `full_name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,license_number.ilike.%${debouncedSearch}%`
        );
      }
      
      if (debouncedStatus) {
        query = query.eq("status", debouncedStatus);
      }

      query = query
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      const { data, count, error: queryError } = await query;
      
      if (queryError) {
        console.error("Error loading drivers:", queryError);
        setError(`Failed to load drivers: ${queryError.message}`);
        setDrivers([]);
        setTotal(0);
      } else {
        setDrivers((data ?? []) as Driver[]);
        setTotal(count ?? 0);
      }
    } catch (error) {
      console.error("Failed to load drivers:", error);
      setError("An unexpected error occurred while loading drivers");
      setDrivers([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, debouncedSearch, debouncedStatus]);

  // Load drivers on mount and when dependencies change
  useEffect(() => {
    loadDrivers(true);
  }, [loadDrivers]);

  // Handle refresh from create/update
  useEffect(() => {
    if (location.state?.refresh) {
      const newDriver = location.state?.newDriver;
      if (newDriver) {
        setSuccessMessage(`✅ ${newDriver} created successfully!`);
        const timer = setTimeout(() => setSuccessMessage(null), 5000);
        return () => clearTimeout(timer);
      }
      
      loadDrivers(false);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, loadDrivers]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setSuccessMessage(null);
    setError(null);
    loadDrivers(false);
  }, [loadDrivers]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const rows = useMemo<DriverRow[]>(() => {
    return drivers.map((d) => {
      const days = daysUntil(d.license_expiry);
      return {
        ...d,
        daysLeft: days,
        expiring: days !== null && days <= 30 && days >= 0,
      };
    });
  }, [drivers]);

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-sm text-green-800 dark:text-green-200 animate-in fade-in slide-in-from-top-2 duration-300">
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <PageHeader
        title="Drivers"
        description={`${total} driver${total === 1 ? "" : "s"} in the fleet`}
        actions={
          <div className="flex items-center gap-2">
            {canCreate && (
              <Link to="/UI/drivers/new">
                <Button size="sm">
                  <Plus size={16} /> Add Driver
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        {/* Filter bar with search on the right */}
        <div className="flex flex-col gap-3 border-b border-neutral-200 dark:border-neutral-800 p-4 sm:flex-row sm:items-center">
          {/* Status filter on the left */}
          <div className="sm:w-48">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </Select>
          </div>
          
          {/* Spacer to push search to the right */}
          <div className="flex-1" />
          
          {/* Search and refresh on the right */}
          <div className="flex items-center gap-2 sm:w-auto w-full">
            <div className="relative flex-1 sm:min-w-[200px]">
              <Search 
                size={16} 
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" 
              />
              <input
                type="text"
                placeholder="Search drivers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 pl-9 pr-3 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500"
              />
            </div>
            
            {/* Refresh Button */}
            <Button
              size="sm"
              variant="secondary"
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="flex-shrink-0"
            >
              <RefreshCw 
                size={16} 
                className={`${refreshing ? 'animate-spin' : ''}`} 
              />
              <span className="sr-only">Refresh</span>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-200 dark:border-neutral-800 border-t-neutral-900 dark:border-t-neutral-100" />
          </div>
        ) : drivers.length === 0 ? (
          <EmptyState
            icon={<UsersIcon size={24} />}
            title="No drivers found"
            description={error ? "There was an error loading drivers." : "Try adjusting your filters or add a new driver."}
            action={
              canCreate ? (
                <Link to="/UI/drivers/new">
                  <Button size="sm">
                    <Plus size={16} /> Add Driver
                  </Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">License</th>
                    <th className="px-4 py-3">License Expiry</th>
                    <th className="px-4 py-3">Assigned Vehicle</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {rows.map((d) => (
                    <DriverDesktopRow key={d.id} d={d} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800 md:hidden">
              {rows.map((d) => (
                <DriverMobileCard key={d.id} d={d} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-neutral-200 dark:border-neutral-800 px-4 py-3">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}