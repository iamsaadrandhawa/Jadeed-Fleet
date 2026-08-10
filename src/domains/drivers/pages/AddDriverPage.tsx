import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/shared/lib/supabaseClient";
import { logAction } from "@/shared/lib/audit";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Button } from "@/shared/ui/Button";
import { Input, Select } from "@/shared/ui/Input";

interface FormData {
  full_name: string;
  phone: string;
  license_number: string;
  license_class: string;
  license_expiry: string;
  years_experience: string;
  status: string;
  employee_id: string;
  department: string;
  job_title: string;
  joining_date: string;
  cnic: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  location: string;
}

const empty: FormData = {
  full_name: "",
  phone: "",
  license_number: "",
  license_class: "",
  license_expiry: "",
  years_experience: "0",
  status: "active",
  employee_id: "",
  department: "",
  job_title: "",
  joining_date: "",
  cnic: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  location: "",
};

export function AddDriverPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>(empty);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: d }, { data: v }] = await Promise.all([
        supabase.from("drivers").select("location").not("location", "is", null),
        supabase.from("vehicles").select("location").not("location", "is", null),
      ]);
      const set = new Set<string>(["Head Office"]);
      for (const row of d ?? []) if (row.location) set.add(row.location);
      for (const row of v ?? []) if (row.location) set.add(row.location);
      setLocationSuggestions(Array.from(set).sort());
    })();
  }, []);

  const set = (k: keyof FormData, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.full_name) {
      setError("Full name is required.");
      return;
    }
    setSaving(true);
    const { data, error: insertErr } = await supabase
      .from("drivers")
      .insert({
        full_name: form.full_name,
      
        phone: form.phone || null,
        license_number: form.license_number || null,
        license_class: form.license_class || null,
        license_expiry: form.license_expiry || null,
        years_experience: parseInt(form.years_experience) || 0,
        status: form.status,
        employee_id: form.employee_id || null,
        department: form.department || null,
        job_title: form.job_title || null,
        joining_date: form.joining_date || null,
        cnic: form.cnic || null,
        emergency_contact_name: form.emergency_contact_name || null,
        emergency_contact_phone: form.emergency_contact_phone || null,
        location: form.location || null,
      })
      .select()
      .single();
    if (insertErr) {
      setError(insertErr.message);
      setSaving(false);
      return;
    }
    await logAction("create", "driver", data.id, `Created driver ${form.full_name}`);
    navigate(`/UI/drivers/${data.id}`);
  };

  return (
    <div className="space-y-6">
      <Link to="/UI/drivers" className="inline-flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100">
        <ArrowLeft size={16} /> Back to drivers
      </Link>
      <PageHeader title="Add Driver" description="Create a new driver / employee record." />
      <div className="max-w-2xl rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <p className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Personal & License</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Full Name" required value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
              <Input label="Phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              <Input label="License Number" value={form.license_number} onChange={(e) => set("license_number", e.target.value)} />
              <Input label="License Class" value={form.license_class} onChange={(e) => set("license_class", e.target.value)} />
              <Input label="License Expiry" type="date" value={form.license_expiry} onChange={(e) => set("license_expiry", e.target.value)} />
              <Input label="Years of Experience" type="number" value={form.years_experience} onChange={(e) => set("years_experience", e.target.value)} />
              <Select label="Status" value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </Select>
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Employee Details</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Employee ID" value={form.employee_id} onChange={(e) => set("employee_id", e.target.value)} placeholder="e.g. EMP-0042" />
              <Input label="Department" value={form.department} onChange={(e) => set("department", e.target.value)} />
              <Input label="Job Title" value={form.job_title} onChange={(e) => set("job_title", e.target.value)} placeholder="e.g. Senior Driver" />
              <Input label="Joining Date" type="date" value={form.joining_date} onChange={(e) => set("joining_date", e.target.value)} />
              <Input label="CNIC / National ID" value={form.cnic} onChange={(e) => set("cnic", e.target.value)} />
              <div>
                <Input
                  label="Site / Location"
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="e.g. Head Office, Lahore Site, Karachi Warehouse"
                  list="location-suggestions"
                />
                <datalist id="location-suggestions">
                  {locationSuggestions.map((loc) => (
                    <option key={loc} value={loc} />
                  ))}
                </datalist>
              </div>
              <Input label="Emergency Contact Name" value={form.emergency_contact_name} onChange={(e) => set("emergency_contact_name", e.target.value)} />
              <Input label="Emergency Contact Phone" value={form.emergency_contact_phone} onChange={(e) => set("emergency_contact_phone", e.target.value)} />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Link to="/UI/drivers">
              <Button type="button" variant="secondary">Cancel</Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save Driver"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}