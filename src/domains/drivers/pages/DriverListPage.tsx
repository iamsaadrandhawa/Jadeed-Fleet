import { useEffect, useState, useMemo, memo } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Users as UsersIcon, ChevronRight } from "lucide-react";
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
  return (
    <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:bg-neutral-800">
      <td className="px-4 py-3">
        <Link to={`/UI/drivers/${d.id}`} className="font-medium text-neutral-900 dark:text-neutral-100 hover:underline">
          {d.full_name}
        </Link>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">{d.email ?? "—"}</p>
      </td>
      <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
        {d.license_number ?? "—"}
        {d.license_class && (
          <span className="ml-1 text-xs text-neutral-400 dark:text-neutral-500">({d.license_class})</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-neutral-700 dark:text-neutral-300">{formatDate(d.license_expiry)}</span>
          {d.expiring && <Badge tone="warning" dot>{d.daysLeft}d</Badge>}
        </div>
      </td>
      <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
        {d.assigned_vehicle
          ? `${d.assigned_vehicle.make} ${d.assigned_vehicle.model}`
          : "—"}
      </td>
      <td className="px-4 py-3">
        <Badge tone={statusTone(d.status)} dot>
          {d.status}
        </Badge>
      </td>
      <td className="px-4 py-3 text-right">
        <Link to={`/UI/drivers/${d.id}`} className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 dark:text-neutral-100">
          <ChevronRight size={18} />
        </Link>
      </td>
    </tr>
  );
});

const DriverMobileCard = memo(function DriverMobileCard({ d }: { d: DriverRow }) {
  return (
    <Link
      key={d.id}
      to={`/UI/drivers/${d.id}`}
      className="block px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:bg-neutral-800"
    >
      <div className="flex items-center justify-between">
        <p className="font-medium text-neutral-900 dark:text-neutral-100">{d.full_name}</p>
        <Badge tone={statusTone(d.status)} dot>{d.status}</Badge>
      </div>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">{d.email ?? "—"}</p>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">License: {formatDate(d.license_expiry)}</span>
        {d.expiring && <Badge tone="warning" dot>{d.daysLeft}d left</Badge>}
      </div>
    </Link>
  );
});

export function DriverListPage() {
  const { permissions } = useAuthStore();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const debouncedSearch = useDebouncedValue(search);
  const debouncedStatus = useDebouncedValue(statusFilter);

  const canCreate = can(permissions, "drivers", "create");

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, debouncedStatus]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      let query = supabase
        .from("drivers")
        .select("id, full_name, email, license_number, license_class, license_expiry, status, assigned_vehicle:vehicles(id, make, model)", { count: "exact" });

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

      const { data, count, error } = await query;
      if (!error) {
        setDrivers((data ?? []) as Driver[]);
        setTotal(count ?? 0);
      }
      setLoading(false);
    }
    load();
  }, [page, debouncedSearch, debouncedStatus]);

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
      <PageHeader
        title="Drivers"
        description={`${total} driver${total === 1 ? "" : "s"} in the fleet`}
        actions={
          canCreate && (
            <Link to="/UI/drivers/new">
              <Button size="sm">
                <Plus size={16} /> Add Driver
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
              placeholder="Search by name, email, or license…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 pl-9 pr-3 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 dark:text-neutral-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="sm:w-40"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-200 dark:border-neutral-800 border-t-neutral-900 dark:border-t-neutral-100" />
          </div>
        ) : drivers.length === 0 ? (
          <EmptyState
            icon={<UsersIcon size={24} />}
            title="No drivers found"
            description="Try adjusting your filters or add a new driver."
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
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">
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
