# Tonight (working name) — research & UX spec

Adult (18+) casual-sex matching app. Design canvas: https://claude.ai/artifact/XiP5JEEiSeDcWL4v5Krkdf
Design source copy: `design-src/` (Claude Design `.dc.html` artboards + `canvas.json`).

## 1. What users hate about today's apps (research, Nov 2026)

| Pain | Evidence | Our answer |
| --- | --- | --- |
| Bots, fakes, catfish | Top theme in 2026 Feeld & Pure Trustpilot/App Store reviews | Live selfie check is required to use the app (ID fallback); re-checked when the main photo changes |
| Unsolicited explicit content | Pew: 56% of women under 50 on apps got unsolicited explicit messages/pics | Every photo arrives blurred; explicit media unlocks only on mutual opt-in; explicit first messages filtered |
| Women flooded, men ignored | ~65–78% male user bases; women describe filtering “weirdos” | Boundary-fit matching cuts noise; “like with a note” only from verified users; requests separated from chats |
| Mismatched intent | Common complaint across Feeld/Tinder coverage | Intent + Yes/Maybe/No boundaries set at onboarding; No’s are private filters; fit shown before liking |
| Chatting that never becomes a meet; ghosting | Pure built its 24h timer for this; only ~19% of chats exchange numbers | 48h match window kept open by making a plan; plan cards in chat; “Go live tonight” availability windows |
| Flakes / no-shows | Reviews: “matches but no follow-through” | “Running late” / “Cancel kindly” buttons; private post-meet check-in builds a “Shows up %” signal |
| Swipe fatigue | Forbes Health 2024: 78% feel dating-app fatigue | Short curated deck, ranked by fit + who is live now |
| Paywalled matches, surprise billing | Coaches/users report good matches hidden behind paywalls; Pure billing complaints | “Who likes you” and all safety tools free; Plus sells convenience only; renewal reminder; cancel in 2 taps |
| Location leaks | Trilateration attacks on Grindr, Bumble, Hinge | Location snapped to a 1 km grid on-device; distance shown as rounded bands; “area only” / hidden options |
| Being outed | Discretion is core for this category | Disguised app icon, quiet notifications, Face ID lock, flip-to-hide, hide from contacts (hashed locally) |
| Safety meeting strangers | Women 3.6× more likely to want consent/safety info (Swinburne) | Share plan with a friend, timed check-in, fake call, panic button: all free |

Sources: Trustpilot (feeld.com, pure.app), App Store listings, Pew via PsyPost/The Swaddle, Forbes Health via ABC News,
datingnews.com gender-ratio & sexual-health pieces, arXiv 1604.07850 (location privacy), TechRadar (Bumble/Hinge 2 m leak),
Swinburne University (consent/safety), Fast Company (Pure).

## 2. UX principles

1. **Trust is the entry ticket, not a badge.** No verified face, no access.
2. **Consent is a UI pattern.** Blurred by default; explicit content needs two yeses; either side can revoke.
3. **Intent first, photos second.** Boundaries power ranking and are visible before you like someone.
4. **Bias to meeting.** Every screen nudges toward a concrete plan; matches expire without one.
5. **Discretion by default.** Safe defaults on, explained in plain words.
6. **Never sell safety.** Monetise freedom (live windows, travel, incognito), never basic matching or protection.
7. **One-thumb, one-decision screens.** 44 px+ targets, primary action bottom, dark UI for night use.

## 3. Screen map (canvas)

1 Welcome → The Tonight Code (accept 7 house rules, hold to sign) → profile creation (8 steps: 1 Basics · 2 Photos · 3 About you · 4 Sexual health · 5 Intent & boundaries · 6 Live verification · 7 Discretion · 8 Preview) →
5 Discover (Live now / This week) ↔ 6 Profile & fit → 7 It's mutual → 8 Go live tonight →
9 Inbox (plans, expiring matches, filtered requests) → 10 Chat & consent → 11 Plan & safety → 12 After check-in →
13 Privacy & control · 14 Membership →
15 Lounge (community feed) → 16 Thread · 17 Guides (wiki home) → 18 Guide article.

## 3b. Lounge & Guides

- **Lounge (Talk):** posts and replies can include photos: posters tag spicy ones (backed by an AI check), they arrive blurred until tapped, faces are auto-blurred unless the poster opts in, and spicy content can be turned off; posts go under an alias that is never linked to your dating profile; verified users only;
  topics (Confidence, First times, Kink 101, Health); live expert Q&As; educator badges on replies; report/mute on every post.
- **Guides (wiki):** positions, talking & consent, sexual health, foreplay, kink basics, aftercare. Abstract line-art only,
  every guide reviewed by a sex educator. “Add to my wishlist” feeds matching: matches only see items you both added.
- Why: gives a reason to open the app between dates, builds trust, and serves the consent/safety info women ask for.

## 3c. Characters (“the crew”)

- **Blaze** (pink flame): the flirt. Used for likes, matches, Go live, playful nudges.
- **Volt** (blue, lightning tuft): the bold one. Used for verification, safety check-ins, plans, reminders.
- **Vi** (violet, heart antenna): the sweet one. Used for empty states, Guides, consent prompts, aftercare.
- Moments: someone likes you, verified & safe, it's mutual, quiet right now, cozy aftercare. Cute, never explicit.
- Source SVGs: `design-src/Characters.dc.html` (reusable `<g id="c-blaze|c-volt|c-vi">`); example use: `EmptyLive.dc.html`.

