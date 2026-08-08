-- Block deletion of the "Super Admin" role and any profile with that role,
-- at the database level — the final backstop even if the edge function or
-- frontend checks are ever bypassed.

-- ---------- roles: block DELETE of the Super Admin role ----------
DROP POLICY IF EXISTS "roles_delete" ON roles;
CREATE POLICY "roles_delete" ON roles FOR DELETE
  TO authenticated USING (
    public.has_permission('roles','delete')
    AND name <> 'Super Admin'
  );

-- ---------- profiles: block DELETE of any profile whose role is Super Admin ----------
DROP POLICY IF EXISTS "profiles_delete_perm" ON profiles;
CREATE POLICY "profiles_delete_perm" ON profiles FOR DELETE
  TO authenticated USING (
    public.has_permission('users','delete')
    AND NOT EXISTS (
      SELECT 1 FROM roles r
      WHERE r.id = profiles.role_id
        AND r.name = 'Super Admin'
    )
  );
