import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  ArrowLeft, 
  Trash2, 
  Save,
  Car,
  Hash,
  User,
  Calendar,
  Mail,
  Phone,
  BadgeCheck,
  AlertCircle,
  Shield,
  Users,
  Clock,
  Home,
  PhoneCall,
  UserCircle,
  FileText,
  AlertTriangle,
  CreditCard,
  MapPin,
  Briefcase,
  Upload,
  Download,
  X,
  FolderOpen,
  File,
  Image,
  FileArchive,
  FileCheck,
  IdCard,
  ClipboardCheck,
  Wrench,
  FileSignature,
  CheckCircle
} from "lucide-react";
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

// Document categories for drivers
const DOCUMENT_CATEGORIES = [
  { value: "license", label: "Driver's License", icon: IdCard },
  { value: "cnic", label: "CNIC", icon: CreditCard },
  { value: "passport", label: "Passport", icon: FileCheck },
  { value: "medical", label: "Medical Certificate", icon: ClipboardCheck },
  { value: "training", label: "Training Certificate", icon: FileSignature },
  { value: "evaluation", label: "Driver Evaluation", icon: Wrench },
  { value: "photo", label: "Driver Photo", icon: Image },
  { value: "contract", label: "Employment Contract", icon: FileArchive },
  { value: "other", label: "Other", icon: File },
];

interface DriverDocument {
  id?: string;
  name: string;
  path: string;
  category: string;
  uploaded_at?: string;
  size?: number;
  type?: string;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'idle' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { permissions } = useAuthStore();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Driver>>({});
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("other");
  const [deletingDoc, setDeletingDoc] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  const canUpdate = can(permissions, "drivers", "update");
  const canDelete = can(permissions, "drivers", "delete");

  useEffect(() => {
    if (!id) return;
    loadDriverData();
  }, [id]);

  useEffect(() => {
    loadLocationSuggestions();
  }, []);

  async function loadLocationSuggestions() {
    const [{ data: d }, { data: v }] = await Promise.all([
      supabase.from("drivers").select("location").not("location", "is", null),
      supabase.from("vehicles").select("location").not("location", "is", null),
    ]);
    const set = new Set<string>(["Head Office"]);
    for (const row of d ?? []) if (row.location) set.add(row.location);
    for (const row of v ?? []) if (row.location) set.add(row.location);
    setLocationSuggestions(Array.from(set).sort());
  }