## 3d. Me, Ideas, Support, Screenshot protection

- **Me hub:** profile, stats (shows-up %, likes, last tested), settings, Ideas board, Support chat, the Tonight Code.
- **Ideas board** (same pattern as TimeWell / Passport): up/down votes, Top · New · Mine, statuses Open → Planned → Shipped /
  Not planned, team replies, post under Lounge alias or anonymously; a new idea starts with your own upvote.
- **Support:** live chat with a real person (like TimeWell): online status, "Seen" receipts, typing indicator, quick topics,
  attachments, push on reply; a red "Report someone" shortcut jumps the queue.
- **Screenshot protection:** always on. Android: FLAG_SECURE blocks screenshots and recordings. iOS can't block the
  screenshot itself, so protected views (photos, chats, profiles) render inside a secure layer that comes out blank, and the
  app detects the attempt. Shown in onboarding on Welcome and the Discretion step.
- **The Tonight Code:** 7 promises (only yes means yes; be the real you; nothing explicit uninvited; respect a no the first
  time; show up or speak up; what happens here stays here; look after each other). Tap each, then hold to sign. Breaking it
  gets you removed; anything unsafe is one strike.

## 3e. Glow-up frames & community promise

- **Glow-up frames** (earned, never bought) around round profile photos everywhere:
  1. Verified – static blue ring (live selfie passed)
  2. Trusted – pink→blue gradient (+ 3 positive check-ins from matches)
  3. Glowing – slowly rotating duotone ring with soft glow (+ showed up to 5 plans in a row, 90%+ overall)
  4. On fire – rotating fire ring, flicker and flame badge (+ 3 "great communicator" badges, no reports in 90 days)
  Frames step down if conditions lapse (with a warning first). Progress lives in Me › Your glow.
- **Community promise in onboarding:** the final Preview step says "You're joining a community — we build what members ask
  for", linking to the Ideas board.

## 3f. Discover options, face masks, sound

- **Discover options** (pick one, or combine): A card deck · B live grid · C distance radar (distance bands only,
  direction shuffled) · D full-screen stack · E nightly drop of 6 at 21:00 · F discreet fit list (faces blurred until tap).
- **Face masks for photos:** on the Photos step, "Hide my face" → mask editor. On-device face detection places a mask
  (Bunny lace mask with ears, Masquerade, Kitten, Blur) that follows the face; resize with a pinch; apply to all photos.
  The mask is burned in on the phone before upload, so the bare face never leaves the device; reveal privately in chat later.
- **Sound design** (all synthesized, one "fire" family, under 1.5 s, at least 12 dB under system volume, off on silent or
  in discreet mode, always paired with haptics): Ignite whoosh (each vow, going live), Match flame (two whooshes merging
  into a warm chord), Ember seal (crackle while holding, low thump on seal), Heartbeat (like while live).
- Frames level 2 (Trusted) is now earned with 3 positive check-ins from matches (lab-tested removed).

## 3g. Ward, the watchdog

Safety mascot in the cartoon-people style: a Doberman with tall pointy ears, blue-black coat with tan markings, amber eyes,
blue collar with a shield tag. Calm and alert, never scary. Three poses:
- **On watch** (alert): the Tonight Code, Welcome, Privacy. "I guard the Code. You enjoy the night."
- **All good?** (wink, paw up): check-ins, plan safety, arrival check. "Tap if you're safe. I'll tell Sanne."
- **I've got this** (serious, holding a shield): reports, blocking, the support safety queue.
Placed on the Code's watchdog note, the after-check-in banner, and the "Tell Ward" report shortcut in Support.

## 3h. Liquid motion ("the app feels watery")

One shared motion layer on every screen: two blurred colour blobs (pink and blue) that slowly morph and drift behind the
content; gradient buttons whose colours flow; a light flowing along the tab bar; live dots that pulse like sonar; a
dripping dot in the logo; springy squish on every tap; cards and rows that float up into place with a short stagger.
The match screen adds rising bubbles and water ripples. Everything turns off when the phone's "reduce motion" is on.
Build note: in React Native use Reanimated + Skia for the blobs (cheap GPU shaders) and spring physics for taps.

## 4. Visual system

Duotone “two energies”: hot pink-red + electric blue, blended through violet.
- Background `#0E0C10`, surfaces `#17131A` / `#1B171D`, text `#F4EFEA`, muted `#A39AA2`
- Hot pink `#F0287A` (actions, likes), electric blue `#3B7BFF` / light `#6FA8FF` (trust & safety), violet `#7B3CFF` / `#A35BFF` (Plus)
- Primary buttons and the match screen: gradient `#F0287A → #7B3CFF → #3B7BFF`; green `#2BC48A` = live / confirmed
- Type: Bricolage Grotesque (display), Inter (UI)

## 5. Build notes (reuse from Passport Bro's)

Same stack as `../Passportbros the app`: Expo SDK 57 + React Native, Supabase (auth, Postgres, realtime chat,
edge functions), RevenueCat, expo-notifications, expo-secure-store. New needs: liveness/ID verification vendor,
on-device location snapping, image blur + NSFW classifier, alternate app icons (config plugin), scheduled check-in push/SMS.

## 6. Open questions

- Final name (check trademark/App Store availability for “Tonight”).
- App Store / Google Play: explicit content must stay behind mutual opt-in and moderation to pass review (17+/18+ rating).
- Which verification vendor and which countries at launch (age-verification law differs per market).
