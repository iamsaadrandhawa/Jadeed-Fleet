import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  ArrowLeft, 
  Trash2, 
  Save, 
  Upload, 
  FileText, 
  Download,
  Car,
  Hash,
  User,
  Calendar,
  Building,
  Shield,
  BadgeCheck,
  AlertCircle,
  X,
  FolderOpen,
  File,
  Image,
  FileArchive,
  FileCheck,
  Truck,
  IdCard,
  ClipboardCheck,
  Wrench,
  FileSignature,
  CheckCircle,
  AlertTriangle
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
import type { Vehicle, Driver } from "@/shared/lib/types";

// Document categories
const DOCUMENT_CATEGORIES = [
  { value: "registration", label: "Registration", icon: FileCheck },
  { value: "insurance", label: "Insurance", icon: Shield },
  { value: "fitness", label: "Fitness Certificate", icon: ClipboardCheck },
  { value: "permit", label: "Permit", icon: IdCard },
  { value: "inspection", label: "Inspection Report", icon: Wrench },
  { value: "maintenance", label: "Maintenance Record", icon: FileSignature },
  { value: "tax", label: "Tax Document", icon: FileText },
  { value: "purchase", label: "Purchase Invoice", icon: FileArchive },
  { value: "image", label: "Vehicle Image", icon: Image },
  { value: "other", label: "Other", icon: File },
];

interface VehicleDocument {
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

export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { permissions } = useAuthStore();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Vehicle>>({});
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("other");
  const [deletingDoc, setDeletingDoc] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  const canUpdate = can(permissions, "vehicles", "update");
  const canDelete = can(permissions, "vehicles", "delete");

  useEffect(() => {
    if (!id) return;
    loadVehicleData();
  }, [id]);

