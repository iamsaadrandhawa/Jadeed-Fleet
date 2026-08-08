import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Trash2, Save, Upload, FileText, Download } from "lucide-react";
import { supabase } from "@/shared/lib/supabaseClient";
import { useAuthStore } from "@/shared/store/authStore";
import { can } from "@/shared/lib/permissions";
import { logAction } from "@/shared/lib/audit";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Button } from "@/shared/ui/Button";
import { Input, Select } from "@/shared/ui/Input";
import { Badge, statusTone } from "@/shared/ui/Badge";
import { formatDate } from "@/shared/lib/formatters";
import type { Vehicle, Driver } from "@/shared/lib/types";

const DOC_TYPES = ["Registration", "Insurance", "Fitness Certificate"];

export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { permissions } = useAuthStore();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Vehicle>>({});
  const [docs, setDocs] = useState<{ name: string; path: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  const canUpdate = can(permissions, "vehicles", "update");
  const canDelete = can(permissions, "vehicles", "delete");

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("*, assigned_driver:drivers(id, full_name)")
        .eq("id", id)
        .maybeSingle();
      if (data) {
        setVehicle(data as Vehicle);
        setForm(data as Vehicle);
      }
      const { data: dData } = await supabase
        .from("drivers")
        .select("id, full_name, status")
        .order("full_name", { ascending: true });
      setDrivers((dData ?? []) as Driver[]);
      await loadDocs();
    })();
  }, [id]);

  async function loadDocs() {
    if (!id) return;
    const { data, error } = await supabase.storage
      .from("vehicle-documents")
      .list(id);
    if (!error && data) {
      setDocs(data.map((f) => ({ name: f.name, path: `${id}/${f.name}` })));
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    const filePath = `${id}/${file.name}`;
    const { error: uploadErr } = await supabase.storage
      .from("vehicle-documents")
      .upload(filePath, file, { upsert: true });
    if (uploadErr) {
      setError(uploadErr.message);
    } else {
      await logAction("update", "vehicle", id, `Uploaded document ${file.name}`);
      await loadDocs();
    }
    setUploading(false);
  };

  const handleDownload = async (path: string) => {
    const { data } = await supabase.storage
      .from("vehicle-documents")
      .createSignedUrl(path, 60);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !vehicle) return;
    setSaving(true);
    setError(null);
    const { error: updateErr } = await supabase
      .from("vehicles")
      .update({
        make: form.make,
        model: form.model,
        year: form.year,
        vin: form.vin,
        registration_number: form.registration_number,
        insurance_provider: form.insurance_provider,
        insurance_policy_number: form.insurance_policy_number,
        insurance_expiry: form.insurance_expiry,
        status: form.status,
        department: form.department,
        assigned_driver_id: form.assigned_driver_id || null,
      })
      .eq("id", id);
    if (updateErr) {
      setError(updateErr.message);
      setSaving(false);
      return;
    }
    // Sync reverse FK
    if (form.assigned_driver_id !== vehicle.assigned_driver_id) {
      if (vehicle.assigned_driver_id) {
        await supabase
          .from("drivers")
          .update({ assigned_vehicle_id: null })
          .eq("assigned_vehicle_id", id);
      }
      if (form.assigned_driver_id) {
        await supabase
          .from("drivers")
          .update({ assigned_vehicle_id: id })
          .eq("id", form.assigned_driver_id);
      }
    }
    await logAction("update", "vehicle", id, `Updated vehicle ${form.make} ${form.model}`);
    setVehicle({ ...vehicle, ...form } as Vehicle);
    setEditing(false);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!id || !vehicle) return;
    if (!confirm(`Delete vehicle "${vehicle.make} ${vehicle.model}"? This cannot be undone.`)) return;
    if (vehicle.assigned_driver_id) {
      await supabase
        .from("drivers")
        .update({ assigned_vehicle_id: null })
        .eq("assigned_vehicle_id", id);
    }
    const { error: delErr } = await supabase.from("vehicles").delete().eq("id", id);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    await logAction("delete", "vehicle", id, `Deleted vehicle ${vehicle.make} ${vehicle.model}`);
    navigate("/UI/vehicles");
  };

  if (!vehicle) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-200 dark:border-neutral-800 border-t-neutral-900 dark:border-t-neutral-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/UI/vehicles" className="inline-flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 dark:text-neutral-100">
        <ArrowLeft size={16} /> Back to vehicles
      </Link>
      <PageHeader
        title={`${vehicle.make} ${vehicle.model}`}
        description={vehicle.registration_number ?? ""}
        actions={
          <div className="flex gap-2">
            {canUpdate && !editing && (
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Edit</Button>
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
                <Input label="Make" value={form.make ?? ""} onChange={(e) => setForm({ ...form, make: e.target.value })} />
                <Input label="Model" value={form.model ?? ""} onChange={(e) => setForm({ ...form, model: e.target.value })} />
                <Input label="Year" type="number" value={form.year ?? ""} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || null })} />
                <Input label="VIN" value={form.vin ?? ""} onChange={(e) => setForm({ ...form, vin: e.target.value })} />
                <Input label="Registration Number" value={form.registration_number ?? ""} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} />
                <Input label="Department" value={form.department ?? ""} onChange={(e) => setForm({ ...form, department: e.target.value })} />
                <Input label="Insurance Provider" value={form.insurance_provider ?? ""} onChange={(e) => setForm({ ...form, insurance_provider: e.target.value })} />
                <Input label="Insurance Policy Number" value={form.insurance_policy_number ?? ""} onChange={(e) => setForm({ ...form, insurance_policy_number: e.target.value })} />
                <Input label="Insurance Expiry" type="date" value={form.insurance_expiry ?? ""} onChange={(e) => setForm({ ...form, insurance_expiry: e.target.value })} />
                <Select label="Status" value={form.status ?? "active"} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="maintenance">In Maintenance</option>
                  <option value="inactive">Inactive</option>
                </Select>
                <Select label="Assigned Driver" value={form.assigned_driver_id ?? ""} onChange={(e) => setForm({ ...form, assigned_driver_id: e.target.value || null })}>
                  <option value="">Unassigned</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.full_name}</option>
                  ))}
                </Select>
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => { setEditing(false); setForm(vehicle); setError(null); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  <Save size={16} /> {saving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Make" value={vehicle.make} />
              <Field label="Model" value={vehicle.model} />
              <Field label="Year" value={vehicle.year?.toString()} />
              <Field label="VIN" value={vehicle.vin} />
              <Field label="Registration Number" value={vehicle.registration_number} />
              <Field label="Department" value={vehicle.department} />
              <Field label="Insurance Provider" value={vehicle.insurance_provider} />
              <Field label="Insurance Policy Number" value={vehicle.insurance_policy_number} />
              <Field label="Insurance Expiry" value={formatDate(vehicle.insurance_expiry)} />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Status</dt>
                <dd className="mt-1"><Badge tone={statusTone(vehicle.status)} dot>{vehicle.status}</Badge></dd>
              </div>
              <Field label="Assigned Driver" value={vehicle.assigned_driver?.full_name} />
            </dl>
          )}
        </div>

        {/* Documents */}
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Documents</h3>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">
            Upload registration, insurance, and fitness certificate files.
          </p>
          {canUpdate && (
            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 dark:border-neutral-700 px-4 py-3 text-sm text-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:bg-neutral-800">
              <Upload size={16} />
              {uploading ? "Uploading…" : "Upload document"}
              <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          )}
          <div className="mt-4 space-y-2">
            {docs.length === 0 ? (
              <p className="text-xs text-neutral-400 dark:text-neutral-500">No documents uploaded.</p>
            ) : (
              docs.map((doc) => (
                <div key={doc.path} className="flex items-center justify-between rounded-md border border-neutral-200 dark:border-neutral-800 px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={16} className="flex-shrink-0 text-neutral-400 dark:text-neutral-500" />
                    <span className="truncate text-sm text-neutral-700 dark:text-neutral-300">{doc.name}</span>
                  </div>
                  <button
                    onClick={() => handleDownload(doc.path)}
                    className="rounded-md p-1 text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 dark:text-neutral-100"
                  >
                    <Download size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
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
