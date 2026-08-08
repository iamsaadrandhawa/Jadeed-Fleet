/*
# Fleet Management — Core Schema, RBAC, and Audit Logging

## Overview
Builds the complete data layer for a Fleet Management application with role-based
access control (RBAC) driven by a per-role JSON permission matrix stored in the
`roles` table. Security is enforced at the database level via Row Level Security
policies that read the requesting user's role permissions, so the Roles screen
is the single source of truth for what every role can do.

## Tables
- roles: name, description, permissions (jsonb matrix), is_system, status
- profiles: 1:1 with auth.users, role_id, full_name, phone, status
- drivers: fleet driver records, assigned_vehicle_id (FK to vehicles)
- vehicles: fleet vehicle records, assigned_driver_id (FK to drivers)
- audit_logs: append-only log of create/update/delete actions
- settings: key/value organization config

## Security
- RLS on every table.
- Helper functions current_user_permissions(), has_permission(domain,action),
  current_user_role_id(), current_user_email() — SECURITY DEFINER, read the
  caller's role permissions from profiles->roles.
- Policies use has_permission() so the matrix is the source of truth.
- audit_logs: insert by any authenticated user; read/delete only with logs permission.
- profiles: self read/update; users.read for listing; users.update for editing;
  users.delete for deletion.

## Seed
- Four default roles (Super Admin, Admin, Fleet Manager, Viewer) with matrices.
- Default organization settings.
*/

-- ============================================================
-- ROLES
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_system boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE SET NULL,
  full_name text,
  phone text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- DRIVERS (no FK to vehicles yet — added after vehicles exists)
-- ============================================================
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  phone text,
  license_number text,
  license_class text,
  license_expiry date,
  years_experience integer DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  assigned_vehicle_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- VEHICLES (no FK to drivers yet — added after both exist)
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  make text NOT NULL,
  model text NOT NULL,
  year integer,
  vin text UNIQUE,
  registration_number text UNIQUE,
  insurance_provider text,
  insurance_policy_number text,
  insurance_expiry date,
  status text NOT NULL DEFAULT 'active',
  assigned_driver_id uuid,
  department text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add cross-references now that both tables exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'drivers_assigned_vehicle_id_fkey'
  ) THEN
    ALTER TABLE drivers
      ADD CONSTRAINT drivers_assigned_vehicle_id_fkey
      FOREIGN KEY (assigned_vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'vehicles_assigned_driver_id_fkey'
  ) THEN
    ALTER TABLE vehicles
      ADD CONSTRAINT vehicles_assigned_driver_id_fkey
      FOREIGN KEY (assigned_driver_id) REFERENCES drivers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- AUDIT LOGS (append-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  description text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- HELPER FUNCTIONS (SECURITY DEFINER so they can read profiles/roles)
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_user_permissions()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.permissions
  FROM profiles p
  JOIN roles r ON r.id = p.role_id
  WHERE p.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_role_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role_id FROM profiles p WHERE p.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.has_permission(p_domain text, p_action text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (public.current_user_permissions() -> p_domain ->> p_action)::boolean,
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

-- ============================================================
-- updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS roles_touch ON roles;
CREATE TRIGGER roles_touch BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS profiles_touch ON profiles;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS drivers_touch ON drivers;
CREATE TRIGGER drivers_touch BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS vehicles_touch ON vehicles;
CREATE TRIGGER vehicles_touch BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS settings_touch ON settings;
CREATE TRIGGER settings_touch BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ---------- ROLES ----------
DROP POLICY IF EXISTS "roles_select" ON roles;
CREATE POLICY "roles_select" ON roles FOR SELECT
  TO authenticated USING (public.has_permission('roles','read'));

DROP POLICY IF EXISTS "roles_insert" ON roles;
CREATE POLICY "roles_insert" ON roles FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('roles','create'));

DROP POLICY IF EXISTS "roles_update" ON roles;
CREATE POLICY "roles_update" ON roles FOR UPDATE
  TO authenticated USING (public.has_permission('roles','update'))
  WITH CHECK (public.has_permission('roles','update'));

DROP POLICY IF EXISTS "roles_delete" ON roles;
CREATE POLICY "roles_delete" ON roles FOR DELETE
  TO authenticated USING (public.has_permission('roles','delete'));

-- ---------- PROFILES ----------
DROP POLICY IF EXISTS "profiles_select_own_or_perm" ON profiles;
CREATE POLICY "profiles_select_own_or_perm" ON profiles FOR SELECT
  TO authenticated USING (
    id = auth.uid() OR public.has_permission('users','read')
  );

DROP POLICY IF EXISTS "profiles_update_own_or_perm" ON profiles;
CREATE POLICY "profiles_update_own_or_perm" ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.has_permission('users','update'))
  WITH CHECK (id = auth.uid() OR public.has_permission('users','update'));