  async function loadDriverData() {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      // Load driver with assigned vehicle
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select(`
          *,
          assigned_vehicle:assigned_vehicle_id (
            id,
            make,
            model,
            registration_number,
            status,
            year
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (driverError) {
        console.error("Error loading driver:", driverError);
        setError(`Failed to load driver: ${driverError.message}`);
        setLoading(false);
        return;
      }

      if (driverData) {
        setDriver(driverData as Driver);
        setForm(driverData as Driver);
      } else {
        setError("Driver not found");
        setLoading(false);
        return;
      }

      // Load vehicles for dropdown
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("id, make, model, registration_number, status, year")
        .order("make", { ascending: true });

      if (vehiclesError) {
        console.error("Error loading vehicles:", vehiclesError);
      } else {
        setVehicles((vehiclesData ?? []) as Vehicle[]);
      }

      // Load documents
      await loadDocuments();

    } catch (err) {
      console.error("Unexpected error:", err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function loadDocuments() {
    if (!id) return;
    try {
      const { data, error } = await supabase.storage
        .from("driver-documents")
        .list(id);

      if (!error && data) {
        const docs = data.map((file) => {
          let category = "other";
          const fileName = file.name.toLowerCase();
          
          for (const cat of DOCUMENT_CATEGORIES) {
            if (fileName.includes(cat.value) || fileName.includes(cat.label.toLowerCase())) {
              category = cat.value;
              break;
            }
          }
          
          return {
            name: file.name,
            path: `${id}/${file.name}`,
            category: category,
            size: file.metadata?.size,
            type: file.metadata?.mimetype,
          };
        });
        
        setDocuments(docs);
      } else {
        setDocuments([]);
      }
    } catch (err) {
      console.error("Error loading documents:", err);
      setDocuments([]);
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    setError(null);
    
    // Initialize progress
    setUploadProgress({
      fileName: file.name,
      progress: 0,
      status: 'uploading'
    });

    try {
      // Create a unique filename with category prefix
      const timestamp = Date.now();
      const ext = file.name.split('.').pop();
      const baseName = file.name.replace(/\.[^.]+$/, '');
      const fileName = `${selectedCategory}_${timestamp}_${baseName}.${ext}`;
      const filePath = `${id}/${fileName}`;

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (!prev) return null;
          const newProgress = Math.min(prev.progress + Math.random() * 15, 90);
          return { ...prev, progress: newProgress };
        });
      }, 200);

      const { error: uploadErr } = await supabase.storage
        .from("driver-documents")
        .upload(filePath, file, { 
          upsert: false,
          cacheControl: '3600'
        });

      clearInterval(progressInterval);

      if (uploadErr) {
        setUploadProgress(prev => prev ? { ...prev, status: 'error', error: uploadErr.message } : null);
        setError(`Upload failed: ${uploadErr.message}`);
      } else {
        // Complete the progress
        setUploadProgress(prev => prev ? { ...prev, progress: 100, status: 'completed' } : null);
        
        // Add document to list
        const newDoc: DriverDocument = {
          name: fileName,
          path: filePath,
          category: selectedCategory,
          size: file.size,
          type: file.type,
        };
        
        setDocuments(prev => [...prev, newDoc]);
        
        await logAction("update", "driver", id, `Uploaded document ${fileName} (${selectedCategory})`);
        setSuccess(`Document "${file.name}" uploaded successfully as ${selectedCategory}`);
        
        // Clear progress after delay
        setTimeout(() => {
          setUploadProgress(null);
        }, 2000);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setUploadProgress(prev => prev ? { ...prev, status: 'error', error: 'Upload failed' } : null);
      setError("Failed to upload document");
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleDownload = async (doc: DriverDocument) => {
    try {
      const { data } = await supabase.storage
        .from("driver-documents")
        .createSignedUrl(doc.path, 60);
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      } else {
        setError("Failed to generate download link");
      }
    } catch (err) {
      console.error("Download error:", err);
      setError("Failed to download document");
    }
  };

  const handleDeleteDocument = async (doc: DriverDocument) => {
    if (!confirm(`Delete document "${doc.name}"? This cannot be undone.`)) return;
    
    setDeletingDoc(doc.path);
    try {
      const { error: deleteErr } = await supabase.storage
        .from("driver-documents")
        .remove([doc.path]);

      if (deleteErr) {
        setError(`Delete failed: ${deleteErr.message}`);
      } else {
        setDocuments(prev => prev.filter(d => d.path !== doc.path));
        await logAction("update", "driver", id, `Deleted document ${doc.name}`);
        setSuccess(`Document "${doc.name}" deleted successfully`);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete document");
    } finally {
      setDeletingDoc(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !driver) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateErr } = await supabase
        .from("drivers")
        .update({
          full_name: form.full_name,
          phone: form.phone,
          cnic: form.cnic,
          address: form.address,
          emergency_contact_name: form.emergency_contact_name,
          emergency_contact_phone: form.emergency_contact_phone,
          license_number: form.license_number,
          license_class: form.license_class,
          license_expiry: form.license_expiry,
          years_experience: form.years_experience || 0,
          status: form.status || "active",
          assigned_vehicle_id: form.assigned_vehicle_id || null,
          notes: form.notes,
          location: form.location || null,
        })
        .eq("id", id);

      if (updateErr) {
        setError(`Update failed: ${updateErr.message}`);
        setSaving(false);
        return;
      }

      // Handle vehicle assignment changes
      const oldVehicleId = driver.assigned_vehicle_id;
      const newVehicleId = form.assigned_vehicle_id;

      if (oldVehicleId !== newVehicleId) {
        if (oldVehicleId) {
          await supabase
            .from("vehicles")
            .update({ assigned_driver_id: null })
            .eq("id", oldVehicleId);
        }
        if (newVehicleId) {
          await supabase
            .from("vehicles")
            .update({ assigned_driver_id: id })
            .eq("id", newVehicleId);
        }
      }

      await logAction("update", "driver", id, `Updated driver ${form.full_name}`);
      
      await loadDriverData();
      await loadLocationSuggestions();
      
      setSuccess("Driver updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
      setEditing(false);
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !driver) return;
    if (!confirm(`Delete driver "${driver.full_name}"? This cannot be undone.`)) return;

    try {
      // Delete all documents first
      if (documents.length > 0) {
        const paths = documents.map(d => d.path);
        await supabase.storage
          .from("driver-documents")
          .remove(paths);
      }

      // Clear vehicle assignment
      if (driver.assigned_vehicle_id) {
        await supabase
          .from("vehicles")
          .update({ assigned_driver_id: null })
          .eq("id", driver.assigned_vehicle_id);
      }

      const { error: delErr } = await supabase.from("drivers").delete().eq("id", id);
      if (delErr) {
        setError(`Delete failed: ${delErr.message}`);
        return;
      }

      await logAction("delete", "driver", id, `Deleted driver ${driver.full_name}`);
      navigate("/UI/drivers", { state: { refresh: true } });
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete driver");
    }
  };

  // Get documents by category
  const getDocumentsByCategory = (category: string) => {
    return documents.filter(doc => doc.category === category);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-200 dark:border-neutral-800 border-t-neutral-900 dark:border-t-neutral-100" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <AlertCircle size={48} className="text-neutral-400 dark:text-neutral-500" />
        <p className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Driver not found</p>
        <Link to="/UI/drivers" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          Return to drivers list
        </Link>
      </div>
    );
  }

  const days = driver.license_expiry ? daysUntil(driver.license_expiry) : null;
  const isExpiring = days !== null && days <= 30 && days >= 0;
  const isExpired = days !== null && days < 0;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link 
        to="/UI/drivers" 
        className="inline-flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
      >
        <ArrowLeft size={16} /> Back to drivers
      </Link>

      {/* Success/Error messages */}
      {success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-sm text-green-800 dark:text-green-200 animate-in fade-in slide-in-from-top-2 duration-300">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <PageHeader
        title={driver.full_name}
        description={
          <span className="flex items-center gap-2">
          <Badge tone={statusTone(driver.status)} dot>
              {driver.status}
            </Badge>
            {driver.license_number && (
              <Badge tone="neutral">
                {driver.license_number}
              </Badge>
            )}
            {driver.cnic && (
              <Badge tone="neutral">
                CNIC: {driver.cnic}
              </Badge>
            )}
            {driver.location && (
              <Badge tone="info">
                {driver.location}
              </Badge>
            )}
          </span>
        }
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
        {/* Main driver details */}
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 lg:col-span-2">
          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Personal Information */}
                <Input 
                  label="Full Name" 
                  required
                  value={form.full_name ?? ""} 
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })} 
                />
              
                <Input 
                  label="Phone" 
                  value={form.phone ?? ""} 
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} 
                />
                <Input 
                  label="CNIC" 
                  value={form.cnic ?? ""} 
                  onChange={(e) => setForm({ ...form, cnic: e.target.value })} 
                  placeholder="XXXXX-XXXXXXX-X"
                />
                <Input 
                  label="Address" 
                  value={form.address ?? ""} 
                  onChange={(e) => setForm({ ...form, address: e.target.value })} 
                  className="sm:col-span-2"
                />

                {/* Site / Location */}
                <div className="sm:col-span-2">
                  <Input
                    label="Site / Location"
                    value={form.location ?? ""}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. Head Office, Lahore Site, Karachi Warehouse"
                    list="location-suggestions"
                  />
                  <datalist id="location-suggestions">
                    {locationSuggestions.map((loc) => (
                      <option key={loc} value={loc} />
                    ))}
                  </datalist>
                  {form.assigned_vehicle_id && (
                    <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                      This driver's assigned vehicle location updates automatically to match.
                    </p>
                  )}
                </div>
                
                {/* Emergency Contact */}
                <Input 
                  label="Emergency Contact Name" 
                  value={form.emergency_contact_name ?? ""} 
                  onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} 
                />
                <Input 
                  label="Emergency Contact Phone" 
                  value={form.emergency_contact_phone ?? ""} 
                  onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} 
                />

                {/* License Information */}
                <Input 
                  label="License Number" 
                  value={form.license_number ?? ""} 
                  onChange={(e) => setForm({ ...form, license_number: e.target.value })} 
                />
                <Input 
                  label="License Class" 
                  value={form.license_class ?? ""} 
                  onChange={(e) => setForm({ ...form, license_class: e.target.value })} 
                  placeholder="e.g., LTV, HTV, PSV"
                />
                <Input 
                  label="License Expiry" 
                  type="date" 
                  value={form.license_expiry ?? ""} 
                  onChange={(e) => setForm({ ...form, license_expiry: e.target.value })} 
                />
                <Input 
                  label="Years of Experience" 
                  type="number" 
                  value={form.years_experience ?? 0} 
                  onChange={(e) => setForm({ ...form, years_experience: parseInt(e.target.value) || 0 })} 
                />
                
                {/* Status & Assignment */}
                <Select 
                  label="Status" 
                  value={form.status ?? "active"} 
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </Select>
                <Select 
                  label="Assigned Vehicle" 
                  value={form.assigned_vehicle_id ?? ""} 
                  onChange={(e) => setForm({ ...form, assigned_vehicle_id: e.target.value || null })}
                  className="sm:col-span-2"
                >
                  <option value="">Unassigned</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.make} {v.model} ({v.registration_number || 'No reg'}) {v.status !== 'active' ? `[${v.status}]` : ''}
                    </option>
                  ))}
                </Select>
                
                {/* Notes */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={form.notes ?? ""}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={3}
                    className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500"
                    placeholder="Additional notes about the driver..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => { 
                    setEditing(false); 
                    setForm(driver); 
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  <Save size={16} /> {saving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Personal Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Personal Information</h4>
                <Field 
                  icon={<User size={14} />}
                  label="Full Name" 
                  value={driver.full_name} 
                />
               
                <Field 
                  icon={<Phone size={14} />}
                  label="Phone" 
                  value={driver.phone} 
                />
                <Field 
                  icon={<CreditCard size={14} />}
                  label="CNIC" 
                  value={driver.cnic} 
                />
                <Field 
                  icon={<MapPin size={14} />}
                  label="Address" 
                  value={driver.address} 
                />
                <Field 
                  icon={<Briefcase size={14} />}
                  label="Site / Location" 
                  value={driver.location} 
                />
                <Field 
                  icon={<Clock size={14} />}
                  label="Years of Experience" 
                  value={driver.years_experience?.toString()} 
                />
              </div>

              {/* License & Assignment */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">License & Assignment</h4>
                <Field 
                  icon={<BadgeCheck size={14} />}
                  label="License Number" 
                  value={driver.license_number} 
                />
                <Field 
                  icon={<Shield size={14} />}
                  label="License Class" 
                  value={driver.license_class} 
                />
                <div>
                  <dt className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    <Calendar size={14} />
                    License Expiry
                  </dt>
                  <dd className="mt-1">
                    {driver.license_expiry ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-neutral-900 dark:text-neutral-100">
                          {formatDate(driver.license_expiry)}
                        </span>
                        {isExpiring && (
                          <Badge tone="warning" className="w-fit">
                            {days} days remaining
                          </Badge>
                        )}
                        {isExpired && (
                          <Badge tone="danger" className="w-fit">
                            Expired {Math.abs(days)} days ago
                          </Badge>
                        )}
                        {!isExpiring && !isExpired && days !== null && (
                          <Badge tone="success" className="w-fit">
                            {days} days remaining
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-neutral-400 dark:text-neutral-500">—</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    <Car size={14} />
                    Assigned Vehicle
                  </dt>
                  <dd className="mt-1">
                    {driver.assigned_vehicle ? (
                      <div className="flex flex-col gap-1">
                        <Link 
                          to={`/UI/vehicles/${driver.assigned_vehicle.id}`}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {driver.assigned_vehicle.make} {driver.assigned_vehicle.model}
                        </Link>
                        {driver.assigned_vehicle.registration_number && (
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            Reg: {driver.assigned_vehicle.registration_number}
                          </span>
                        )}
                        {driver.assigned_vehicle.status && (
                          <Badge tone={statusTone(driver.assigned_vehicle.status)} dot className="w-fit text-xs">
                            {driver.assigned_vehicle.status}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-neutral-400 dark:text-neutral-500">Unassigned</span>
                    )}
                  </dd>
                </div>
                <Field 
                  label="Status" 
                  value={
                    <Badge tone={statusTone(driver.status)} dot className="mt-1">
                      {driver.status}
                    </Badge>
                  } 
                />
              </div>

              {/* Emergency Contact */}
              <div className="sm:col-span-2 space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Emergency Contact</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field 
                    icon={<UserCircle size={14} />}
                    label="Contact Name" 
                    value={driver.emergency_contact_name} 
                  />
                  <Field 
                    icon={<PhoneCall size={14} />}
                    label="Contact Phone" 
                    value={driver.emergency_contact_phone} 
                  />
                </div>
              </div>

              {/* Notes */}
              {driver.notes && (
                <div className="sm:col-span-2 space-y-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                  <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Notes</h4>
                  <div className="rounded-md bg-neutral-50 dark:bg-neutral-800/50 p-3">
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                      {driver.notes}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Documents section */}
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Documents</h3>
            <Badge tone="neutral">{documents.length}</Badge>
          </div>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Upload and manage driver documents
          </p>
          
          {/* Upload section */}
          {canUpdate && (
            <div className="mt-3 space-y-2">
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full"
              >
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </Select>
              
              <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 dark:border-neutral-700 px-4 py-3 text-sm text-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:bg-neutral-800 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <Upload size={16} />
                {uploading ? "Uploading…" : `Upload ${DOCUMENT_CATEGORIES.find(c => c.value === selectedCategory)?.label}`}
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={handleUpload} 
                  disabled={uploading} 
                />
              </label>

              {/* Upload Progress Bar */}
              {uploadProgress && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-600 dark:text-neutral-400 truncate max-w-[200px]">
                      {uploadProgress.fileName}
                    </span>
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {Math.round(uploadProgress.progress)}%
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ease-out ${
                        uploadProgress.status === 'error' 
                          ? 'bg-red-500' 
                          : uploadProgress.status === 'completed'
                          ? 'bg-green-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${uploadProgress.progress}%` }}
                    />
                  </div>
                  