  async function loadVehicleData() {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      // Load vehicle with assigned driver
      const { data: vehicleData, error: vehicleError } = await supabase
        .from("vehicles")
        .select(`
          *,
          assigned_driver:assigned_driver_id (
            id,
            full_name,
            email,
            phone,
            status
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (vehicleError) {
        console.error("Error loading vehicle:", vehicleError);
        setError(`Failed to load vehicle: ${vehicleError.message}`);
        setLoading(false);
        return;
      }

      if (vehicleData) {
        setVehicle(vehicleData as Vehicle);
        setForm(vehicleData as Vehicle);
      } else {
        setError("Vehicle not found");
        setLoading(false);
        return;
      }

      // Load drivers list for dropdown
      const { data: driversData, error: driversError } = await supabase
        .from("drivers")
        .select("id, full_name, status, email, phone")
        .order("full_name", { ascending: true });

      if (driversError) {
        console.error("Error loading drivers:", driversError);
      } else {
        setDrivers((driversData ?? []) as Driver[]);
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
        .from("vehicle-documents")
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
        .from("vehicle-documents")
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
        const newDoc: VehicleDocument = {
          name: fileName,
          path: filePath,
          category: selectedCategory,
          size: file.size,
          type: file.type,
        };
        
        setDocuments(prev => [...prev, newDoc]);
        
        await logAction("update", "vehicle", id, `Uploaded document ${fileName} (${selectedCategory})`);
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

  const handleDownload = async (doc: VehicleDocument) => {
    try {
      const { data } = await supabase.storage
        .from("vehicle-documents")
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

  const handleDeleteDocument = async (doc: VehicleDocument) => {
    if (!confirm(`Delete document "${doc.name}"? This cannot be undone.`)) return;
    
    setDeletingDoc(doc.path);
    try {
      const { error: deleteErr } = await supabase.storage
        .from("vehicle-documents")
        .remove([doc.path]);

      if (deleteErr) {
        setError(`Delete failed: ${deleteErr.message}`);
      } else {
        setDocuments(prev => prev.filter(d => d.path !== doc.path));
        await logAction("update", "vehicle", id, `Deleted document ${doc.name}`);
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
    if (!id || !vehicle) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateErr } = await supabase
        .from("vehicles")
        .update({
          make: form.make,
          model: form.model,
          year: form.year ? parseInt(form.year.toString()) : null,
          vin: form.vin || null,
          registration_number: form.registration_number || null,
          insurance_provider: form.insurance_provider || null,
          insurance_policy_number: form.insurance_policy_number || null,
          insurance_expiry: form.insurance_expiry || null,
          status: form.status || "active",
          department: form.department || null,
          assigned_driver_id: form.assigned_driver_id || null,
        })
        .eq("id", id);

      if (updateErr) {
        setError(`Update failed: ${updateErr.message}`);
        setSaving(false);
        return;
      }

      const oldDriverId = vehicle.assigned_driver_id;
      const newDriverId = form.assigned_driver_id;

      if (oldDriverId !== newDriverId) {
        if (oldDriverId) {
          await supabase
            .from("drivers")
            .update({ assigned_vehicle_id: null })
            .eq("id", oldDriverId);
        }
        if (newDriverId) {
          await supabase
            .from("drivers")
            .update({ assigned_vehicle_id: id })
            .eq("id", newDriverId);
        }
      }

      await logAction("update", "vehicle", id, `Updated vehicle ${form.make} ${form.model}`);
      
      await loadVehicleData();
      
      setSuccess("Vehicle updated successfully!");
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
    if (!id || !vehicle) return;
    if (!confirm(`Delete vehicle "${vehicle.make} ${vehicle.model}"? This cannot be undone.`)) return;

    try {
      if (documents.length > 0) {
        const paths = documents.map(d => d.path);
        await supabase.storage
          .from("vehicle-documents")
          .remove(paths);
      }

      if (vehicle.assigned_driver_id) {
        await supabase
          .from("drivers")
          .update({ assigned_vehicle_id: null })
          .eq("assigned_vehicle_id", id);
      }

      const { error: delErr } = await supabase.from("vehicles").delete().eq("id", id);
      if (delErr) {
        setError(`Delete failed: ${delErr.message}`);
        return;
      }

      await logAction("delete", "vehicle", id, `Deleted vehicle ${vehicle.make} ${vehicle.model}`);
      navigate("/UI/vehicles", { state: { refresh: true } });
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete vehicle");
    }
  };

  // Get documents by category
  const getDocumentsByCategory = (category: string) => {
    return documents.filter(doc => doc.category === category);
  };

  const insuranceDays = vehicle?.insurance_expiry ? daysUntil(vehicle.insurance_expiry) : null;
  const isInsuranceExpiring = insuranceDays !== null && insuranceDays <= 30 && insuranceDays >= 0;
  const isInsuranceExpired = insuranceDays !== null && insuranceDays < 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-200 dark:border-neutral-800 border-t-neutral-900 dark:border-t-neutral-100" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <AlertCircle size={48} className="text-neutral-400 dark:text-neutral-500" />
        <p className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Vehicle not found</p>
        <Link to="/UI/vehicles" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          Return to vehicles list
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link 
        to="/UI/vehicles" 
        className="inline-flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
      >
        <ArrowLeft size={16} /> Back to vehicles
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
        title={`${vehicle.make} ${vehicle.model}`}
        description={
          // FIX: Changed from <div> to <span> with flex
          <span className="flex items-center gap-3">
            {vehicle.registration_number && (
              <span className="text-neutral-500 dark:text-neutral-400">
                {vehicle.registration_number}
              </span>
            )}
            <Badge tone={statusTone(vehicle.status)} dot>
              {vehicle.status}
            </Badge>
            {vehicle.year && (
              <Badge tone="neutral">
                {vehicle.year}
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
        {/* Main vehicle details */}
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 lg:col-span-2">
          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input 
                  label="Make" 
                  required
                  value={form.make ?? ""} 
                  onChange={(e) => setForm({ ...form, make: e.target.value })} 
                />
                <Input 
                  label="Model" 
                  required
                  value={form.model ?? ""} 
                  onChange={(e) => setForm({ ...form, model: e.target.value })} 
                />
                <Input 
                  label="Year" 
                  type="number" 
                  value={form.year ?? ""} 
                  onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || null })} 
                />
                <Input 
                  label="VIN" 
                  value={form.vin ?? ""} 
                  onChange={(e) => setForm({ ...form, vin: e.target.value })} 
                />
                <Input 
                  label="Registration Number" 
                  value={form.registration_number ?? ""} 
                  onChange={(e) => setForm({ ...form, registration_number: e.target.value })} 
                />
                <Input 
                  label="Department" 
                  value={form.department ?? ""} 
                  onChange={(e) => setForm({ ...form, department: e.target.value })} 
                />
                <Input 
                  label="Insurance Provider" 
                  value={form.insurance_provider ?? ""} 
                  onChange={(e) => setForm({ ...form, insurance_provider: e.target.value })} 
                />
                <Input 
                  label="Insurance Policy Number" 
                  value={form.insurance_policy_number ?? ""} 
                  onChange={(e) => setForm({ ...form, insurance_policy_number: e.target.value })} 
                />
                <Input 
                  label="Insurance Expiry" 
                  type="date" 
                  value={form.insurance_expiry ?? ""} 
                  onChange={(e) => setForm({ ...form, insurance_expiry: e.target.value })} 
                />
                <Select 
                  label="Status" 
                  value={form.status ?? "active"} 
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="maintenance">In Maintenance</option>
                  <option value="inactive">Inactive</option>
                </Select>
                <Select 
                  label="Assigned Driver" 
                  value={form.assigned_driver_id ?? ""} 
                  onChange={(e) => setForm({ ...form, assigned_driver_id: e.target.value || null })}
                  className="sm:col-span-2"
                >
                  <option value="">Unassigned</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name} {d.status !== "active" ? `(${d.status})` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => { 
                    setEditing(false); 
                    setForm(vehicle); 
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
              {/* Vehicle Details */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Vehicle Information</h4>
                <Field 
                  icon={<Car size={14} />}
                  label="Make" 
                  value={vehicle.make} 
                />
                <Field 
                  icon={<Car size={14} />}
                  label="Model" 
                  value={vehicle.model} 
                />
                <Field 
                  icon={<Calendar size={14} />}
                  label="Year" 
                  value={vehicle.year?.toString()} 
                />
                <Field 
                  icon={<Hash size={14} />}
                  label="VIN" 
                  value={vehicle.vin} 
                />
                <Field 
                  icon={<Hash size={14} />}
                  label="Registration Number" 
                  value={vehicle.registration_number} 
                />
                <Field 
                  icon={<Building size={14} />}
                  label="Department" 
                  value={vehicle.department} 
                />
              </div>

              {/* Insurance & Assignment */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Insurance & Assignment</h4>
                <Field 
                  icon={<Shield size={14} />}
                  label="Insurance Provider" 
                  value={vehicle.insurance_provider} 
                />
                <Field 
                  icon={<BadgeCheck size={14} />}
                  label="Insurance Policy" 
                  value={vehicle.insurance_policy_number} 
                />
                <div>
                  <dt className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    <Calendar size={14} />
                    Insurance Expiry
                  </dt>
                  <dd className="mt-1">
                    {vehicle.insurance_expiry ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-neutral-900 dark:text-neutral-100">
                          {formatDate(vehicle.insurance_expiry)}
                        </span>
                        {isInsuranceExpiring && (
                          <Badge tone="warning" className="w-fit">
                            {insuranceDays} days remaining
                          </Badge>
                        )}
                        {isInsuranceExpired && (
                          <Badge tone="danger" className="w-fit">
                            Expired {Math.abs(insuranceDays)} days ago
                          </Badge>
                        )}
                        {!isInsuranceExpiring && !isInsuranceExpired && insuranceDays !== null && (
                          <Badge tone="success" className="w-fit">
                            {insuranceDays} days remaining
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
                    <User size={14} />
                    Assigned Driver
                  </dt>
                  <dd className="mt-1">
                    {vehicle.assigned_driver ? (
                      <div className="flex flex-col gap-1">
                        <Link 
                          to={`/UI/drivers/${vehicle.assigned_driver.id}`}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {vehicle.assigned_driver.full_name}
                        </Link>
                        {vehicle.assigned_driver.status && (
                          <Badge tone={statusTone(vehicle.assigned_driver.status)} dot className="w-fit">
                            {vehicle.assigned_driver.status}
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
                    <Badge tone={statusTone(vehicle.status)} dot className="mt-1">
                      {vehicle.status}
                    </Badge>
                  } 
                />
              </div>
            </div>
          )}
        </div>

        {/* Documents section with categories */}
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Documents</h3>
            <Badge tone="neutral">{documents.length}</Badge>
          </div>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Upload and manage vehicle documents
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
                <p className="text-xs text-neutral-400 dark:text-neutral-500">Upload documents to keep track of vehicle records</p>
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