import { useEffect, useState, useMemo, memo, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, Plus, Car, ChevronRight, RefreshCw, Calendar, User, Hash } from "lucide-react";
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
import type { Vehicle } from "@/shared/lib/types";

const PAGE_SIZE = 10;

// Optimized with React.memo and better prop handling
const VehicleDesktopRow = memo(function VehicleDesktopRow({ vehicle }: { vehicle: Vehicle }) {
  const insuranceDays = vehicle.insurance_expiry ? daysUntil(vehicle.insurance_expiry) : null;
  const isInsuranceExpiring = insuranceDays !== null && insuranceDays <= 30 && insuranceDays >= 0;

  return (
    <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:bg-neutral-800">
      <td className="px-4 py-3">
        <Link 
          to={`/UI/vehicles/${vehicle.id}`} 
          className="font-medium text-neutral-900 dark:text-neutral-100 hover:underline"
        >
          {vehicle.make} {vehicle.model}
        </Link>
        {vehicle.year && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">
            {vehicle.year}
          </p>
        )}
      </td>
      <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
        {vehicle.registration_number ?? "—"}
      </td>
      <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
        {vehicle.vin ?? "—"}
      </td>
      <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
        {vehicle.assigned_driver ? vehicle.assigned_driver.full_name : "—"}
      </td>
      <td className="px-4 py-3">
        {vehicle.insurance_expiry ? (
          <div className="flex flex-col">
            <span className="text-neutral-700 dark:text-neutral-300">
              {formatDate(vehicle.insurance_expiry)}
            </span>
            {isInsuranceExpiring && (
              <Badge tone="warning" className="mt-1 text-xs">
                {insuranceDays} days left
              </Badge>
            )}
            {insuranceDays !== null && insuranceDays < 0 && (
              <Badge tone="danger" className="mt-1 text-xs">
                Expired
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-neutral-400 dark:text-neutral-500">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge tone={statusTone(vehicle.status)} dot>
          {vehicle.status}
        </Badge>
      </td>
      <td className="px-4 py-3 text-right">
        <Link 
          to={`/UI/vehicles/${vehicle.id}`} 
          className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 dark:text-neutral-100"
        >
          <ChevronRight size={18} />
        </Link>
      </td>
    </tr>
  );
});

const VehicleMobileCard = memo(function VehicleMobileCard({ vehicle }: { vehicle: Vehicle }) {
  const insuranceDays = vehicle.insurance_expiry ? daysUntil(vehicle.insurance_expiry) : null;
  const isInsuranceExpiring = insuranceDays !== null && insuranceDays <= 30 && insuranceDays >= 0;

  return (
    <Link 
      key={vehicle.id} 
      to={`/UI/vehicles/${vehicle.id}`} 
      className="block px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:bg-neutral-800"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-neutral-900 dark:text-neutral-100">
            {vehicle.make} {vehicle.model}
          </p>
          {vehicle.year && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">
              {vehicle.year}
            </p>
          )}
        </div>
        <Badge tone={statusTone(vehicle.status)} dot>
          {vehicle.status}
        </Badge>
      </div>
      
      <div className="mt-2 space-y-1 text-sm">
        {vehicle.registration_number && (
          <p className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
            <Hash size={14} className="text-neutral-400 dark:text-neutral-500" />
            <span>{vehicle.registration_number}</span>
          </p>
        )}
        {vehicle.assigned_driver && (
          <p className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
            <User size={14} className="text-neutral-400 dark:text-neutral-500" />
            <span>Driver: {vehicle.assigned_driver.full_name}</span>
          </p>
        )}
        {vehicle.insurance_expiry && (
          <p className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
            <Calendar size={14} className="text-neutral-400 dark:text-neutral-500" />
            <span>
              Insurance: {formatDate(vehicle.insurance_expiry)}
              {isInsuranceExpiring && (
                <Badge tone="warning" className="ml-2 text-xs">
                  {insuranceDays}d left
                </Badge>
              )}
              {insuranceDays !== null && insuranceDays < 0 && (
                <Badge tone="danger" className="ml-2 text-xs">
                  Expired
                </Badge>
              )}
            </span>
          </p>
        )}
        {vehicle.vin && (
          <p className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
            <Hash size={14} className="text-neutral-400 dark:text-neutral-500" />
            <span className="text-xs">VIN: {vehicle.vin}</span>
          </p>
        )}
      </div>
    </Link>
  );
});

export function VehicleListPage() {
  const location = useLocation();
  const { permissions } = useAuthStore();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
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

  const canCreate = can(permissions, "vehicles", "create");

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, debouncedStatus]);

  // Optimized load function with better error handling
  const loadVehicles = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    
    setError(null);

    try {
      // Build the query
      let query = supabase
        .from("vehicles")
        .select(`
          id, 
          make, 
          model, 
          year, 
          vin, 
          registration_number, 
          insurance_expiry, 
          status,
          assigned_driver:assigned_driver_id (
            id,
            full_name
          )
        `, { count: "exact" });

      // Apply search filter
      if (debouncedSearch) {
        query = query.or(
          `make.ilike.%${debouncedSearch}%,model.ilike.%${debouncedSearch}%,vin.ilike.%${debouncedSearch}%,registration_number.ilike.%${debouncedSearch}%`
        );
      }
      
      // Apply status filter
      if (debouncedStatus) {
        query = query.eq("status", debouncedStatus);
      }

      // Apply ordering and pagination
      query = query
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      const { data, count, error: queryError } = await query;
      
      if (queryError) {
        console.error("Error loading vehicles:", queryError);
        setError(`Failed to load vehicles: ${queryError.message}`);
        setVehicles([]);
        setTotal(0);
      } else {
        console.log("Loaded vehicles:", data); // Debug log
        setVehicles((data ?? []) as Vehicle[]);
        setTotal(count ?? 0);
      }
    } catch (error) {
      console.error("Failed to load vehicles:", error);
      setError("An unexpected error occurred while loading vehicles");
      setVehicles([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, debouncedSearch, debouncedStatus]);

  // Load vehicles on mount and when dependencies change
  useEffect(() => {
    loadVehicles(true);
  }, [loadVehicles]);

  // Handle refresh from create/update
  useEffect(() => {
    if (location.state?.refresh) {
      const newVehicle = location.state?.newVehicle;
      if (newVehicle) {
        setSuccessMessage(`✅ ${newVehicle} created successfully!`);
        const timer = setTimeout(() => setSuccessMessage(null), 5000);
        return () => clearTimeout(timer);
      }
      
      loadVehicles(false);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, loadVehicles]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setSuccessMessage(null);
    setError(null);
    loadVehicles(false);
  }, [loadVehicles]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

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
        title="Vehicles"
        description={`${total} vehicle${total === 1 ? "" : "s"} in the fleet`}
        actions={
          <div className="flex items-center gap-2">
            {canCreate && (
              <Link to="/UI/vehicles/new">
                <Button size="sm">
                  <Plus size={16} /> Add Vehicle
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
              <option value="maintenance">In Maintenance</option>
              <option value="inactive">Inactive</option>
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
                placeholder="Search vehicles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 pl-9 pr-3 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 dark:text-neutral-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500"
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
        ) : vehicles.length === 0 ? (
          <EmptyState
            icon={<Car size={24} />}
            title="No vehicles found"
            description={error ? "There was an error loading vehicles." : "Try adjusting your filters or add a new vehicle."}
            action={
              canCreate ? (
                <Link to="/UI/vehicles/new">
                  <Button size="sm">
                    <Plus size={16} /> Add Vehicle
                  </Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">Registration</th>
                    <th className="px-4 py-3">VIN</th>
                    <th className="px-4 py-3">Assigned Driver</th>
                    <th className="px-4 py-3">Insurance Expiry</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {vehicles.map((vehicle) => (
                    <VehicleDesktopRow key={vehicle.id} vehicle={vehicle} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800 md:hidden">
              {vehicles.map((vehicle) => (
                <VehicleMobileCard key={vehicle.id} vehicle={vehicle} />
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