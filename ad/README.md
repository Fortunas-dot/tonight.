# Tonight brand-film ads

Everything for the Instagram/TikTok ads (9:16) lives in this folder. The media files are
ignored by git (see `.gitignore`); the scripts and this README are not.

## Versions (in `out/`)

| File | What it is | Build |
|---|---|---|
| `tonight-ad-v2-artsy.mp4` | ~45 s mood film: fast cuts, grain, black-and-white flashes, one-word cards | `npm run build:artsy` |
| `tonight-ad-v3-clear.mp4` | ~51 s, same look plus real App Store screens and a script that explains the app | `npm run build:clear` |
| `tonight-ad-v4-uup.mp4` | ~27 s "u up?": a cringe chat from other apps (hey / wyd / u up? / unsolicited photo / unmatched), a flood of messages, silence, then "say what you want before you match" → boundaries → Lotte → logo. Drawn frame by frame in Python, no Flow clips | `python scripts/build-v4-uup.py` |
| `tonight-ad-v5-body.mp4` | ~32 s "What the body can do": a pink glow that breathes, synthesised breathing + heartbeat speeding up with one word per breath, a deadpan body documentary (600+ muscles, 2 m² of skin, "a fraction explored"), then What you're into, Guides and the logo. No Flow clips | `python scripts/build-v5-body.py` |
| `tonight-ad-v6-climax.mp4` | ~28 s "Come together": breathing only (no other effects) and a glow that build to a climax (21 breaths, words slow → YES.), white flash + rings + a long sighing breath; no word "sex" (Meta), "…wow.", then What you're into, Lotte, Guides and the logo. No Flow clips | `python scripts/build-v6-climax.py` |
| `tonight-ad-v7-split.mp4` | ~30 s "Two phones, one night": split screen, Lotte (top) and Daan (bottom) as realistic Flow clips, timestamps 21:04 → 22:03, Discover + What you're into, then the bar door and drinks. Clips in `clips-v7/` (01 lotte-home, 02 daan-home done; 03 lotte-typing, 04 daan-leaves, 05 bar-door, 06 bar-inside still to make — missing ones show as placeholders). Reference photos: `flow-upload/lotte-*.jpg`, `daan-*.jpg`; prompts are in the script's docstring/README history | `python scripts/build-v7-split.py` |

`scripts/build-v1-simple.mjs` is the first, plain cut (paths are outdated; kept for reference).

## Folder

- `clips/01…08-*.mp4`: the eight AI clips from Google Flow (720p, 8 s each, with Flow's own music).
  Shots 1–5 come from the Flow project on the first Google account, 6–8 from aymanelfilali19@gmail.com.
- `flow-upload/`: the character and mask images to upload to Flow as references.
- `vo-v1-ava/`, `vo-v2-artsy/`, `vo-v3-clear/`: voice lines `00.wav, 01.wav …`, one per line of the script.
- `scripts/lines-v2-artsy.txt`, `scripts/lines-v3-clear.txt`, `scripts/lines-v4-uup.txt`, `scripts/lines-v5-body.txt`, `scripts/lines-v6-climax.txt`: the spoken script, one line per file.
- App screens come from `../store/screenshots/iphone-6.9/`, the logo from `../assets/icon.png`.
- `screens/03-discover-lotte.png`: the Discover screenshot with demo profile Lotte (bunny mask, night-out photo)
  instead of Daan. Made by `python scripts/discover-woman.py [photo]`; pass another `assets/demo-raw/<name>/masked-N.png` to swap her.
- `screens/04-boundaries-new.png`: the store's "You set the boundaries." frame with the current "What are you after?"
  screen (When / What you're into). Made by `python scripts/make-boundaries.py` from `screens/src/after-full.png`,
  a capture of the app on web (`npx expo start --web`, onboarding step 5) at 440 css px shown 2x, stitched from 3 screenshots.

## Tools (installed here)

- `npm install` → ffmpeg + ffprobe (`node_modules/ffmpeg-static`).
- `python -m venv .venv` then `.venv/Scripts/pip install edge-tts` → free Microsoft neural voices.

## How to change things

- **Words on screen / cut order / timing**: edit the `groups` list in the build script and rebuild.
  Each group is one voice line over a run of segments: `c(clip, from, to, look)` (look = `color`, `bw`, `shift`),
  `screen(png, seconds, fromFrac, toFrac)`, `card([lines], seconds)`, `flash(seconds, color)`.
- **Voice**: edit the lines file, then
  `npm run vo -- scripts/lines-v3-clear.txt vo-v3-clear en-GB-SoniaNeural -15% -14Hz`
  and paste the printed lengths into `VOLEN` in the build script.
  To use a better voice (e.g. ElevenLabs), save each line as `00.wav, 01.wav …` in the vo folder,
  measure them and update `VOLEN`. Don't imitate a real person's voice.
- **Music**: the bed is the clips' own soundtracks crossfaded (`bedSrc`). Swap in a licensed track
  by replacing step 2 in the build script with that file.
- Loudness is normalised to -14 LUFS for Instagram.

## Notes

- The end cards say "now on the App Store": only run the ads once the app is live.
- Flow credits: ~10 per clip on Veo 3.1 Lite; they refill monthly.

## Image ads (`out/images/`)

`python scripts/build-images.py` (or `npm run build:images`) makes every concept in three sizes:
`-4x5` 1080x1350 (feed), `-9x16` 1080x1920 (Stories/Reels, top 260 px and bottom 340 px kept clear of Instagram's UI),
`-1x1` 1080x1080. Fonts are the app's own (Bricolage Grotesque, Inter, from the app's node_modules).

| Concept | Files |
|---|---|
| "u up?" chat → "Keep it casual. Just say what you want first." (+ carousel slide 2: "Tonight asks first." with the new What are you after? screen) | `1-uup-*`, `1-uup-slide2-*` |
| YES. MAYBE. NO. → "Casual dating. Your terms first." | `2-yes-maybe-no-*` |
| Lotte in the bunny mask → "No strings. Just tonight." | `3-mask-*` |
| Carousel: other apps (crossed out) → Tonight (ticks) | `4-before-*`, `4-after-*` |
| Split still of Lotte and Daan at 21:04 → "Free tonight. Keeping it casual." (frames from `clips-v7/`) | `5-split-*` |

No word "sex" anywhere (Meta). Every image says casual dating: in the headline or list, and under the logo ("casual dating · on the App Store", STORE_LINE in the script).
