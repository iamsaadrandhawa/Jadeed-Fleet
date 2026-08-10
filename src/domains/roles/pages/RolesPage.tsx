import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ShieldCheck, ChevronRight } from "lucide-react";
import { supabase } from "@/shared/lib/supabaseClient";
import { useAuthStore } from "@/shared/store/authStore";
import { isSuperAdmin } from "@/shared/lib/permissions";
import { logAction } from "@/shared/lib/audit";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Button } from "@/shared/ui/Button";
import { Input, Select } from "@/shared/ui/Input";
import { Badge } from "@/shared/ui/Badge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Modal } from "@/shared/ui/Modal";
import {
  DOMAINS,
  DOMAIN_LABELS,
  CRUD_ACTIONS,
  emptyPermissions,
  type Role,
  type Permissions,
  type Domain,
} from "@/shared/lib/types";

export function RolesPage() {
  const { profile } = useAuthStore();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [perm, setPerm] = useState<Permissions>(emptyPermissions());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = isSuperAdmin(profile);
  const canUpdate = isSuperAdmin(profile);
  const canDelete = isSuperAdmin(profile);

  useEffect(() => {
    loadRoles();
  }, []);

  async function loadRoles() {
    setLoading(true);
    const { data } = await supabase.from("roles").select("*").order("name");
    setRoles((data ?? []) as Role[]);
    setLoading(false);
  }

  const openCreate = () => {
    setEditingRole(null);
    setName("");
    setDescription("");
    setPerm(emptyPermissions());
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (r: Role) => {
    setEditingRole(r);
    setName(r.name);
    setDescription(r.description ?? "");
    setPerm(r.permissions ?? emptyPermissions());
    setError(null);
    setModalOpen(true);
  };

  const togglePerm = (domain: Domain, action: typeof CRUD_ACTIONS[number]) => {
    setPerm((p) => ({
      ...p,
      [domain]: { ...p[domain], [action]: !p[domain][action] },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    if (!name) {
      setError("Role name is required.");
      setSaving(false);
      return;
    }
    if (editingRole) {
      const { error: updateErr } = await supabase
        .from("roles")
        .update({ name, description, permissions: perm })
        .eq("id", editingRole.id);
      if (updateErr) setError(updateErr.message);
      else await logAction("update", "role", editingRole.id, `Updated role ${name}`);
    } else {
      const { data, error: insertErr } = await supabase
        .from("roles")
        .insert({ name, description, permissions: perm })
        .select()
        .single();
      if (insertErr) setError(insertErr.message);
      else await logAction("create", "role", data.id, `Created role ${name}`);
    }
    if (!error) {
      setModalOpen(false);
      await loadRoles();
    }
    setSaving(false);
  };

  const handleDelete = async (r: Role) => {
    if (r.name === "Super Admin") {
      setError("Super Admin role cannot be deleted.");
      return;
    }
    if (r.is_system) {
      setError("System roles cannot be deleted.");
      return;
    }
    if (!confirm(`Delete role "${r.name}"? Users with this role will lose their access.`)) return;
    const { error: delErr } = await supabase.from("roles").delete().eq("id", r.id);
    if (delErr) setError(delErr.message);
    else {
      await logAction("delete", "role", r.id, `Deleted role ${r.name}`);
      setRoles((prev) => prev.filter((p) => p.id !== r.id));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="Manage roles and their permission matrix."
        actions={
          canCreate && (
            <Button size="sm" onClick={openCreate}>
              <Plus size={16} /> Add Role
            </Button>
          )
        }
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-200 dark:border-neutral-800 border-t-neutral-900 dark:border-t-neutral-100" />
          </div>
        ) : roles.length === 0 ? (
          <EmptyState icon={<ShieldCheck size={24} />} title="No roles found" />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-neutral-200 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-800/50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    <th className="px-4 py-3.5">Role</th>
                    <th className="px-4 py-3.5">Description</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Permissions</th>
                    <th className="px-4 py-3.5 w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {roles.map((r) => {
                    const permCount = r.permissions 
                      ? Object.values(r.permissions).reduce(
                          (total, domain) => total + Object.values(domain).filter(Boolean).length,
                          0
                        )
                      : 0;
                    
                    return (
                      <tr key={r.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors duration-150">
                        <td className="px-4 py-3.5 border-b border-neutral-100 dark:border-neutral-800">
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-neutral-100">
                              {r.name}
                            </p>
                            {r.is_system && (
                              <Badge tone="neutral" className="text-xs mt-0.5">
                                System
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 border-b border-neutral-100 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400">
                          {r.description ?? "—"}
                        </td>
                        <td className="px-4 py-3.5 border-b border-neutral-100 dark:border-neutral-800">
                          <Badge tone={r.status === "active" ? "success" : "neutral"} dot>
                            {r.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 border-b border-neutral-100 dark:border-neutral-800">
                          <Badge tone="neutral" className="text-xs">
                            {permCount} permission{permCount !== 1 ? "s" : ""}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 border-b border-neutral-100 dark:border-neutral-800 text-right">
                          <div className="flex justify-end gap-1">
                            {canUpdate && (
                              <button 
                                onClick={() => openEdit(r)} 
                                className="rounded-md p-1.5 text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                                title="Edit role"
                              >
                                <Pencil size={16} />
                              </button>
                            )}
                            {canDelete && !r.is_system && r.name !== "Super Admin" && (
                              <button 
                                onClick={() => handleDelete(r)} 
                                className="rounded-md p-1.5 text-neutral-400 dark:text-neutral-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                title="Delete role"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800 md:hidden">
              {roles.map((r) => {
                const permCount = r.permissions 
                  ? Object.values(r.permissions).reduce(
                      (total, domain) => total + Object.values(domain).filter(Boolean).length,
                      0
                    )
                  : 0;
                
                return (
                  <div key={r.id} className="px-4 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors duration-150">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-neutral-900 dark:text-neutral-100">
                            {r.name}
                          </p>
                          {r.is_system && (
                            <Badge tone="neutral" className="text-xs">
                              System
                            </Badge>
                          )}
                        </div>
                        {r.description && (
                          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 truncate">
                            {r.description}
                          </p>
                        )}
                      </div>
                      <Badge tone={r.status === "active" ? "success" : "neutral"} dot className="flex-shrink-0">
                        {r.status}
                      </Badge>
                    </div>
                    
                    <div className="mt-3 flex items-center justify-between">
                      <Badge tone="neutral" className="text-xs">
                        {permCount} permission{permCount !== 1 ? "s" : ""}
                      </Badge>
                      <div className="flex gap-1">
                        {canUpdate && (
                          <button 
                            onClick={() => openEdit(r)} 
                            className="rounded-md p-1.5 text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                            title="Edit role"
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                        {canDelete && !r.is_system && r.name !== "Super Admin" && (
                          <button 
                            onClick={() => handleDelete(r)} 
                            className="rounded-md p-1.5 text-neutral-400 dark:text-neutral-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title="Delete role"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingRole ? "Edit Role" : "Add Role"} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input 
              id="role-name"
              name="name"
              label="Role Name" 
              required 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              disabled={editingRole?.is_system}
              autoComplete="off"
            />
            <Select 
              id="role-status"
              name="status"
              label="Status" 
              value="active" 
              disabled
              autoComplete="off"
            >
              <option value="active">Active</option>
            </Select>
          </div>
          <Input 
            id="role-description"
            name="description"
            label="Description" 
            value={description} 
            onChange={(e) => setDescription(e.target.value)}
            autoComplete="off"
          />

          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">Permission Matrix</p>
            <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    <th className="px-3 py-2 min-w-[80px]">Module</th>
                    {CRUD_ACTIONS.map((a) => (
                      <th key={a} className="px-3 py-2 text-center min-w-[50px] capitalize">{a}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {DOMAINS.map((domain) => (
                    <tr key={domain} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors duration-150">
                      <td className="px-3 py-2 font-medium text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                        {DOMAIN_LABELS[domain]}
                      </td>
                      {CRUD_ACTIONS.map((action) => (
                        <td key={action} className="px-3 py-2 text-center">
                          <input
                            id={`perm-${domain}-${action}`}
                            name={`perm-${domain}-${action}`}
                            type="checkbox"
                            checked={perm[domain]?.[action] ?? false}
                            onChange={() => togglePerm(domain, action)}
                            className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-400 focus:ring-offset-1 dark:focus:ring-neutral-500 transition-colors"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save Role"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}