                  {/* Status message */}
                  {uploadProgress.status === 'uploading' && (
                    <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      <span>Uploading...</span>
                    </div>
                  )}
                  
                  {uploadProgress.status === 'completed' && (
                    <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 animate-in fade-in duration-300">
                      <CheckCircle size={14} />
                      <span>Upload complete!</span>
                    </div>
                  )}
                  
                  {uploadProgress.status === 'error' && (
                    <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                      <AlertTriangle size={14} />
                      <span>{uploadProgress.error || 'Upload failed'}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Document categories */}
          <div className="mt-4 space-y-4 max-h-[400px] overflow-y-auto">
            {DOCUMENT_CATEGORIES.map((category) => {
              const docs = getDocumentsByCategory(category.value);
              if (docs.length === 0) return null;
              
              const Icon = category.icon;
              
              return (
                <div key={category.value} className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    <Icon size={14} />
                    <span>{category.label}</span>
                    <Badge tone="neutral" className="text-xs">
                      {docs.length}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {docs.map((doc) => (
                      <div 
                        key={doc.path} 
                        className="flex items-center justify-between rounded-md border border-neutral-200 dark:border-neutral-800 px-2 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <FileText size={14} className="flex-shrink-0 text-neutral-400 dark:text-neutral-500" />
                          <span className="truncate text-xs text-neutral-700 dark:text-neutral-300">
                            {doc.name.replace(/^[^_]+_[^_]+_/, '')}
                          </span>
                          {doc.size && (
                            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 flex-shrink-0">
                              {(doc.size / 1024).toFixed(1)} KB
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleDownload(doc)}
                            className="rounded p-1 text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                            title="Download"
                          >
                            <Download size={14} />
                          </button>
                          {canUpdate && (
                            <button
                              onClick={() => handleDeleteDocument(doc)}
                              disabled={deletingDoc === doc.path}
                              className="rounded p-1 text-neutral-400 dark:text-neutral-500 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              title="Delete"
                            >
                              {deletingDoc === doc.path ? (
                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
                              ) : (
                                <X size={14} />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            
            {documents.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FolderOpen size={32} className="text-neutral-300 dark:text-neutral-700" />
                <p className="mt-2 text-sm text-neutral-400 dark:text-neutral-500">No documents uploaded</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">Upload documents to keep track of driver records</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ 
  label, 
  value, 
  icon 
}: { 
  label: string; 
  value: string | number | React.ReactNode | null | undefined;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-sm text-neutral-900 dark:text-neutral-100">
        {value || "—"}
      </dd>
    </div>
  );
}