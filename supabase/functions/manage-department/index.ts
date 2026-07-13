import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_CATEGORIES = ["hostel", "academics", "transport", "infrastructure"] as const;
type Category = (typeof ALLOWED_CATEGORIES)[number];

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY")!;

function bad(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Server-side password policy — mirror of the client rule (8-72 chars with
// upper, lower, number, and special char). Never trust the client's check.
const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,72}$/;
function validPassword(p: unknown): p is string {
  return typeof p === "string" && PASSWORD_POLICY.test(p);
}
const WEAK_PASSWORD_MSG =
  "Password must be 8-72 characters with an uppercase letter, a lowercase letter, a number, and a special character (@$!%*?&)";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return bad(405, "Method not allowed");

  const auth = req.headers.get("Authorization");
  if (!auth) return bad(401, "Missing Authorization header");

  // Authenticated client (uses caller JWT) to verify admin role
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return bad(401, "Invalid session");

  const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });
  if (roleErr) return bad(500, roleErr.message);
  if (!isAdmin) return bad(403, "Admins only");

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: any;
  try { body = await req.json(); } catch { return bad(400, "Invalid JSON"); }
  const action = body?.action;

function validEmail(e: unknown): e is string {
  return typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 255;
}

  try {
    if (action === "create") {
      const { email, password, category, name, description } = body ?? {};
      if (!validEmail(email)) return bad(400, "Please provide a valid email address");
      if (!validPassword(password)) return bad(400, WEAK_PASSWORD_MSG);
      if (!ALLOWED_CATEGORIES.includes(category)) return bad(400, "Invalid department category");
      if (typeof name !== "string" || name.trim().length < 2) return bad(400, "Department name required");

      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (cErr || !created.user) {
        const msg = cErr?.message ?? "Could not create account";
        if (msg.toLowerCase().includes("already been registered")) {
          return bad(400, "This email is already in use. Please use a different email address.");
        }
        return bad(400, msg);
      }

      const newUserId = created.user.id;

      // Set role=department with department=category (replace any default 'student' from trigger)
      await admin.from("user_roles").delete().eq("user_id", newUserId);
      const { error: rErr } = await admin.from("user_roles").insert({
        user_id: newUserId, role: "department", department: category,
      });
      if (rErr) {
        await admin.auth.admin.deleteUser(newUserId);
        return bad(400, rErr.message);
      }

      const { data: dept, error: dErr } = await admin.from("departments").insert({
        category, name: name.trim(), description: description ?? null, login_email: email,
        user_id: newUserId, created_by: userData.user.id,
      }).select().single();
      if (dErr) {
        await admin.auth.admin.deleteUser(newUserId);
        return bad(400, dErr.message);
      }
      return new Response(JSON.stringify({ ok: true, department: dept }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      const { id, name, description, category } = body ?? {};
      if (typeof id !== "string") return bad(400, "Department id required");
      const patch: Record<string, unknown> = {};
      if (typeof name === "string" && name.trim().length >= 2) patch.name = name.trim();
      if (typeof description === "string" || description === null) patch.description = description;
      if (category !== undefined) {
        if (!ALLOWED_CATEGORIES.includes(category)) return bad(400, "Invalid category");
        patch.category = category;
      }
      const { data: dept, error } = await admin.from("departments").update(patch).eq("id", id).select().single();
      if (error) return bad(400, error.message);

      // keep user_roles.department in sync if category changed
      if (patch.category) {
        await admin.from("user_roles").update({ department: patch.category })
          .eq("user_id", dept.user_id).eq("role", "department");
      }
      return new Response(JSON.stringify({ ok: true, department: dept }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reset_password") {
      const { id, password } = body ?? {};
      if (typeof id !== "string") return bad(400, "Department id required");
      if (!validPassword(password)) return bad(400, WEAK_PASSWORD_MSG);
      const { data: dept, error } = await admin.from("departments").select("user_id").eq("id", id).single();
      if (error || !dept) return bad(404, "Department not found");
      const { error: uErr } = await admin.auth.admin.updateUserById(dept.user_id, { password });
      if (uErr) return bad(400, uErr.message);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { id } = body ?? {};
      if (typeof id !== "string") return bad(400, "Department id required");
      const { data: dept, error } = await admin.from("departments").select("user_id").eq("id", id).single();
      if (error || !dept) return bad(404, "Department not found");
      await admin.from("departments").delete().eq("id", id);
      await admin.auth.admin.deleteUser(dept.user_id);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_resettable_users") {
      // Admin-only: list students and admins (NOT department users) so the admin
      // can manually reset their password.
      const { data: roles, error: rErr } = await admin
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["student", "admin"]);
      if (rErr) return bad(500, rErr.message);
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) {
        return new Response(JSON.stringify({ users: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: profiles, error: pErr } = await admin
        .from("profiles")
        .select("id, name, email")
        .in("id", ids);
      if (pErr) return bad(500, pErr.message);
      const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
      const users = (profiles ?? [])
        .map((p) => ({ id: p.id, name: p.name, email: p.email, role: roleMap.get(p.id) }))
        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
      return new Response(JSON.stringify({ users }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "admin_reset_user_password") {
      // Admin-only manual password reset for student/admin accounts (not departments).
      const { user_id, password } = body ?? {};
      if (typeof user_id !== "string") return bad(400, "user_id required");
      if (!validPassword(password)) return bad(400, WEAK_PASSWORD_MSG);
      // Make sure target is a student or admin (block resetting department accounts here)
      const { data: targetRoles, error: trErr } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", user_id);
      if (trErr) return bad(500, trErr.message);
      const roles = (targetRoles ?? []).map((r) => r.role);
      if (roles.length === 0) return bad(404, "User not found");
      if (roles.includes("department")) {
        return bad(400, "Use the department reset action for department accounts");
      }
      const { error: uErr } = await admin.auth.admin.updateUserById(user_id, { password });
      if (uErr) return bad(400, uErr.message);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return bad(400, "Unknown action");
  } catch (e) {
    return bad(500, (e as Error).message);
  }
});
