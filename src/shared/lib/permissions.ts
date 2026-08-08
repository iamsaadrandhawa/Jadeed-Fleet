import type { Permissions, Domain, CrudAction, Profile } from "./types";

export function isSuperAdmin(profile: Profile | null): boolean {
  return profile?.role?.name === "Super Admin";
}

export function can(
  permissions: Permissions | null,
  domain: Domain,
  action: CrudAction
): boolean {
  if (!permissions) return false;
  return Boolean(permissions[domain]?.[action]);
}

export function canView(
  permissions: Permissions | null,
  domain: Domain
): boolean {
  return can(permissions, domain, "view");
}

export function canAny(
  permissions: Permissions | null,
  domain: Domain
): boolean {
  if (!permissions) return false;
  const d = permissions[domain];
  if (!d) return false;
  return d.view || d.create || d.read || d.update || d.delete;
}
