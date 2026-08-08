import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/shared/lib/supabaseClient";
import { logAction } from "@/shared/lib/audit";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Button } from "@/shared/ui/Button";
import { Input, Select } from "@/shared/ui/Input";

interface FormData {
  full_name: string;
  email: string;
  phone: string;
  license_number: string;
  license_class: string;
  license_expiry: string;
  years_experience: string;
  status: string;
}

const empty: FormData = {
  full_name: "",
  email: "",
  phone: "",
  license_number: "",
  license_class: "",
  license_expiry: "",
  years_experience: "0",
  status: "active",
};

export function AddDriverPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        email: form.email || null,
        phone: form.phone || null,
        license_number: form.license_number || null,
        license_class: form.license_class || null,
        license_expiry: form.license_expiry || null,
        years_experience: parseInt(form.years_experience) || 0,
        status: form.status,
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
      <Link to="/UI/drivers" className="inline-flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 dark:text-neutral-100">
        <ArrowLeft size={16} /> Back to drivers
      </Link>
      <PageHeader title="Add Driver" description="Create a new driver record." />
      <div className="max-w-2xl rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Full Name" required value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
            <Input label="Email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
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
