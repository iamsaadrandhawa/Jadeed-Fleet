import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { supabase } from "@/shared/lib/supabaseClient";
import { useAuthStore } from "@/shared/store/authStore";
import { can } from "@/shared/lib/permissions";
import { logAction } from "@/shared/lib/audit";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";

export function SettingsPage() {
  const { permissions, user, profile } = useAuthStore();
  const canUpdate = can(permissions, "settings", "update");
  const canUpdateUsers = can(permissions, "users", "update");

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("settings").select("*");
      const map: Record<string, string> = {};
      for (const s of data ?? []) {
        map[s.key] = s.value ?? "";
      }
      setSettings(map);
      setProfileForm({
        full_name: profile?.full_name ?? "",
        phone: profile?.phone ?? "",
      });
    })();
  }, [profile]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const entries = Object.entries(settings).map(([key, value]) => ({
      key,
      value,
      updated_by: user?.id,
    }));
    for (const entry of entries) {
      await supabase.from("settings").upsert(entry, { onConflict: "key" });
    }
    await logAction("update", "setting", null, "Updated system settings");
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    await supabase
      .from("profiles")
      .update({
        full_name: profileForm.full_name,
        phone: profileForm.phone,
      })
      .eq("id", user?.id);
    setProfileSaving(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your profile and system configuration." />

      {/* Profile settings — always editable by the user themselves */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">My Profile</h3>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Update your personal information.</p>
        <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Full Name" value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} />
            <Input label="Phone" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
          </div>
          {profileSaved && <p className="text-sm text-emerald-600 dark:text-emerald-400">Profile saved.</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={profileSaving} size="sm">
              <Save size={16} /> {profileSaving ? "Saving…" : "Save Profile"}
            </Button>
          </div>
        </form>
      </div>

      {/* System settings — requires settings.update */}
      {canUpdate && (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">System Configuration</h3>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Organization-wide settings.</p>
          <form onSubmit={handleSaveSettings} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Organization Name"
                value={settings.organization_name ?? ""}
                onChange={(e) => setSettings({ ...settings, organization_name: e.target.value })}
              />
              <Input
                label="Notification Email"
                type="email"
                value={settings.notification_email ?? ""}
                onChange={(e) => setSettings({ ...settings, notification_email: e.target.value })}
              />
              <Input
                label="License Alert (days before expiry)"
                type="number"
                value={settings.license_alert_days ?? ""}
                onChange={(e) => setSettings({ ...settings, license_alert_days: e.target.value })}
              />
            </div>
            {saved && <p className="text-sm text-emerald-600 dark:text-emerald-400">Settings saved.</p>}
            <div className="flex justify-end">
              <Button type="submit" disabled={saving} size="sm">
                <Save size={16} /> {saving ? "Saving…" : "Save Settings"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
