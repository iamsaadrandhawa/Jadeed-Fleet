import { useEffect, useState, useMemo, memo } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Car, ChevronRight } from "lucide-react";
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
import { formatDate } from "@/shared/lib/formatters";
import type { Vehicle } from "@/shared/lib/types";

const PAGE_SIZE = 10;

const VehicleDesktopRow = memo(function VehicleDesktopRow({ v }: { v: Vehicle }) {
  return (
    <tr key={v.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:bg-neutral-800">
      <td className="px-4 py-3">
        <Link to={`/UI/vehicles/${v.id}`} className="font-medium text-neutral-900 dark:text-neutral-100 hover:underline">
          {v.make} {v.model}
        </Link>
        {v.year && <p className="text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">{v.year}</p>}
      </td>
      <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{v.registration_number ?? "—"}</td>
      <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{v.vin ?? "—"}</td>
      <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
        {v.assigned_driver ? v.assigned_driver.full_name : "—"}
      </td>
      <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{formatDate(v.insurance_expiry)}</td>
      <td className="px-4 py-3">
        <Badge tone={statusTone(v.status)} dot>{v.status}</Badge>
      </td>
      <td className="px-4 py-3 text-right">
        <Link to={`/UI/vehicles/${v.id}`} className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 dark:text-neutral-100">
          <ChevronRight size={18} />
        </Link>
      </td>
    </tr>
  );
});

const VehicleMobileCard = memo(function VehicleMobileCard({ v }: { v: Vehicle }) {
  return (
    <Link key={v.id} to={`/UI/vehicles/${v.id}`} className="block px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:bg-neutral-800">
      <div className="flex items-center justify-between">
        <p className="font-medium text-neutral-900 dark:text-neutral-100">{v.make} {v.model}</p>
        <Badge tone={statusTone(v.status)} dot>{v.status}</Badge>
      </div>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">{v.registration_number ?? "No reg"}</p>
    </Link>
  );
});

export function VehicleListPage() {
  const { permissions } = useAuthStore();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const debouncedSearch = useDebouncedValue(search);
  const debouncedStatus = useDebouncedValue(statusFilter);

  const canCreate = can(permissions, "vehicles", "create");

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, debouncedStatus]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      let query = supabase
        .from("vehicles")
        .select("id, make, model, year, vin, registration_number, insurance_expiry, status, assigned_driver:drivers(id, full_name)", { count: "exact" });

      if (debouncedSearch) {
        query = query.or(
          `make.ilike.%${debouncedSearch}%,model.ilike.%${debouncedSearch}%,vin.ilike.%${debouncedSearch}%,registration_number.ilike.%${debouncedSearch}%`
        );
      }
      if (debouncedStatus) {
        query = query.eq("status", debouncedStatus);
      }

      query = query
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      const { data, count, error } = await query;
      if (!error) {
        setVehicles((data ?? []) as Vehicle[]);
        setTotal(count ?? 0);
      }
      setLoading(false);
    }
    load();
  }, [page, debouncedSearch, debouncedStatus]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicles"
        description={`${total} vehicle${total === 1 ? "" : "s"} in the fleet`}
        actions={
          canCreate && (
            <Link to="/UI/vehicles/new">
              <Button size="sm">
                <Plus size={16} /> Add Vehicle
              </Button>
            </Link>
          )
        }
      />

      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="flex flex-col gap-3 border-b border-neutral-200 dark:border-neutral-800 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
            <input
              type="text"
              placeholder="Search by make, model, VIN, or registration…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 pl-9 pr-3 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 dark:text-neutral-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500"
            />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-40">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="maintenance">In Maintenance</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-200 dark:border-neutral-800 border-t-neutral-900 dark:border-t-neutral-100" />
          </div>
        ) : vehicles.length === 0 ? (
          <EmptyState
            icon={<Car size={24} />}
            title="No vehicles found"
            description="Try adjusting your filters or add a new vehicle."
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
                  {vehicles.map((v) => (
                    <VehicleDesktopRow key={v.id} v={v} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-neutral-100 dark:divide-neutral-800 md:hidden">
              {vehicles.map((v) => (
                <VehicleMobileCard key={v.id} v={v} />
              ))}
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
