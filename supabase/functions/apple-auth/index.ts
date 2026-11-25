// apple-auth: Sign in with Apple bookkeeping that Apple requires (Guideline 5.1.1(v)).
//   { action: "store", code }  after an Apple sign-in or link: swaps Apple's one-time authorization code for a
//                              refresh token and keeps it server-side (public.apple_tokens: RLS on, no policies, so only this function can read it).
//   { action: "revoke" }       before the account is deleted: revokes that token at Apple, so the app no longer
//                              shows under "Sign in with Apple" in the person's Apple ID settings.
// Needs the secrets APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY (the .p8 file's text) and optionally
// APPLE_CLIENT_ID (defaults to the bundle id com.fortunas.tonight).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { importPKCS8, SignJWT } from "npm:jose@5";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const APPLE = "https://appleid.apple.com";

/** The short-lived client secret Apple wants: a JWT signed with the Sign in with Apple key. */
async function clientSecret(clientId: string) {
  const teamId = Deno.env.get("APPLE_TEAM_ID");
  const keyId = Deno.env.get("APPLE_KEY_ID");
  const pem = Deno.env.get("APPLE_PRIVATE_KEY");
  if (!teamId || !keyId || !pem) return null;
  const key = await importPKCS8(pem.replace(/\\n/g, "\n"), "ES256");
  return await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .setExpirationTime("10m")
    .setAudience(APPLE)
    .setSubject(clientId)
    .sign(key);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service, { auth: { persistSession: false } });

  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: who, error: whoErr } = await admin.auth.getUser(jwt);
  if (whoErr || !who?.user) return json({ error: "unauthorized" }, 401);
  const uid = who.user.id;

  const { action, code } = await req.json().catch(() => ({}));
  const clientId = Deno.env.get("APPLE_CLIENT_ID") || "com.fortunas.tonight";
  const secret = await clientSecret(clientId);
  if (!secret) return json({ ok: false, reason: "not_configured" });

  if (action === "store") {
    if (!code || typeof code !== "string") return json({ error: "no_code" }, 400);
    const res = await fetch(`${APPLE}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: secret, code, grant_type: "authorization_code" }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out.refresh_token) return json({ ok: false, reason: out.error || "exchange_failed" });
    const { error } = await admin.from("apple_tokens").upsert({ user_id: uid, refresh_token: out.refresh_token, updated_at: new Date().toISOString() });
    return json({ ok: !error });
  }

  if (action === "revoke") {
    const { data: row } = await admin.from("apple_tokens").select("refresh_token").eq("user_id", uid).maybeSingle();
    if (!row?.refresh_token) return json({ ok: true, reason: "nothing_to_revoke" });
    const res = await fetch(`${APPLE}/auth/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: secret, token: row.refresh_token, token_type_hint: "refresh_token" }),
    });
    await admin.from("apple_tokens").delete().eq("user_id", uid);
    return json({ ok: res.ok });
  }

  return json({ error: "unknown_action" }, 400);
});
