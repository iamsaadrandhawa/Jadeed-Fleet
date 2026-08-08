import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/shared/lib/supabaseClient";
import { logAction } from "@/shared/lib/audit";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Button } from "@/shared/ui/Button";
import { Input, Select } from "@/shared/ui/Input";

interface FormData {
  make: string;
  model: string;
  year: string;
  vin: string;
  registration_number: string;
  insurance_provider: string;
  insurance_policy_number: string;
  insurance_expiry: string;
  status: string;
  department: string;
}

const empty: FormData = {
  make: "",
  model: "",
  year: "",
  vin: "",
  registration_number: "",
  insurance_provider: "",
  insurance_policy_number: "",
  insurance_expiry: "",
  status: "active",
  department: "",
};

export function AddVehiclePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof FormData, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!form.make || !form.model) {
      setError("Make and model are required.");
      return;
    }

    setSaving(true);

    try {
      // OPTIMIZATION 1: Insert without SELECT
      const { error: insertErr } = await supabase
        .from("vehicles")
        .insert({
          make: form.make,
          model: form.model,
          year: parseInt(form.year) || null,
          vin: form.vin || null,
          registration_number: form.registration_number || null,
          insurance_provider: form.insurance_provider || null,
          insurance_policy_number: form.insurance_policy_number || null,
          insurance_expiry: form.insurance_expiry || null,
          status: form.status,
          department: form.department || null,
        });

      if (insertErr) {
        // OPTIMIZATION 2: Better error messages for duplicate entries
        if (insertErr.code === "23505") {
          if (insertErr.message.includes("vin")) {
            setError("A vehicle with this VIN already exists.");
          } else if (insertErr.message.includes("registration_number")) {
            setError("A vehicle with this registration number already exists.");
          } else {
            setError("A vehicle with this information already exists.");
          }
        } else {
          setError(insertErr.message);
        }
        setSaving(false);
        return;
      }

      // OPTIMIZATION 3: Log action asynchronously (fire and forget)
      // Don't await this - let it run in the background
      logAction("create", "vehicle", "new", `Created vehicle ${form.make} ${form.model}`)
        .catch(err => console.error("Failed to log action:", err));

      // OPTIMIZATION 4: Navigate immediately with refresh flag
      navigate("/UI/vehicles", { 
        state: { 
          refresh: true,
          newVehicle: `${form.make} ${form.model}` 
        }
      });

    } catch (err) {
      console.error("Unexpected error:", err);
      setError("An unexpected error occurred. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link 
        to="/UI/vehicles" 
        className="inline-flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
      >
        <ArrowLeft size={16} /> Back to vehicles
      </Link>
      
      <PageHeader 
        title="Add Vehicle" 
        description="Register a new vehicle in the fleet." 
      />
      
      <div className="max-w-2xl rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input 
              label="Make" 
              required 
              value={form.make} 
              onChange={(e) => set("make", e.target.value)} 
              disabled={saving}
            />
            <Input 
              label="Model" 
              required 
              value={form.model} 
              onChange={(e) => set("model", e.target.value)} 
              disabled={saving}
            />
            <Input 
              label="Year" 
              type="number" 
              value={form.year} 
              onChange={(e) => set("year", e.target.value)} 
              disabled={saving}
            />
            <Input 
              label="VIN" 
              value={form.vin} 
              onChange={(e) => set("vin", e.target.value)} 
              disabled={saving}
            />
            <Input 
              label="Registration Number" 
              value={form.registration_number} 
              onChange={(e) => set("registration_number", e.target.value)} 
              disabled={saving}
            />
            <Input 
              label="Department" 
              value={form.department} 
              onChange={(e) => set("department", e.target.value)} 
              disabled={saving}
            />
            <Input 
              label="Insurance Provider" 
              value={form.insurance_provider} 
              onChange={(e) => set("insurance_provider", e.target.value)} 
              disabled={saving}
            />
            <Input 
              label="Insurance Policy Number" 
              value={form.insurance_policy_number} 
              onChange={(e) => set("insurance_policy_number", e.target.value)} 
              disabled={saving}
            />
            <Input 
              label="Insurance Expiry" 
              type="date" 
              value={form.insurance_expiry} 
              onChange={(e) => set("insurance_expiry", e.target.value)} 
              disabled={saving}
            />
            <Select 
              label="Status" 
              value={form.status} 
              onChange={(e) => set("status", e.target.value)}
              disabled={saving}
            >
              <option value="active">Active</option>
              <option value="maintenance">In Maintenance</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
          
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          
          <div className="flex justify-end gap-2 pt-2">
            <Link to="/UI/vehicles">
              <Button type="button" variant="secondary" disabled={saving}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save Vehicle"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}