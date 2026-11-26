# Demo people — photo prompts

`scripts/generate-people.mjs` reads this file; `scripts/seed-demo.mjs` reads the profile fields and puts them in
Supabase as demo profiles (`profiles.is_demo`). The photo method is the one from Passportbros
(`Passportbros the app/scripts/ladies-prompts.md`): Flux dev + the Boreal v2 "boring reality" LoRA for an ordinary
snapshot look, then Nano Banana Pro keeps the same face for the other shots.

## Quick start

```bash
node scripts/generate-people.mjs lotte --try 3     # 3 portrait options in assets/demo-raw/lotte/ (nothing else changes)
node scripts/generate-people.mjs lotte --pick 2    # option 2 becomes the portrait
node scripts/generate-people.mjs lotte             # the other shots (Night out, Daytime)
node scripts/generate-people.mjs --all             # everything still missing, for everyone
node scripts/seed-demo.mjs                         # create / update the demo profiles in Supabase
```

## Rules (learned on Passportbros)

- Describe the moment plainly, like a caption. No style words (realistic, 8k, cinematic, beautiful).
- No "iPhone", "Instagram" or "selfie": the model draws a phone or app into the photo. (Wanted in a mirror photo, so
  those say "her phone held at chest height"; an arm's-length photo says "her arm out of the frame".)
- Amateur, like real dating apps (Nov 2026): the polished portraits looked too professional, so the photos shown
  (**Show** below: Mirror, Selfie, Party, Candid) are things people take themselves or a friend snaps — mirror photos,
  arm's-length shots, blurry flash, crooked horizons, harsh sun, someone cut off at the edge. The portrait, Night out
  and Daytime shots stay as the face reference. scripts/mask-people.mjs adds a phone-camera finish (find-faces.py roughen).
- A few metres away, the person a third to half of the frame, background in focus. Centred close-ups look AI.
- Hands out of the frame, in pockets or in the lap. Held objects grow extra fingers.
- Plain smooth fabrics; no knitwear, lace or small prints. Plain walls; no rows of identical things or crowds.
- Masks: "- **Mask:**" picks the app mask (bunny, masq, kitten, frost) that scripts/mask-people.mjs burns into every photo.
- Theme: Tonight is about going out. Dressed up for the evening, bars, rooftops, flash photos — flirty, never explicit.

## Settings

- **Prefix:** phone photo of
- **Boreal strength:** 0.85
- **Size:** 768x1024
- **Show:** 4, 5, 6, 7

A person's own **Show** line replaces this list for them (Lotte: the café Candid looked fake, removed Nov 2026).

## Lotte (lotte)

- **Show:** 4, 5, 6
- **Mask:** bunny
- **Gender:** Woman
- **Age:** 28
- **Who:** a pretty 28-year-old Dutch woman with straight blonde shoulder-length hair and light freckles
- **Portrait:** waist-up photo of her sitting on a sofa at a friend's place in the evening against a plain light grey wall, a floor lamp beside her, in a plain black satin top, her hands out of the frame, photo with flash, a small knowing smile
- **Night out:** standing a few metres away outside a bar on an Amsterdam canal at night in a short black mini dress with thin straps and an open cropped leather jacket, hands in her jacket pockets, the bar's lit window behind her, laughing
- **Daytime:** sitting a few metres away on a bench by a canal in Amsterdam on a sunny afternoon in a white t-shirt and jeans, her bike leaning on a lamppost behind her, squinting in the sun
- **Mirror:** mirror photo she took of herself in a narrow hallway mirror at home before going out, her phone held at chest height, in a short black slip dress with thin straps, coats on a rack and shoes on the floor behind her, harsh ceiling light, fingerprints on the mirror
- **Selfie:** photo she took of herself at arm's length from slightly above, lying on her unmade bed on a Sunday morning in an oversized grey t-shirt, messy hair, dim grey window light, grainy, her arm out of the frame, a sleepy smile
- **Party:** blurry flash photo taken by a friend on a crowded dance floor at night, she is mid-laugh, red and purple club lights, faces of other people cut off at the edges, her face overexposed by the flash, slightly tilted
- **Candid:** slightly out of focus photo taken by a friend across a small café table on a grey day, she is mid-sentence and not looking at the camera, a cappuccino on the table, someone's shoulder at the edge of the frame
- **City:** Amsterdam
- **Country:** Netherlands
- **Bio:** Last drink at a canal bar, then we see where the night goes. Confident and kind wins.
- **Prompt:** One drink, good chemistry, no rush.
- **Intents:** Tonight, This week
- **Turn-ons:** Confidence, Eye contact, Flirty texting, Slow build-up, Dancing close
- **Yes:** Meet for a drink first, Protection, always, Stay the night
- **Maybe:** Host at my place
- **Details:** orientation=Straight; relationship=Single; pronouns=she/her; height=170–179 cm; hosting=Sometimes; when=Weekends, Late nights; drinking=Socially; smoking=Never; languages=Dutch, English; sign=Scorpio
- **Prompts:** Green flags=Asks what I like and remembers it next time. | Ask me about=The bar I'd take you to first.

## Ines (ines)

- **Mask:** masq
- **Gender:** Woman
- **Age:** 26
- **Who:** a pretty 26-year-old Spanish woman with long dark brown wavy hair and dark eyes
- **Portrait:** sitting a few metres away at a small round table in a dim cocktail bar in the evening, one cocktail glass on the table, a plain dark red wall behind her, in a plain black slip dress, her hands in her lap, photo with flash, looking at the camera with a faint smile
- **Night out:** waist-up photo of her on a rooftop terrace at night with the city lights behind her, in a fitted red top with thin straps and a low neckline, bare shoulders, wind in her hair, her hands out of the frame, laughing
- **Daytime:** walking a few metres away on a quiet Rotterdam street in a beige trench coat and jeans, hands in her coat pockets, looking back at the camera
- **Mirror:** mirror photo she took of herself in a small bathroom mirror, her phone held at chest height, in a red crop top and high-waisted jeans, a towel on a hook and bottles on the shelf, harsh yellow overhead light, a bit of steam on the mirror
- **Selfie:** photo she took of herself at arm's length in the passenger seat of a car at sunset, sunglasses pushed up on her head, a strand of hair across her face, orange light, her arm out of the frame, smiling with her mouth closed
- **Party:** flash photo at a messy house party at night, she sits on a sofa between two friends who are cut off by the frame, in a black bodysuit, red eyes from the flash, a lamp and posters behind her
- **Candid:** photo taken by a friend on a beach at sunset, she turns around and laughs, in a black bikini top and denim shorts, the horizon a bit crooked, sand on her legs, overexposed sky
- **City:** Rotterdam
- **Country:** Netherlands
- **Bio:** New in Rotterdam. Show me your favourite late-night spot and I'll show you how Spaniards dance.
- **Prompt:** Dancing first. Everything else is a maybe.
- **Intents:** Tonight, Open to more
- **Turn-ons:** Dancing close, Humour, Good scent, Teasing, Spontaneous
- **Yes:** Meet for a drink first, Protection, always
- **Maybe:** Stay the night, Go to theirs
- **Details:** orientation=Bisexual; relationship=Single; pronouns=she/her; height=160–169 cm; hosting=I can't host; when=Late nights, Spontaneous; drinking=Socially; smoking=Socially; languages=Spanish, English; sign=Leo
- **Prompts:** The way to win me over=Pick the music. If it's good, I'm yours for the night. | A turn-off for me=Being on your phone the whole night.

## Maya (maya)

- **Mask:** kitten
- **Gender:** Woman
- **Age:** 31
- **Who:** a pretty 31-year-old Surinamese-Dutch woman with dark brown skin and long black box braids
- **Portrait:** sitting a few metres away on a chair at home against a plain warm beige wall in the evening, a plant and a radiator beside her, in a plain emerald green dress, her hands resting in her lap, photo with flash, a calm confident smile
- **Night out:** standing a few metres away at the counter of a busy wine bar at night in a fitted black dress with a deep V neckline and gold earrings, a glass of red wine on the counter, mid-sentence, smiling
- **Daytime:** sitting a few metres away at an outdoor café table in Utrecht in a plain white shirt and sunglasses on her head, one coffee cup on the table, hands in her lap, relaxed
- **Mirror:** full-length mirror photo she took of herself in a fitting room, her phone held at chest height, in a fitted white dress, her own clothes hanging on a hook, harsh fluorescent light, the curtain half open
- **Selfie:** photo she took of herself at arm's length in the back seat of a taxi at night, lit by orange street lights, gold hoop earrings, grainy and a little blurry, her arm out of the frame, a small smile
- **Party:** flash photo at a friend's birthday party at home, balloons and a banner on the wall behind her, in a satin champagne-coloured slip dress, laughing at something off camera, red eyes from the flash
- **Candid:** photo taken by a friend at a picnic in a park in summer, she lies on a checked blanket in a yellow sundress, sunglasses on, squinting, harsh midday sun, a bag of crisps and a water bottle next to her
- **City:** Utrecht
- **Country:** Netherlands
- **Bio:** Good wine, better company. I like someone who knows what they want and says it.
- **Prompt:** Eye contact across a bar, then the slow walk home.
- **Intents:** This week, Regular FWB
- **Turn-ons:** A deep voice, Well dressed, Taking charge, Massage, Candles & music
- **Yes:** Meet for a drink first, Host at my place, Protection, always
- **Maybe:** Stay the night
- **Details:** orientation=Straight; relationship=Single; pronouns=she/her; height=170–179 cm; hosting=I can host; when=Weeknights, Weekends; drinking=Wine o'clock; smoking=Never; languages=Dutch, English; sign=Taurus
- **Prompts:** Green flags=Shows up on time and says what he wants. | After a date, I like to=Get a message the next morning.

## Sofie (sofie)

- **Mask:** masq
- **Gender:** Woman
- **Age:** 33
- **Who:** a pretty 33-year-old Belgian woman with wavy auburn shoulder-length hair and green eyes
- **Portrait:** waist-up photo of her at a friend's dinner party at night in a plain dark blue dress, a plain white wall and a window behind her, photo with flash, her hands out of the frame, laughing
- **Night out:** sitting a few metres away on a leather bench in a quiet hotel bar at night, one glass of champagne on the low table, a plain wood-panelled wall behind her, in a black silk camisole with thin straps and a short black skirt, legs crossed, her hands in her lap, a playful smile
- **Daytime:** walking a few metres away through a park in The Hague in autumn in a camel coat, hands in her pockets, a calm expression
- **Mirror:** mirror photo she took of herself in a lift mirror, her phone held at chest height, in a black blazer dress with a deep neckline, brushed metal walls and buttons, cold light, a little blurry
- **Selfie:** photo she took of herself at arm's length in a hotel bed in the morning in a white bathrobe, messy hair, soft window light, grainy, her arm out of the frame, a lazy smile
- **Party:** flash photo at a wedding party on the dance floor at night in a green satin dress with thin straps, blurred fairy lights behind her, her hair in motion, slightly tilted
- **Candid:** photo taken by a friend on a sunny terrace, she sits with a glass of white wine in a sleeveless white top, harsh sun and hard shadows, someone's elbow at the edge of the frame, squinting
- **City:** The Hague
- **Country:** Netherlands
- **Bio:** Open relationship, honest about it. Hotel bars, good conversation and someone who's easy to be around.
- **Prompt:** Massage, music, no phones.
- **Intents:** This week, Regular FWB
- **Turn-ons:** Slow build-up, Hotel nights, Kissing, Being spoiled, Lingerie
- **Yes:** Meet for a drink first, Go to theirs, Protection, always
- **Maybe:** Couples & threesomes
- **Details:** orientation=Bisexual; relationship=Open relationship; pronouns=she/her; height=160–169 cm; hosting=Hotel person; when=Weeknights; drinking=Socially; smoking=Never; languages=Dutch, French, English; sign=Libra
- **Prompts:** My most spontaneous moment=A last-minute train to Paris for one dinner. | I'll know it's a match when=We forget to check the time.

## Daan (daan)

- **Mask:** masq
- **Gender:** Man
- **Age:** 30
- **Who:** a handsome 30-year-old Dutch man with short dark blond hair and a short trimmed beard
- **Portrait:** waist-up photo of him sitting on a sofa at home in the evening against a plain dark green wall, a floor lamp and a record player beside him, in a plain black t-shirt, his hands out of the frame, photo with flash, a relaxed half smile
- **Night out:** standing a few metres away outside a bar at night in a black linen shirt unbuttoned halfway down his chest, sleeves rolled up, hands in his pockets, the bar's lit window behind him, laughing
- **Daytime:** sitting a few metres away on a terrace in Amsterdam in a white t-shirt and sunglasses, one beer glass on the table, squinting in the sun
- **Mirror:** mirror photo he took of himself in a gym mirror after a workout, his phone held at chest height, in a grey tank top, a bit sweaty, weights and a bench behind him, flat fluorescent light
- **Selfie:** photo he took of himself at arm's length on his small balcony in the evening, plants and a folding chair behind him, dim light, grainy, his arm out of the frame, a lopsided grin
- **Party:** blurry flash photo in a crowded bar at night with two friends cut off at the edges, he laughs with his eyes half closed, beer glasses on the counter, slightly tilted
- **Candid:** photo taken by a friend on a small sailboat on a lake in summer, he is shirtless in navy swim shorts, sunburnt shoulders, squinting in the sun, the horizon a bit crooked
- **City:** Amsterdam
- **Country:** Netherlands
- **Bio:** Late-night person. Bad jokes, good playlists, better massages.
- **Prompt:** A drink at my local, then my place for records.
- **Intents:** Tonight, Regular FWB
- **Turn-ons:** Humour, Eye contact, Massage, Morning after, All night long
- **Yes:** Meet for a drink first, Host at my place, Protection, always
- **Maybe:** Stay the night
- **Details:** orientation=Straight; relationship=Single; pronouns=he/him; height=180–189 cm; hosting=I can host; when=Late nights, Weekends; drinking=Socially; smoking=Never; languages=Dutch, English; sign=Gemini
- **Prompts:** Ask me about=The record I'd put on first. | A secret talent=Breakfast the morning after.
