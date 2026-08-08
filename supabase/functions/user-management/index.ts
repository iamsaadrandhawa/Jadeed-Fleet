import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface UserPayload {
  email: string;
  password?: string;
  full_name?: string;
  phone?: string;
  role_id?: string;
  status?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Caller auth: verify the JWT and load their profile + role permissions
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: callerData, error: callerErr } =
      await supabase.auth.getUser(token);
    if (callerErr || !callerData.user) {
      return json({ error: "Unauthorized" }, 401);
    }
    const callerId = callerData.user.id;

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role_id, roles(id, name, permissions)")
      .eq("id", callerId)
      .maybeSingle();

    const callerRole = callerProfile?.roles as unknown as { id: string; name: string; permissions: Record<string, Record<string, boolean>> } | null;
    const perms = callerRole?.permissions ?? null;
    const can = (domain: string, action: string) =>
      Boolean(perms?.[domain]?.[action]);
    const callerIsSuperAdmin = callerRole?.name === "Super Admin";

    const url = new URL(req.url);
    const segments = url.pathname.split("/").filter(Boolean);
    // /user-management/{action} or /user-management/{id}
    const op = segments[1] ?? "";

    // ---------- LIST users ----------
    if (req.method === "GET" && (op === "" || op === "list")) {
      if (!can("users", "read")) return json({ error: "Forbidden" }, 403);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone, status, role_id, created_at, roles(id, name)")
        .order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);

      const emails = await supabase.auth.admin.listUsers();
      const emailMap = new Map<string, string>();
      for (const u of emails.data.users ?? []) {
        emailMap.set(u.id, u.email ?? "");
      }
      const rows = (data ?? []).map((p: Record<string, unknown>) => ({
        ...p,
        email: emailMap.get(p.id as string) ?? "",
      }));
      return json({ users: rows });
    }

    // ---------- CREATE user ----------
    if (req.method === "POST" && (op === "" || op === "create")) {
      if (!callerIsSuperAdmin) return json({ error: "Forbidden: Super Admin only" }, 403);
      const body = (await req.json()) as UserPayload;
      if (!body.email || !body.password)
        return json({ error: "Email and password are required" }, 400);

      const { data: newUser, error: createErr } =
        await supabase.auth.admin.createUser({
          email: body.email,
          password: body.password,
          email_confirm: true,
          user_metadata: { full_name: body.full_name ?? "" },
        });
      if (createErr || !newUser.user)
        return json({ error: createErr?.message ?? "Failed to create user" }, 500);

      const { error: profileErr } = await supabase
        .from("profiles")
        .upsert(
          {
            id: newUser.user.id,
            full_name: body.full_name,
            phone: body.phone,
            role_id: body.role_id,
            status: body.status ?? "active",
          },
          { onConflict: "id" }
        );
      if (profileErr) return json({ error: profileErr.message }, 500);

      await logAction(supabase, callerId, callerData.user.email ?? "", "create", "user", newUser.user.id, `Created user ${body.email}`);
      return json({ id: newUser.user.id });
    }

    // ---------- UPDATE user ----------
    if (req.method === "PUT" && op !== "") {
      if (!callerIsSuperAdmin) return json({ error: "Forbidden: Super Admin only" }, 403);
      const userId = op;
      const body = (await req.json()) as Partial<UserPayload>;
      const update: Record<string, unknown> = {};
      if (body.full_name !== undefined) update.full_name = body.full_name;
      if (body.phone !== undefined) update.phone = body.phone;
      if (body.role_id !== undefined) update.role_id = body.role_id;
      if (body.status !== undefined) update.status = body.status;

      const { error: profileErr } = await supabase
        .from("profiles")
        .update(update)
        .eq("id", userId);
      if (profileErr) return json({ error: profileErr.message }, 500);

      if (body.password) {
        const { error: pwErr } = await supabase.auth.admin.updateUserById(userId, {
          password: body.password,
        });
        if (pwErr) return json({ error: pwErr.message }, 500);
      }

      await logAction(supabase, callerId, callerData.user.email ?? "", "update", "user", userId, `Updated user ${userId}`);
      return json({ ok: true });
    }

    // ---------- DELETE user ----------
    if (req.method === "DELETE" && op !== "") {
      if (!callerIsSuperAdmin) return json({ error: "Forbidden: Super Admin only" }, 403);
      const userId = op;

      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("role_id, roles(name)")
        .eq("id", userId)
        .maybeSingle();
      const targetRoleName = (targetProfile?.roles as unknown as { name: string } | null)?.name;
      if (targetRoleName === "Super Admin") {
        return json({ error: "Super Admin accounts can only be removed directly from the database" }, 403);
      }

      const { error: delErr } = await supabase.auth.admin.deleteUser(userId);
      if (delErr) return json({ error: delErr.message }, 500);
      // profile row cascades via FK
      await logAction(supabase, callerId, callerData.user.email ?? "", "delete", "user", userId, `Deleted user ${userId}`);
      return json({ ok: true });
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }

  function json(payload: unknown, status = 200) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  async function logAction(
    sb: ReturnType<typeof createClient>,
    uid: string,
    email: string,
    action: string,
    entity: string,
    entityId: string,
    description: string
  ) {
    await sb.from("audit_logs").insert({
      user_id: uid,
      user_email: email,
      action,
      entity,
      entity_id: entityId,
      description,
    });
  }
});