DROP POLICY IF EXISTS "profiles_delete_perm" ON profiles;
CREATE POLICY "profiles_delete_perm" ON profiles FOR DELETE
  TO authenticated USING (public.has_permission('users','delete'));

DROP POLICY IF EXISTS "profiles_insert_perm" ON profiles;
CREATE POLICY "profiles_insert_perm" ON profiles FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('users','create'));

-- ---------- DRIVERS ----------
DROP POLICY IF EXISTS "drivers_select" ON drivers;
CREATE POLICY "drivers_select" ON drivers FOR SELECT
  TO authenticated USING (public.has_permission('drivers','read'));

DROP POLICY IF EXISTS "drivers_insert" ON drivers;
CREATE POLICY "drivers_insert" ON drivers FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('drivers','create'));

DROP POLICY IF EXISTS "drivers_update" ON drivers;
CREATE POLICY "drivers_update" ON drivers FOR UPDATE
  TO authenticated USING (public.has_permission('drivers','update'))
  WITH CHECK (public.has_permission('drivers','update'));

DROP POLICY IF EXISTS "drivers_delete" ON drivers;
CREATE POLICY "drivers_delete" ON drivers FOR DELETE
  TO authenticated USING (public.has_permission('drivers','delete'));

-- ---------- VEHICLES ----------
DROP POLICY IF EXISTS "vehicles_select" ON vehicles;
CREATE POLICY "vehicles_select" ON vehicles FOR SELECT
  TO authenticated USING (public.has_permission('vehicles','read'));

DROP POLICY IF EXISTS "vehicles_insert" ON vehicles;
CREATE POLICY "vehicles_insert" ON vehicles FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('vehicles','create'));

DROP POLICY IF EXISTS "vehicles_update" ON vehicles;
CREATE POLICY "vehicles_update" ON vehicles FOR UPDATE
  TO authenticated USING (public.has_permission('vehicles','update'))
  WITH CHECK (public.has_permission('vehicles','update'));

DROP POLICY IF EXISTS "vehicles_delete" ON vehicles;
CREATE POLICY "vehicles_delete" ON vehicles FOR DELETE
  TO authenticated USING (public.has_permission('vehicles','delete'));

-- ---------- AUDIT LOGS ----------
DROP POLICY IF EXISTS "logs_insert_any" ON audit_logs;
CREATE POLICY "logs_insert_any" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "logs_select_perm" ON audit_logs;
CREATE POLICY "logs_select_perm" ON audit_logs FOR SELECT
  TO authenticated USING (public.has_permission('logs','read'));

DROP POLICY IF EXISTS "logs_delete_perm" ON audit_logs;
CREATE POLICY "logs_delete_perm" ON audit_logs FOR DELETE
  TO authenticated USING (public.has_permission('logs','delete'));

-- ---------- SETTINGS ----------
DROP POLICY IF EXISTS "settings_select" ON settings;
CREATE POLICY "settings_select" ON settings FOR SELECT
  TO authenticated USING (public.has_permission('settings','read'));

