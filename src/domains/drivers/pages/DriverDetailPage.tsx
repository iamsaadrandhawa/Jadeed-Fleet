import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Trash2, Save } from "lucide-react";
import { supabase } from "@/shared/lib/supabaseClient";
import { useAuthStore } from "@/shared/store/authStore";
import { can } from "@/shared/lib/permissions";
import { logAction } from "@/shared/lib/audit";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Button } from "@/shared/ui/Button";
import { Input, Select } from "@/shared/ui/Input";
import { Badge, statusTone } from "@/shared/ui/Badge";
import { formatDate, daysUntil } from "@/shared/lib/formatters";
import type { Driver, Vehicle } from "@/shared/lib/types";

export function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { permissions } = useAuthStore();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Driver>>({});

  const canUpdate = can(permissions, "drivers", "update");
  const canDelete = can(permissions, "drivers", "delete");

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("drivers")
        .select("*, assigned_vehicle:vehicles(id, make, model, registration_number)")
        .eq("id", id)
        .maybeSingle();
      if (data) {
        setDriver(data as Driver);
        setForm(data as Driver);
      }
      const { data: vData } = await supabase
        .from("vehicles")
        .select("id, make, model, registration_number, status")
        .order("make", { ascending: true });
      setVehicles((vData ?? []) as Vehicle[]);
    })();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !driver) return;
    setSaving(true);
    setError(null);
    const { error: updateErr } = await supabase
      .from("drivers")
      .update({
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        license_number: form.license_number,
        license_class: form.license_class,
        license_expiry: form.license_expiry,
        years_experience: form.years_experience,
        status: form.status,
        assigned_vehicle_id: form.assigned_vehicle_id || null,
      })
      .eq("id", id);
    if (updateErr) {
      setError(updateErr.message);
      setSaving(false);
      return;
    }
    // Sync the reverse FK on the vehicle
    if (form.assigned_vehicle_id !== driver.assigned_vehicle_id) {
      // Clear old vehicle's assigned_driver
      if (driver.assigned_vehicle_id) {
        await supabase
          .from("vehicles")
          .update({ assigned_driver_id: null })
          .eq("assigned_driver_id", id);
      }
      if (form.assigned_vehicle_id) {
        await supabase
          .from("vehicles")
          .update({ assigned_driver_id: id })
          .eq("id", form.assigned_vehicle_id);
      }
    }
    await logAction("update", "driver", id, `Updated driver ${form.full_name}`);
    setDriver({ ...driver, ...form } as Driver);
    setEditing(false);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!id || !driver) return;
    if (!confirm(`Delete driver "${driver.full_name}"? This cannot be undone.`)) return;
    // Clear vehicle assignment
    if (driver.assigned_vehicle_id) {
      await supabase
        .from("vehicles")
        .update({ assigned_driver_id: null })
        .eq("assigned_driver_id", id);
    }
    const { error: delErr } = await supabase.from("drivers").delete().eq("id", id);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    await logAction("delete", "driver", id, `Deleted driver ${driver.full_name}`);
    navigate("/UI/drivers");
  };

  if (!driver) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-200 dark:border-neutral-800 border-t-neutral-900 dark:border-t-neutral-100" />
      </div>
    );
  }

  const days = daysUntil(driver.license_expiry);
  const expiring = days !== null && days <= 30 && days >= 0;

  return (
    <div className="space-y-6">
      <Link to="/UI/drivers" className="inline-flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 dark:text-neutral-100">
        <ArrowLeft size={16} /> Back to drivers
      </Link>
      <PageHeader
        title={driver.full_name}
        description={driver.email ?? ""}
        actions={
          <div className="flex gap-2">
            {canUpdate && !editing && (
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
            {canDelete && (
              <Button variant="danger" size="sm" onClick={handleDelete}>
                <Trash2 size={16} /> Delete
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 lg:col-span-2">
          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Full Name" value={form.full_name ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                <Input label="Email" type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <Input label="Phone" value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <Input label="License Number" value={form.license_number ?? ""} onChange={(e) => setForm({ ...form, license_number: e.target.value })} />
                <Input label="License Class" value={form.license_class ?? ""} onChange={(e) => setForm({ ...form, license_class: e.target.value })} />
                <Input label="License Expiry" type="date" value={form.license_expiry ?? ""} onChange={(e) => setForm({ ...form, license_expiry: e.target.value })} />
                <Input label="Years of Experience" type="number" value={form.years_experience ?? 0} onChange={(e) => setForm({ ...form, years_experience: parseInt(e.target.value) || 0 })} />
                <Select label="Status" value={form.status ?? "active"} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </Select>
                <Select label="Assigned Vehicle" value={form.assigned_vehicle_id ?? ""} onChange={(e) => setForm({ ...form, assigned_vehicle_id: e.target.value || null })}>
                  <option value="">Unassigned</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.make} {v.model} ({v.registration_number})
                    </option>
                  ))}
                </Select>
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => { setEditing(false); setForm(driver); setError(null); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  <Save size={16} /> {saving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full Name" value={driver.full_name} />
              <Field label="Email" value={driver.email} />
              <Field label="Phone" value={driver.phone} />
              <Field label="License Number" value={driver.license_number} />
              <Field label="License Class" value={driver.license_class} />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">License Expiry</dt>
                <dd className="mt-1 flex items-center gap-2 text-sm text-neutral-900 dark:text-neutral-100">
                  {formatDate(driver.license_expiry)}
                  {expiring && <Badge tone="warning" dot>{days}d left</Badge>}
                </dd>
              </div>
              <Field label="Years of Experience" value={driver.years_experience?.toString()} />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Status</dt>
                <dd className="mt-1">
                  <Badge tone={statusTone(driver.status)} dot>{driver.status}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Assigned Vehicle</dt>
                <dd className="mt-1 text-sm text-neutral-900 dark:text-neutral-100">
                  {driver.assigned_vehicle
                    ? `${driver.assigned_vehicle.make} ${driver.assigned_vehicle.model} (${driver.assigned_vehicle.registration_number})`
                    : "Unassigned"}
                </dd>
              </div>
            </dl>
          )}
        </div>

        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Driver Info</h3>
          <dl className="mt-4 space-y-3">
            <Field label="Created" value={formatDate(driver.created_at)} />
            <Field label="Last Updated" value={formatDate(driver.updated_at)} />
          </dl>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">{label}</dt>
      <dd className="mt-1 text-sm text-neutral-900 dark:text-neutral-100">{value || "—"}</dd>
    </div>
  );
}
