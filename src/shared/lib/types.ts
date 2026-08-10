export type Domain =
  | "dashboard"
  | "drivers"
  | "vehicles"
  | "users"
  | "roles"
  | "settings"
  | "logs";

export type CrudAction = "view" | "create" | "read" | "update" | "delete";

export type DomainPermissions = Record<CrudAction, boolean>;

export type Permissions = Record<Domain, DomainPermissions>;

export interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: Permissions;
  is_system: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  role_id: string | null;
  full_name: string | null;
  phone: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  email?: string;
  role?: Role | null;
}

export interface Driver {
  id: string;
  full_name: string;
  phone: string | null;
  license_number: string | null;
  license_class: string | null;
  license_expiry: string | null;
  years_experience: number | null;
  status: string;
  assigned_vehicle_id: string | null;
  employee_id: string | null;
  department: string | null;
  job_title: string | null;
  joining_date: string | null;
  cnic: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
  assigned_vehicle?: Vehicle | null;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number | null;
  vin: string | null;
  registration_number: string | null;
  insurance_provider: string | null;
  insurance_policy_number: string | null;
  insurance_expiry: string | null;
  status: string;
  assigned_driver_id: string | null;
  department: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
  assigned_driver?: Driver | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  description: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface Setting {
  id: string;
  key: string;
  value: string | null;
  updated_at: string;
}

export const DOMAINS: Domain[] = [
  "dashboard",
  "drivers",
  "vehicles",
  "users",
  "roles",
  "settings",
  "logs",
];

export const DOMAIN_LABELS: Record<Domain, string> = {
  dashboard: "Dashboard",
  drivers: "Drivers",
  vehicles: "Vehicles",
  users: "Users",
  roles: "Roles",
  settings: "Settings",
  logs: "Audit Logs",
};

export const CRUD_ACTIONS: CrudAction[] = [
  "view",
  "create",
  "read",
  "update",
  "delete",
];

export function emptyPermissions(): Permissions {
  const perm = {} as Permissions;
  for (const d of DOMAINS) {
    perm[d] = {
      view: false,
      create: false,
      read: false,
      update: false,
      delete: false,
    };
  }
  return perm;
}
