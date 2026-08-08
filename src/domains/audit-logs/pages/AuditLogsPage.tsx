import { useEffect, useState, memo } from "react";
import { Search, Trash2, ScrollText } from "lucide-react";
import { supabase } from "@/shared/lib/supabaseClient";
import { useAuthStore } from "@/shared/store/authStore";
import { can } from "@/shared/lib/permissions";
import { useDebouncedValue } from "@/shared/lib/useDebouncedValue";
import { logAction } from "@/shared/lib/audit";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Button } from "@/shared/ui/Button";
import { Input, Select } from "@/shared/ui/Input";
import { Badge } from "@/shared/ui/Badge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Pagination } from "@/shared/ui/Pagination";
import { formatDateTime } from "@/shared/lib/formatters";
import type { AuditLog } from "@/shared/lib/types";

const PAGE_SIZE = 15;

const ACTION_TONES: Record<string, "success" | "info" | "danger" | "neutral"> = {
  create: "success",
  update: "info",
  delete: "danger",
};

const LogRow = memo(function LogRow({
  log,
  canDelete,
  onDelete,
}: {
  log: AuditLog;
  canDelete: boolean;
  onDelete: (log: AuditLog) => void;
}) {
  return (
    <tr key={log.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:bg-neutral-800">
      <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{log.user_email ?? "—"}</td>
      <td className="px-4 py-3">
        <Badge tone={ACTION_TONES[log.action] ?? "neutral"}>{log.action}</Badge>
      </td>
      <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300 capitalize">{log.entity}</td>
      <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">{log.description ?? "—"}</td>
      <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">{formatDateTime(log.created_at)}</td>
      {canDelete && (
        <td className="px-4 py-3 text-right">
          <button onClick={() => onDelete(log)} className="rounded-md p-1.5 text-neutral-400 dark:text-neutral-500 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600 dark:hover:text-red-400 dark:text-red-400">
            <Trash2 size={16} />
          </button>
        </td>
      )}
    </tr>
  );
});

export function AuditLogsPage() {
  const { permissions } = useAuthStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const debouncedSearch = useDebouncedValue(search);
  const debouncedDateFrom = useDebouncedValue(dateFrom);
  const debouncedDateTo = useDebouncedValue(dateTo);

  const canDelete = can(permissions, "logs", "delete");

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, actionFilter, entityFilter, debouncedDateFrom, debouncedDateTo]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      let query = supabase
        .from("audit_logs")
        .select("id, user_email, action, entity, description, created_at", { count: "exact" });

      if (debouncedSearch) {
        query = query.or(
          `user_email.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%`
        );
      }
      if (actionFilter) query = query.eq("action", actionFilter);
      if (entityFilter) query = query.eq("entity", entityFilter);
      if (debouncedDateFrom) query = query.gte("created_at", debouncedDateFrom);
      if (debouncedDateTo) query = query.lte("created_at", `${debouncedDateTo}T23:59:59`);

      query = query
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      const { data, count, error } = await query;
      if (!error) {
        setLogs((data ?? []) as AuditLog[]);
        setTotal(count ?? 0);
      }
      setLoading(false);
    }
    load();
  }, [page, debouncedSearch, actionFilter, entityFilter, debouncedDateFrom, debouncedDateTo]);

  const handleDelete = async (log: AuditLog) => {
    if (!confirm("Delete this log entry? This cannot be undone.")) return;
    const { error: delErr } = await supabase.from("audit_logs").delete().eq("id", log.id);
    if (!delErr) {
      setLogs((prev) => prev.filter((l) => l.id !== log.id));
      setTotal((t) => t - 1);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" description={`${total} logged action${total === 1 ? "" : "s"}`} />

      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="flex flex-col gap-3 border-b border-neutral-200 dark:border-neutral-800 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
            <input
              type="text"
              placeholder="Search by user or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 pl-9 pr-3 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 dark:text-neutral-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500"
            />
          </div>
          <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="lg:w-32">
            <option value="">All actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
          </Select>
          <Select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} className="lg:w-32">
            <option value="">All entities</option>
            <option value="driver">Driver</option>
            <option value="vehicle">Vehicle</option>
            <option value="user">User</option>
            <option value="role">Role</option>
            <option value="setting">Setting</option>
          </Select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="lg:w-36" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="lg:w-36" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-200 dark:border-neutral-800 border-t-neutral-900 dark:border-t-neutral-100" />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState icon={<ScrollText size={24} />} title="No log entries found" description="Try adjusting your filters." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Timestamp</th>
                    {canDelete && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {logs.map((log) => (
                    <LogRow key={log.id} log={log} canDelete={canDelete} onDelete={handleDelete} />
                  ))}
                </tbody>
              </table>
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