DROP POLICY IF EXISTS "settings_update" ON settings;
CREATE POLICY "settings_update" ON settings FOR UPDATE
  TO authenticated USING (public.has_permission('settings','update'))
  WITH CHECK (public.has_permission('settings','update'));

DROP POLICY IF EXISTS "settings_insert" ON settings;
CREATE POLICY "settings_insert" ON settings FOR INSERT
  TO authenticated WITH CHECK (public.has_permission('settings','update'));

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_license_expiry ON drivers(license_expiry);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_assigned_driver ON vehicles(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON profiles(role_id);

-- ============================================================
-- SEED DEFAULT ROLES
-- ============================================================
INSERT INTO roles (name, description, permissions, is_system, status)
VALUES
  (
    'Super Admin',
    'Full access to every module including audit logs.',
    '{"dashboard":{"view":true,"create":true,"read":true,"update":true,"delete":true},"drivers":{"view":true,"create":true,"read":true,"update":true,"delete":true},"vehicles":{"view":true,"create":true,"read":true,"update":true,"delete":true},"users":{"view":true,"create":true,"read":true,"update":true,"delete":true},"roles":{"view":true,"create":true,"read":true,"update":true,"delete":true},"settings":{"view":true,"create":true,"read":true,"update":true,"delete":true},"logs":{"view":true,"create":true,"read":true,"update":true,"delete":true}}'::jsonb,
    true,
    'active'
  ),
  (
    'Admin',
    'Full CRUD on drivers and vehicles; read-only on users, roles, settings, logs.',
    '{"dashboard":{"view":true,"create":true,"read":true,"update":true,"delete":true},"drivers":{"view":true,"create":true,"read":true,"update":true,"delete":true},"vehicles":{"view":true,"create":true,"read":true,"update":true,"delete":true},"users":{"view":true,"create":false,"read":true,"update":false,"delete":false},"roles":{"view":true,"create":false,"read":true,"update":false,"delete":false},"settings":{"view":true,"create":false,"read":true,"update":false,"delete":false},"logs":{"view":true,"create":false,"read":true,"update":false,"delete":false}}'::jsonb,
    true,
    'active'
  ),
  (
    'Fleet Manager',
    'Read dashboard; create + read on drivers and vehicles.',
    '{"dashboard":{"view":true,"create":false,"read":true,"update":false,"delete":false},"drivers":{"view":true,"create":true,"read":true,"update":false,"delete":false},"vehicles":{"view":true,"create":true,"read":true,"update":false,"delete":false},"users":{"view":false,"create":false,"read":false,"update":false,"delete":false},"roles":{"view":false,"create":false,"read":false,"update":false,"delete":false},"settings":{"view":false,"create":false,"read":false,"update":false,"delete":false},"logs":{"view":false,"create":false,"read":false,"update":false,"delete":false}}'::jsonb,
    true,
    'active'
  ),
  (
    'Viewer',
    'Read-only on dashboard, drivers, vehicles, users.',
    '{"dashboard":{"view":true,"create":false,"read":true,"update":false,"delete":false},"drivers":{"view":true,"create":false,"read":true,"update":false,"delete":false},"vehicles":{"view":true,"create":false,"read":true,"update":false,"delete":false},"users":{"view":true,"create":false,"read":true,"update":false,"delete":false},"roles":{"view":false,"create":false,"read":false,"update":false,"delete":false},"settings":{"view":false,"create":false,"read":false,"update":false,"delete":false},"logs":{"view":false,"create":false,"read":false,"update":false,"delete":false}}'::jsonb,
    true,
    'active'
  )
ON CONFLICT (name) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  description = EXCLUDED.description,
  is_system = EXCLUDED.is_system,
  status = EXCLUDED.status;

-- Default organization settings
INSERT INTO settings (key, value)
VALUES
  ('organization_name', 'Fleet Operations'),
  ('notification_email', 'admin@fleet.app'),
  ('license_alert_days', '30')
ON CONFLICT (key) DO NOTHING;
