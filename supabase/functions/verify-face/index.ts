// verify-face: compares the user's selfie with their profile photos using AWS Rekognition,
// marks the profile verified on a match, and always deletes the selfie afterwards.
// Needs the secrets AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and (optional) AWS_REGION.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { CompareFacesCommand, DetectFacesCommand, RekognitionClient } from "npm:@aws-sdk/client-rekognition@3";

const SIMILARITY = 90; // percent needed to call it the same person

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service, { auth: { persistSession: false } });

  // Who is asking (the JWT was already checked by the platform).
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: who, error: whoErr } = await admin.auth.getUser(token);
  if (whoErr || !who?.user) return json({ error: "unauthorized" }, 401);
  const uid = who.user.id;
  const selfiePath = `${uid}/selfie.jpg`;
  const removeSelfie = () => admin.storage.from("selfies").remove([selfiePath]);

  const keyId = Deno.env.get("AWS_ACCESS_KEY_ID");
  const secret = Deno.env.get("AWS_SECRET_ACCESS_KEY");
  if (!keyId || !secret) {
    await removeSelfie();
    return json({ verified: false, reason: "not_configured" });
  }
  const rek = new RekognitionClient({
    region: Deno.env.get("AWS_REGION") || "eu-central-1",
    credentials: { accessKeyId: keyId, secretAccessKey: secret },
  });

  try {
    const { data: selfieBlob, error: selfieErr } = await admin.storage.from("selfies").download(selfiePath);
    if (selfieErr || !selfieBlob) return json({ verified: false, reason: "no_selfie" });
    const selfie = new Uint8Array(await selfieBlob.arrayBuffer());

    // 1. The selfie must show exactly one clear face.
    const det = await rek.send(new DetectFacesCommand({ Image: { Bytes: selfie }, Attributes: ["ALL"] }));
    const faces = (det.FaceDetails || []).filter((f) => (f.Confidence || 0) > 95);
    if (faces.length === 0) return json({ verified: false, reason: "no_face" });
    if (faces.length > 1) return json({ verified: false, reason: "several_faces" });
    const f = faces[0];
    if (f.EyesOpen && f.EyesOpen.Value === false) return json({ verified: false, reason: "eyes_closed" });
    if (f.Sunglasses?.Value) return json({ verified: false, reason: "sunglasses" });
    if ((f.Quality?.Sharpness ?? 100) < 20) return json({ verified: false, reason: "blurry" });

    // 2. Compare with each profile photo until one matches.
    const { data: profile } = await admin.from("profiles").select("photos").eq("id", uid).maybeSingle();
    const photos: string[] = profile?.photos || [];
    if (!photos.length) return json({ verified: false, reason: "no_photos" });
    let best = 0;
    let comparable = 0;
    for (const path of photos.slice(0, 6)) {
      const { data: blob } = await admin.storage.from("photos").download(path);
      if (!blob) continue;
      try {
        const out = await rek.send(new CompareFacesCommand({
          SourceImage: { Bytes: selfie },
          TargetImage: { Bytes: new Uint8Array(await blob.arrayBuffer()) },
          SimilarityThreshold: 70,
        }));
        comparable++;
        for (const m of out.FaceMatches || []) best = Math.max(best, m.Similarity || 0);
        if (best >= SIMILARITY) break;
      } catch (e) {
        // InvalidParameterException = no face found in that photo (e.g. a masked photo): skip it.
        if ((e as Error).name !== "InvalidParameterException") throw e;
      }
    }

    let method: string | null = null;
    if (best >= SIMILARITY) method = "selfie_match";
    else if (comparable === 0) method = "selfie_only"; // every photo is masked: a real face is all we can check

    if (!method) return json({ verified: false, reason: "no_match", similarity: Math.round(best) });

    const { error: upErr } = await admin.from("profiles")
      .update({ verified: true, verified_at: new Date().toISOString(), verification_method: method })
      .eq("id", uid);
    if (upErr) throw upErr;
    return json({ verified: true, method, similarity: Math.round(best) });
  } catch (e) {
    console.error("verify-face failed", e);
    return json({ verified: false, reason: "error" });
  } finally {
    await removeSelfie();
  }
});
