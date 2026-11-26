// account-email: saves an email and password on the signed-in account in one go, without a confirmation email
// (the "check your email" step was removed for now, Nov 2026). The app calls it from "Save your account" and from
// Settings › Keep your account.
//   { email, password }  →  { ok: true } | { ok: false, reason: "email" | "weak" | "taken" | "failed" }
// The caller is identified by their own session (Authorization header); only their own account is changed.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PW = 8;

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service, { auth: { persistSession: false } });

  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: who, error: whoErr } = await admin.auth.getUser(jwt);
  if (whoErr || !who?.user) return json({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!EMAIL_RE.test(email)) return json({ ok: false, reason: "email" });
  if (password.length < MIN_PW) return json({ ok: false, reason: "weak" });

  // Someone else already has this email: they should sign in with it instead. (Supabase only says "Error updating
  // user" when the update hits it, so check first; public.email_taken is callable by the service role only.)
  const { data: taken } = await admin.rpc("email_taken", { check_email: email, except_id: who.user.id });
  if (taken) return json({ ok: false, reason: "taken" });

  const { error } = await admin.auth.admin.updateUserById(who.user.id, { email, password, email_confirm: true });
  if (error) {
    if ((error as { code?: string }).code === "email_exists") return json({ ok: false, reason: "taken" });
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) return json({ ok: false, reason: "taken" });
    if (msg.includes("password")) return json({ ok: false, reason: "weak" });
    console.error("account-email update failed", error.message);
    return json({ ok: false, reason: "failed" });
  }
  return json({ ok: true });
});
