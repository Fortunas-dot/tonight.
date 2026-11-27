// demo-console: the testing dashboard (fortunas.nl/tonight/admin, source docs/tonight-admin.html) talks to this.
// - Chats: every match with an AI demo profile, and chatting as that profile.
// - Swipe: pick an AI profile, see its deck and who liked it, and like people as it.
// - Users: every account, newest first (read only).
// It never acts as a real member: every like and message is sent as a demo person.
// - Draft: Claude writes the AI profile's next chat message for you to edit and send (needs ANTHROPIC_API_KEY).
// Needs the secret DEMO_CONSOLE_KEY (the dashboard password). Deployed with --no-verify-jwt, since the page has
// no member sign-in; the password is checked here instead.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-console-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// Same-time compare so the password can't be guessed one character at a time.
function sameKey(a: string, b: string) {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

type Row = { photos?: string[] | null };

// Texting habits, one picked from each list per chat, so every chat types differently.
const STYLES = [
  ["writes everything in lowercase, never uses capitals", "mostly lowercase, capitalises now and then", "uses normal capitals"],
  ["never ends a message with a full stop", "trails off with '...' a lot", "uses '!' when excited and otherwise no full stops", "barely any punctuation at all, no commas"],
  ["laughs with 'haha'", "laughs with 'hahaha'", "laughs with 'lol'", "laughs with 'hihi'", "laughs with a 😂 instead of typing it"],
  ["never uses emoji", "sometimes adds a 😏", "sometimes adds 🙈 or 😅", "now and then a 😉", "uses :) and :p instead of emoji"],
  ["very short replies, often only 2 to 6 words", "one short line per message", "sometimes two short sentences in one message"],
  ["types fast and drops words ('ok sounds good where u thinking')", "uses abbreviations like u, rn, ngl, tbh, idk", "stretches words for effect (heyy, sooo, nicee)", "a bit dry and teasing, likes to banter", "warm and easygoing, says what she or he thinks directly", "leaves the odd small typo in"],
];
function typingStyle(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return STYLES.map((opts, i) => opts[(h >>> (i * 3)) % opts.length]);
}

// Any crash still answers with CORS headers and the reason, so the page shows it instead of "Failed to fetch".
Deno.serve(async (req) => {
  try {
    return await handle(req);
  } catch (err) {
    console.error(err);
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const key = Deno.env.get("DEMO_CONSOLE_KEY");
  if (!key) return json({ error: "not_configured" }, 503);
  if (!sameKey(req.headers.get("x-console-key") || "", key)) {
    await new Promise((r) => setTimeout(r, 800)); // slows down guessing
    return json({ error: "wrong_password" }, 401);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const reqBody = await req.json().catch(() => ({}));
  const { action, matchId, body, demoId, targetId } = reqBody;

  const { data: demos, error: demoErr } = await admin.from("profiles").select("id, name, photos").eq("is_demo", true);
  if (demoErr) return json({ error: demoErr.message }, 500);
  const demoIds = new Set((demos || []).map((d) => d.id));
  const ids = [...demoIds];
  const inDemos = (col: string) => `${col}.in.(${ids.join(",")})`;

  // Signed URLs (an hour) for each row's first `max` photos, keyed by storage path.
  async function sign(rows: Row[], max: number): Promise<Record<string, string>> {
    const paths = rows.flatMap((r) => (r.photos || []).slice(0, max));
    if (!paths.length) return {};
    const { data } = await admin.storage.from("photos").createSignedUrls(paths, 3600);
    return Object.fromEntries((data || []).filter((s) => s.signedUrl).map((s) => [s.path, s.signedUrl]));
  }
  const photosOf = (r: Row, url: Record<string, string>, max = 6) =>
    (r.photos || []).slice(0, max).map((p) => url[p]).filter(Boolean);

  // Who's around: the app's minute ping (exact), else the last sign of activity (sign-in refresh, message, like,
  // opening or typing in a chat). Online = pinged in the last 2 minutes, or active in the last 5.
  async function activity() {
    const { data } = await admin.rpc("console_activity");
    const by = Object.fromEntries((data || []).map((r: { user_id: string; pinged_at: string | null; active_at: string | null }) => [r.user_id, r]));
    const now = Date.now();
    return (id: string) => {
      const r = by[id];
      if (!r) return { online: false, lastActive: null as string | null };
      const ping = r.pinged_at ? new Date(r.pinged_at).getTime() : 0;
      const act = r.active_at ? new Date(r.active_at).getTime() : 0;
      return { online: now - ping < 2 * 60000 || now - act < 5 * 60000, lastActive: new Date(Math.max(ping, act)).toISOString() };
    };
  }

  // The match, and which side is the demo person; null when no demo person is in it.
  async function demoMatch(id: string) {
    if (!id) return null;
    const { data: m } = await admin.from("matches").select("*").eq("id", id).maybeSingle();
    if (!m) return null;
    const demo = demoIds.has(m.user_a) ? m.user_a : demoIds.has(m.user_b) ? m.user_b : null;
    return demo ? { ...m, demo, member: demo === m.user_a ? m.user_b : m.user_a } : null;
  }

  /* ---------- Chats ---------- */

  if (action === "list") {
    if (!ids.length) return json({ matches: [] });
    const { data: ms, error } = await admin
      .from("matches").select("*").or(`${inDemos("user_a")},${inDemos("user_b")}`).order("created_at", { ascending: false });
    if (error) return json({ error: error.message }, 500);
    const matchIds = (ms || []).map((m) => m.id);
    const memberIds = (ms || []).map((m) => (demoIds.has(m.user_a) ? m.user_b : m.user_a));
    const [{ data: people }, { data: msgs }, { data: states }, seen] = await Promise.all([
      admin.from("profiles").select("id, name, alias, age, city, photos").in("id", [...ids, ...memberIds]),
      matchIds.length
        ? admin.from("messages").select("match_id, sender, body, created_at").in("match_id", matchIds).order("created_at")
        : Promise.resolve({ data: [] }),
      matchIds.length ? admin.from("match_state").select("*").in("match_id", matchIds) : Promise.resolve({ data: [] }),
      activity(),
    ]);
    const url = await sign(people || [], 1);
    const person = (id: string) => {
      const p = (people || []).find((x) => x.id === id);
      return p ? { id, name: p.name, alias: p.alias, age: p.age, city: p.city, photo: photosOf(p, url, 1)[0] || null, ...seen(id) } : { id, name: "(deleted)" };
    };
    return json({
      matches: (ms || []).map((m) => {
        const demo = demoIds.has(m.user_a) ? m.user_a : m.user_b;
        const member = demo === m.user_a ? m.user_b : m.user_a;
        const own = (msgs || []).filter((x) => x.match_id === m.id);
        const last = own.at(-1);
        const demoRead = (states || []).find((s) => s.match_id === m.id && s.user_id === demo)?.read_at;
        return {
          id: m.id,
          matchedAt: m.created_at,
          demo: person(demo),
          member: person(member),
          memberIsDemo: demoIds.has(member),
          last: last ? { text: last.body, at: last.created_at, fromDemo: last.sender === demo } : null,
          unread: own.filter((x) => x.sender === member && (!demoRead || x.created_at > demoRead)).length,
        };
      }),
    });
  }

  if (action === "messages") {
    const m = await demoMatch(matchId);
    if (!m) return json({ error: "not_a_demo_match" }, 404);
    const [{ data: msgs, error }, { data: states }] = await Promise.all([
      admin.from("messages").select("id, sender, body, created_at").eq("match_id", m.id).order("created_at"),
      admin.from("match_state").select("*").eq("match_id", m.id),
    ]);
    if (error) return json({ error: error.message }, 500);
    // Opening the chat here counts as the demo person reading it, so the member sees "Read".
    await admin.from("match_state").upsert({ match_id: m.id, user_id: m.demo, read_at: new Date().toISOString() });
    const theirs = (states || []).find((s) => s.user_id === m.member);
    return json({
      messages: (msgs || []).map((x) => ({ id: x.id, fromDemo: x.sender === m.demo, text: x.body, at: x.created_at })),
      memberRead: theirs?.read_at || null,
      memberTyping: theirs?.typing_at || null,
    });
  }

  if (action === "send") {
    const text = typeof body === "string" ? body.trim() : "";
    if (!text || text.length > 2000) return json({ error: "empty_or_too_long" }, 400);
    const m = await demoMatch(matchId);
    if (!m) return json({ error: "not_a_demo_match" }, 404);
    const { data, error } = await admin.from("messages").insert({ match_id: m.id, sender: m.demo, body: text }).select("id").single();
    if (error) return json({ error: error.message }, 500);
    return json({ id: data.id });
  }

  // Drafts the AI profile's next message with Claude. Nothing is sent: the dashboard puts it in the box to edit.
  if (action === "draft") {
    // Keys are plain ASCII; pasting a long key can bring invisible characters along (zero-width spaces, soft hyphens), so drop them.
    const apiKey = (Deno.env.get("ANTHROPIC_API_KEY") || "").replace(/[^!-~]/g, "");
    if (!apiKey) return json({ error: "ANTHROPIC_API_KEY is not set in Supabase secrets" }, 503);
    // A key pasted with a stray character (an ellipsis, a smart quote) can't go in a request header.
    if (!/^[!-~]+$/.test(apiKey)) return json({ error: `The saved ANTHROPIC_API_KEY has invalid characters (${apiKey.length} chars, starts ${apiKey.slice(0, 8)}). Set it again.` }, 503);
    const m = await demoMatch(matchId);
    if (!m) return json({ error: "not_a_demo_match" }, 404);
    const cols = "name, age, gender, city, country, bio, prompt, intents, turn_ons, boundaries, details, prompts";
    const [{ data: me }, { data: them }, { data: msgs }, { data: plan }] = await Promise.all([
      admin.from("profiles").select(cols).eq("id", m.demo).single(),
      admin.from("profiles").select(cols).eq("id", m.member).single(),
      admin.from("messages").select("sender, body, created_at").eq("match_id", m.id).order("created_at", { ascending: false }).limit(200),
      admin.from("plans").select("place, at_time").eq("match_id", m.id).maybeSingle(),
    ]);
    const card = (p: Record<string, unknown> | null) => p ? JSON.stringify(Object.fromEntries(Object.entries(p).filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && !v.length)))) : "{}";
    // The whole chat with times, so the draft builds on what was said and notices gaps.
    const when = (t: string | Date, long = false) => new Date(t).toLocaleString("en-GB", long
      ? { timeZone: "Europe/Amsterdam", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }
      : { timeZone: "Europe/Amsterdam", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const history = (msgs || []).reverse()
      .map((x) => `[${when(x.created_at)}] ${x.sender === m.demo ? me?.name : them?.name || "Match"}: ${x.body}`).join("\n");
    const hint = typeof body === "string" ? body.trim().slice(0, 500) : "";

    // Each chat gets its own texting style, picked from the match id so it stays the same on every draft in that chat.
    const style = typingStyle(m.id);
    const system = `You are ${me?.name}, texting a match on Tonight, a dating/hookup app like Tinder for meeting up tonight or this week (everyone is 18+). ` +
      `Write the next message ${me?.name} sends. It must read like a real person thumbing a quick text on their phone, not like an assistant.\n\n` +
      `How ${me?.name} texts in this chat (keep to it every time):\n- ${style.join("\n- ")}\n\n` +
      `How real people text on dating apps:\n` +
      `- Short. Usually 2 to 12 words, rarely more than one line. Answer what they said, don't write a paragraph.\n` +
      `- Casual and a bit flirty or teasing where it fits. Confident, not eager. Not every message needs a question.\n` +
      `- Imperfect is fine: missing words, no full stop at the end, lowercase, "haha" etc. as the style says.\n` +
      `- Never sound polite-corporate or like customer service. Don't use phrases like "No worries at all", "Thanks for letting me know", "Hope everything's okay", "That sounds lovely", "I'd love to", "Absolutely". ` +
      `No em dashes, no semicolons, no summarising what they said back to them.\n` +
      `- Use the profiles lightly, the way someone glances at a profile: one detail at most, only when it fits.\n` +
      `- Push gently toward meeting (a drink, a place, a time) when the vibe is there, but don't force it, and accept a no or a cancel easily.\n` +
      `- Suggestive at most, never explicit. Never say or hint you are an AI.\n` +
      `- Write in the language the other person uses. If they write Dutch, text like a Dutch person in their twenties or thirties would (e.g. "haha", "zin in", "kan ook", "is goed", "hoezo").\n` +
      `- If ${me?.name} already sent messages in this chat, match how those were written.\n` +
      `- Keep track of the whole chat: remember what was said (names, plans, places, times, things they told about themselves) and build on it. ` +
      `Never ask something that was already answered, never repeat an earlier line, never contradict what ${me?.name} said before. ` +
      `Notice time gaps: a reply hours or days later reads differently.\n\n` +
      `Output only the message itself: no name, no quotes, no explanation.`;
    const user = `${me?.name}'s profile: ${card(me)}\n\n${them?.name || "The match"}'s profile: ${card(them)}\n\n` +
      (plan ? `Current plan between them: ${plan.place} at ${plan.at_time}\n\n` : "") +
      `It is now ${when(new Date(), true)} (Amsterdam time).\n\n` +
      (history ? `The whole chat so far (oldest first):\n${history}` : `They just matched; nobody has written yet. Write ${me?.name}'s opening message. ` +
        `Skip a plain "hey" or "hey <city>": open with something specific and playful, like a teasing take on one thing in their profile or a cheeky question.`) +
      (hint ? `\n\nDirection from the person running this profile: ${hint}` : "");

    const claude = new Anthropic({ apiKey });
    let out;
    try {
      // Low effort: a short chat line doesn't need deep thinking, and it keeps the button quick.
      // fallbacks "default": if a safety check declines, the API retries on a suitable model in the same call.
      out = await claude.beta.messages.create({
        model: "claude-opus-5-5",
        max_tokens: 2000,
        output_config: { effort: "low" },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system,
        messages: [{ role: "user", content: user }],
      } as never);
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) return json({ error: "The Anthropic API key was refused" }, 502);
      if (err instanceof Anthropic.RateLimitError) return json({ error: "Claude is busy, try again in a moment" }, 429);
      if (err instanceof Anthropic.APIError) return json({ error: `Claude API ${err.status}: ${err.message}` }, 502);
      return json({ error: `Claude call failed: ${(err as Error)?.message || err}` }, 502);
    }
    if (out.stop_reason === "refusal") return json({ error: "Claude declined to write this one. Try a different direction." }, 422);
    const text = out.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("").trim();
    if (!text) return json({ error: "Claude returned no text" }, 502);
    return json({ text });
  }

  if (action === "typing") {
    const m = await demoMatch(matchId);
    if (!m) return json({ error: "not_a_demo_match" }, 404);
    await admin.from("match_state").upsert({ match_id: m.id, user_id: m.demo, typing_at: new Date().toISOString() });
    return json({ ok: true });
  }

  /* ---------- Swipe ---------- */

  // The AI profiles to pick from, with how many liked them, they liked and they matched.
  if (action === "demos") {
    if (!ids.length) return json({ demos: [] });
    const [{ data: likes }, { data: ms }] = await Promise.all([
      admin.from("likes").select("liker, likee").or(`${inDemos("liker")},${inDemos("likee")}`),
      admin.from("matches").select("user_a, user_b").or(`${inDemos("user_a")},${inDemos("user_b")}`),
    ]);
    const url = await sign(demos || [], 1);
    return json({
      demos: (demos || []).map((d) => ({
        id: d.id, name: d.name, photo: photosOf(d, url, 1)[0] || null,
        likedBy: (likes || []).filter((l) => l.likee === d.id && !demoIds.has(l.liker)).length,
        liked: (likes || []).filter((l) => l.liker === d.id && !demoIds.has(l.likee)).length,
        matches: (ms || []).filter((m) => m.user_a === d.id || m.user_b === d.id).length,
      })).sort((a, b) => a.name.localeCompare(b.name)),
    });
  }

  // Swipe needs a real AI profile from here on.
  if (["deck", "likedBy", "like"].includes(action) && !demoIds.has(demoId)) return json({ error: "not_a_demo_profile" }, 404);

  // Real members this AI profile hasn't liked yet, with no block either way. Newest first.
  if (action === "deck") {
    const [{ data: people, error }, { data: liked }, { data: blocks }] = await Promise.all([
      admin.from("profiles")
        .select("id, name, age, gender, city, country, bio, prompt, intents, turn_ons, details, prompts, photos, verified, review_status, created_at")
        .eq("is_demo", false).eq("onboarded", true).eq("paused", false).order("created_at", { ascending: false }),
      admin.from("likes").select("likee").eq("liker", demoId),
      admin.from("blocks").select("blocker, blocked").or(`blocker.eq.${demoId},blocked.eq.${demoId}`),
    ]);
    if (error) return json({ error: error.message }, 500);
    const skip = new Set([...(liked || []).map((l) => l.likee), ...(blocks || []).flatMap((b) => [b.blocker, b.blocked])]);
    const rows = (people || []).filter((p) => !skip.has(p.id) && (p.photos || []).length);
    const url = await sign(rows, 6);
    return json({ deck: rows.map(({ photos, ...p }) => ({ ...p, photos: photosOf({ photos }, url) })) });
  }

  // Who liked this AI profile (and who it liked), newest first, with whether it is a match.
  if (action === "likedBy") {
    const [{ data: likes, error }, { data: ms }] = await Promise.all([
      admin.from("likes").select("liker, likee, created_at").or(`liker.eq.${demoId},likee.eq.${demoId}`).order("created_at", { ascending: false }),
      admin.from("matches").select("id, user_a, user_b").or(`user_a.eq.${demoId},user_b.eq.${demoId}`),
    ]);
    if (error) return json({ error: error.message }, 500);
    const others = [...new Set((likes || []).map((l) => (l.liker === demoId ? l.likee : l.liker)))];
    const { data: people } = others.length
      ? await admin.from("profiles").select("id, name, age, city, photos, is_demo").in("id", others)
      : { data: [] };
    const url = await sign(people || [], 1);
    const person = (id: string) => {
      const p = (people || []).find((x) => x.id === id);
      return p ? { id, name: p.name, age: p.age, city: p.city, isDemo: !!p.is_demo, photo: photosOf(p, url, 1)[0] || null } : { id, name: "(deleted)" };
    };
    const matchWith = (id: string) => (ms || []).find((m) => m.user_a === id || m.user_b === id)?.id || null;
    const list = (dir: "in" | "out") => (likes || [])
      .filter((l) => (dir === "in" ? l.likee === demoId : l.liker === demoId))
      .map((l) => { const other = dir === "in" ? l.liker : l.likee; return { person: person(other), at: l.created_at, matchId: matchWith(other) }; });
    return json({ likedBy: list("in"), liked: list("out") });
  }

  // Like someone as the AI profile. If they already liked it, the database makes the match.
  if (action === "like") {
    if (!targetId || demoIds.has(targetId)) return json({ error: "not_a_member" }, 400);
    const { error } = await admin.from("likes").insert({ liker: demoId, likee: targetId });
    if (error && error.code !== "23505") return json({ error: error.message }, 500);
    const [a, b] = demoId < targetId ? [demoId, targetId] : [targetId, demoId];
    const { data: m } = await admin.from("matches").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
    return json({ matchId: m?.id || null });
  }

  /* ---------- Profile ---------- */

  // One person's full profile for the dashboard's profile view (any account, AI or real), read only.
  if (action === "profile") {
    if (!targetId) return json({ error: "missing_id" }, 400);
    const [{ data: p, error }, auth, seen, { count: likedBy }, { count: liked }, { count: matches }] = await Promise.all([
      admin.from("profiles")
        .select("id, name, alias, age, gender, city, country, bio, prompt, intents, turn_ons, boundaries, details, prompts, photos, is_demo, verified, onboarded, paused, review_status, created_at")
        .eq("id", targetId).maybeSingle(),
      admin.auth.admin.getUserById(targetId),
      activity(),
      admin.from("likes").select("liker", { count: "exact", head: true }).eq("likee", targetId),
      admin.from("likes").select("likee", { count: "exact", head: true }).eq("liker", targetId),
      admin.from("matches").select("id", { count: "exact", head: true }).or(`user_a.eq.${targetId},user_b.eq.${targetId}`),
    ]);
    if (error) return json({ error: error.message }, 500);
    const a = auth.data?.user;
    if (!p && !a) return json({ error: "not_found" }, 404);
    const url = p ? await sign([p], 9) : {};
    const s = seen(targetId);
    return json({
      profile: {
        ...(p || { id: targetId }),
        photos: p ? photosOf(p, url, 9) : [],
        isDemo: !!p?.is_demo,
        login: a ? (a.is_anonymous ? "anonymous" : a.app_metadata?.provider || "email") : null,
        email: a?.email || null,
        joined: a?.created_at || p?.created_at || null,
        lastSeen: s.lastActive || a?.last_sign_in_at || null,
        online: s.online,
        likedBy: likedBy || 0, liked: liked || 0, matches: matches || 0,
      },
    });
  }

  /* ---------- Users ---------- */

  // Every account, newest first, with how they signed in and when they were last around.
  if (action === "users") {
    const [{ data: profiles, error }, auth, seen] = await Promise.all([
      admin.from("profiles").select("id, name, alias, age, gender, city, country, photos, is_demo, verified, onboarded, paused, review_status, created_at"),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      activity(),
    ]);
    if (error) return json({ error: error.message }, 500);
    const authUsers = auth.data?.users || [];
    const authBy = Object.fromEntries(authUsers.map((u) => [u.id, u]));
    const url = await sign(profiles || [], 1);
    const loginOf = (a?: { is_anonymous?: boolean; app_metadata?: { provider?: string } }) =>
      a ? (a.is_anonymous ? "anonymous" : a.app_metadata?.provider || "email") : null;
    const users = (profiles || []).map((p) => {
      const a = authBy[p.id];
      return {
        id: p.id, name: p.name, alias: p.alias, age: p.age, gender: p.gender, city: p.city, country: p.country,
        photo: photosOf(p, url, 1)[0] || null, photos: (p.photos || []).length,
        isDemo: !!p.is_demo, verified: !!p.verified, onboarded: !!p.onboarded, paused: !!p.paused, review: p.review_status,
        joined: a?.created_at || p.created_at, lastSeen: seen(p.id).lastActive || a?.last_sign_in_at || null,
        online: seen(p.id).online, login: loginOf(a), email: a?.email || null,
      };
    });
    // Accounts that never got a profile row (gave up before the first step).
    const have = new Set(users.map((u) => u.id));
    for (const a of authUsers) {
      if (have.has(a.id)) continue;
      users.push({
        id: a.id, name: null, alias: null, age: null, gender: null, city: null, country: null, photo: null, photos: 0,
        isDemo: false, verified: false, onboarded: false, paused: false, review: null,
        joined: a.created_at, lastSeen: seen(a.id).lastActive || a.last_sign_in_at || null, online: seen(a.id).online,
        login: loginOf(a), email: a.email || null,
      });
    }
    users.sort((x, y) => new Date(y.joined).getTime() - new Date(x.joined).getTime());
    // Minutes in the app and app opens over the last 7 days (counted from the app's minute ping).
    const { data: week } = await admin.rpc("console_week_minutes");
    const weekBy = Object.fromEntries((week || []).map((w: { user_id: string; minutes: number; opens: number }) => [w.user_id, w]));
    return json({ users: users.map((u) => ({ ...u, weekMinutes: Number(weekBy[u.id]?.minutes || 0), weekOpens: Number(weekBy[u.id]?.opens || 0) })) });
  }

  // One member's activity: minutes and opens per day (14 days), totals, and a timeline of what they did.
  if (action === "activity") {
    if (!targetId) return json({ error: "no member" }, 400);
    const { data, error } = await admin.rpc("console_user_activity", { member: targetId });
    if (error) return json({ error: error.message }, 500);
    return json({ activity: data });
  }

  /* ---------- Overview ---------- */

  // Today's numbers and the last 14 days of sign-ups (real members only; see console_stats in the migrations).
  if (action === "stats") {
    const { data, error } = await admin.rpc("console_stats");
    if (error) return json({ error: error.message }, 500);
    return json({ stats: data });
  }

  /* ---------- Moderation ---------- */
  // Decisions go through the app's own moderator functions (console_decide / console_resolve), so they are
  // logged and pushed to the member exactly as when a moderator decides in the app.

  // Profiles waiting for review, oldest first, with all their photos.
  if (action === "reviews") {
    const { data, error } = await admin.from("profiles")
      .select("id, name, age, gender, city, country, bio, prompt, intents, turn_ons, details, prompts, photos, verified, review_status, reapplied, applied_at, created_at")
      .eq("is_demo", false).eq("onboarded", true).eq("review_status", "pending").order("applied_at", { ascending: true, nullsFirst: true });
    if (error) return json({ error: error.message }, 500);
    const url = await sign(data || [], 6);
    return json({ reviews: (data || []).map(({ photos, ...p }) => ({ ...p, photos: photosOf({ photos }, url) })) });
  }

  if (action === "decide") {
    const { decision, note } = reqBody;
    if (!["approved", "rejected"].includes(decision)) return json({ error: "decision must be approved or rejected" }, 400);
    const { error } = await admin.rpc("console_decide", { applicant: targetId, decision, note: note || null });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  // Reports (open ones, or all with closed=true), as the app's moderation queue shows them.
  if (action === "reports") {
    const { closed } = reqBody;
    const { data, error } = await admin.rpc("console_queue", { include_closed: !!closed });
    if (error) return json({ error: error.message }, 500);
    const list = (data || []) as Record<string, unknown>[];
    const paths = list.map((r) => r.target_photo as string).filter(Boolean);
    const url = await sign([{ photos: paths }], paths.length);
    return json({ reports: list.map((r) => ({ ...r, photo: r.target_photo ? url[r.target_photo as string] || null : null })) });
  }

  if (action === "resolve") {
    const { reportId, resolution, note } = reqBody;
    if (!["dismiss", "remove_post", "ban"].includes(resolution)) return json({ error: "unknown resolution" }, 400);
    const { error } = await admin.rpc("console_resolve", { report_id: reportId, action: resolution, note: note || null });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  // Support conversations, newest first, with whether the member is waiting on an answer.
  if (action === "support") {
    const { data, error } = await admin.from("support_messages").select("id, user_id, from_team, body, created_at").order("created_at");
    if (error) return json({ error: error.message }, 500);
    const userIds = [...new Set((data || []).map((s) => s.user_id))];
    const { data: people } = userIds.length
      ? await admin.from("profiles").select("id, name, alias, age, city, photos").in("id", userIds)
      : { data: [] };
    const url = await sign(people || [], 1);
    const threads = userIds.map((id) => {
      const msgs = (data || []).filter((s) => s.user_id === id);
      const p = (people || []).find((x) => x.id === id);
      const last = msgs.at(-1)!;
      return {
        userId: id, name: p?.name || null, alias: p?.alias || null, age: p?.age || null, city: p?.city || null,
        photo: p ? photosOf(p, url, 1)[0] || null : null,
        waiting: !last.from_team, lastAt: last.created_at,
        messages: msgs.map((s) => ({ id: s.id, fromTeam: s.from_team, text: s.body, at: s.created_at })),
      };
    }).sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
    return json({ threads });
  }

  // Reply as "Tonight support"; the database pushes it to the member.
  if (action === "supportReply") {
    const text = typeof body === "string" ? body.trim() : "";
    if (!text || text.length > 2000) return json({ error: "empty_or_too_long" }, 400);
    if (!targetId) return json({ error: "no member" }, 400);
    const { error } = await admin.from("support_messages").insert({ user_id: targetId, from_team: true, body: text });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  return json({ error: "unknown_action" }, 400);
}
