import { useEffect, useState } from "react";
import { Save, Code, Heart, Mail, Phone, MapPin, Globe } from "lucide-react";
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

  // Codraze Software House Info
  const codrazeInfo = {
    name: "Codraze",
    tagline: "Software · Networking · Training",
    email: "saadali.it@gmail.com",
    phone: "+92 317 25977",
    whatsapp: "+923171725977",
    address: "Shahkot, Punjab, Pakistan",
    website: "https://codraze.vercel.app",
    responseTime: "We typically respond within 24 hours during business days."
  };

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
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Update your personal information.</p>
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
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Organization-wide settings.</p>
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

      {/* Codraze Software House - Contact Us */}
      <div className="rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-neutral-900 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Code className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Contact Us</h3>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Heart className="w-5 h-5 text-blue-600 dark:text-blue-400 fill-blue-600 dark:fill-blue-400" />
            <span className="text-lg font-bold text-blue-700 dark:text-blue-300">{codrazeInfo.name}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{codrazeInfo.tagline}</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <a href={`mailto:${codrazeInfo.email}`} className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {codrazeInfo.email}
                </a>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">{codrazeInfo.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <a href={codrazeInfo.website} target="_blank" rel="noopener noreferrer" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {codrazeInfo.website.replace('https://', '')}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700 dark:text-gray-300">{codrazeInfo.address}</span>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center flex-wrap gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              &copy; {new Date().getFullYear()} {codrazeInfo.name} - All Rights Reserved
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Built with</span>
              <Heart className="w-3 h-3 text-red-500 fill-red-500" />
              <span className="text-xs text-gray-400">by {codrazeInfo.name}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}