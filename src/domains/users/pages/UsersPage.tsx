import { useEffect, useState } from "react";
import { UserCog, Plus, Trash2, Pencil } from "lucide-react";
import { supabase, EDGE_FUNCTION_BASE } from "@/shared/lib/supabaseClient";
import { useAuthStore } from "@/shared/store/authStore";
import { isSuperAdmin } from "@/shared/lib/permissions";
import { logAction } from "@/shared/lib/audit";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Button } from "@/shared/ui/Button";
import { Input, Select } from "@/shared/ui/Input";
import { Badge, statusTone } from "@/shared/ui/Badge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Modal } from "@/shared/ui/Modal";
import { formatDate, initials } from "@/shared/lib/formatters";
import type { Role, Profile } from "@/shared/lib/types";

interface UserRow extends Profile {
  email?: string;
  role?: Role | null;
}

export function UsersPage() {
  const { profile, user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role_id: "",
    status: "active",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = isSuperAdmin(profile);
  const canUpdate = isSuperAdmin(profile);
  const canDelete = isSuperAdmin(profile);

  useEffect(() => {
    loadUsers();
    (async () => {
      const { data } = await supabase.from("roles").select("*").order("name");
      setRoles((data ?? []) as Role[]);
    })();
  }, []);

  async function loadUsers() {
    setLoading(true);
    const res = await fetch(`${EDGE_FUNCTION_BASE}/user-management/list`, {
      headers: {
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ""}`,
      },
    });
    if (res.ok) {
      const json = await res.json();
      setUsers(json.users ?? []);
    }
    setLoading(false);
  }

  const openCreate = () => {
    setEditingUser(null);
    setForm({ email: "", password: "", full_name: "", phone: "", role_id: roles[0]?.id ?? "", status: "active" });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (u: UserRow) => {
    setEditingUser(u);
    setForm({
      email: u.email ?? "",
      password: "",
      full_name: u.full_name ?? "",
      phone: u.phone ?? "",
      role_id: u.role_id ?? "",
      status: u.status,
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const token = (await supabase.auth.getSession()).data.session?.access_token ?? "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    if (editingUser) {
      const body: Record<string, unknown> = {
        full_name: form.full_name,
        phone: form.phone,
        role_id: form.role_id || null,
        status: form.status,
      };
      if (form.password) body.password = form.password;
      const res = await fetch(`${EDGE_FUNCTION_BASE}/user-management/${editingUser.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Failed to update user");
        setSaving(false);
        return;
      }
    } else {
      if (!form.email || !form.password) {
        setError("Email and password are required for new users.");
        setSaving(false);
        return;
      }
      const res = await fetch(`${EDGE_FUNCTION_BASE}/user-management/create`, {
        method: "POST",
        headers,
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Failed to create user");
        setSaving(false);
        return;
      }
    }
    setModalOpen(false);
    if (editingUser) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                full_name: form.full_name,
                phone: form.phone,
                role_id: form.role_id || null,
                status: form.status,
                role: roles.find((r) => r.id === form.role_id) ?? u.role,
              }
            : u
        )
      );
    } else {
      const res2 = await fetch(`${EDGE_FUNCTION_BASE}/user-management/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res2.ok) {
        const j = await res2.json();
        setUsers(j.users ?? []);
      }
    }
    setSaving(false);
  };

  const handleDelete = async (u: UserRow) => {
    if (u.role?.name === "Super Admin") {
      setError("Super Admin accounts cannot be deleted from the app");
      return;
    }
    if (u.id === currentUser?.id) {
      setError("You cannot delete your own account.");
      return;
    }
    if (!confirm(`Delete user "${u.full_name ?? u.email}"? This cannot be undone.`)) return;
    const token = (await supabase.auth.getSession()).data.session?.access_token ?? "";
    const res = await fetch(`${EDGE_FUNCTION_BASE}/user-management/${u.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      await logAction("delete", "user", u.id, `Deleted user ${u.email}`);
      setUsers((prev) => prev.filter((p) => p.id !== u.id));
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed to delete user");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description={`${users.length} user${users.length === 1 ? "" : "s"} in the system`}
        actions={
          canCreate && (
            <Button size="sm" onClick={openCreate}>
              <Plus size={16} /> Add User
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
        ) : users.length === 0 ? (
          <EmptyState icon={<UserCog size={24} />} title="No users found" />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-neutral-200 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-800/50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    <th className="px-4 py-3.5">User</th>
                    <th className="px-4 py-3.5">Role</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Created</th>
                    <th className="px-4 py-3.5 w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors duration-150">
                      <td className="px-4 py-3.5 border-b border-neutral-100 dark:border-neutral-800">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white flex-shrink-0">
                            {initials(u.full_name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                              {u.full_name ?? "—"}
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 border-b border-neutral-100 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300">
                        <Badge tone="neutral" className="text-xs">
                          {u.role?.name ?? "—"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 border-b border-neutral-100 dark:border-neutral-800">
                        <Badge tone={statusTone(u.status)} dot>
                          {u.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 border-b border-neutral-100 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 text-xs">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="px-4 py-3.5 border-b border-neutral-100 dark:border-neutral-800 text-right">
                        <div className="flex justify-end gap-1">
                          {canUpdate && (
                            <button 
                              onClick={() => openEdit(u)} 
                              className="rounded-md p-1.5 text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                              title="Edit user"
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                          {canDelete && u.role?.name !== "Super Admin" && u.id !== currentUser?.id && (
                            <button 
                              onClick={() => handleDelete(u)} 
                              className="rounded-md p-1.5 text-neutral-400 dark:text-neutral-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              title="Delete user"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800 md:hidden">
              {users.map((u) => (
                <div key={u.id} className="px-4 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors duration-150">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white flex-shrink-0">
                        {initials(u.full_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                          {u.full_name ?? "—"}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                          {u.email}
                        </p>
                      </div>
                    </div>
                    <Badge tone={statusTone(u.status)} dot className="flex-shrink-0">
                      {u.status}
                    </Badge>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between">
                    <Badge tone="neutral" className="text-xs">
                      {u.role?.name ?? "—"}
                    </Badge>
                    <span className="text-xs text-neutral-400 dark:text-neutral-500">
                      {formatDate(u.created_at)}
                    </span>
                  </div>
                  
                  <div className="mt-3 flex justify-end gap-1">
                    {canUpdate && (
                      <button 
                        onClick={() => openEdit(u)} 
                        className="rounded-md p-1.5 text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                        title="Edit user"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                    {canDelete && u.role?.name !== "Super Admin" && u.id !== currentUser?.id && (
                      <button 
                        onClick={() => handleDelete(u)} 
                        className="rounded-md p-1.5 text-neutral-400 dark:text-neutral-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Delete user"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? "Edit User" : "Add User"}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input 
            id="user-email"
            name="email"
            label="Email" 
            type="email" 
            required 
            value={form.email} 
            onChange={(e) => setForm({ ...form, email: e.target.value })} 
            disabled={!!editingUser}
            autoComplete="email"
          />
          <Input
            id="user-password"
            name="password"
            label={editingUser ? "New Password (leave blank to keep)" : "Password"}
            type="password"
            required={!editingUser}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete={editingUser ? "new-password" : "new-password"}
          />
          <Input 
            id="user-full-name"
            name="full_name"
            label="Full Name" 
            value={form.full_name} 
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            autoComplete="name"
          />
          <Input 
            id="user-phone"
            name="phone"
            label="Phone" 
            value={form.phone} 
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            autoComplete="tel"
          />
          <Select 
            id="user-role"
            name="role_id"
            label="Role" 
            value={form.role_id} 
            onChange={(e) => setForm({ ...form, role_id: e.target.value })}
            autoComplete="off"
          >
            <option value="">No role</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </Select>
          <Select 
            id="user-status"
            name="status"
            label="Status" 
            value={form.status} 
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            autoComplete="off"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </Select>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}