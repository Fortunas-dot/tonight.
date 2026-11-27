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
- Masks: "- **Mask:**" picks the app mask (bunny, masq, kitten, devil, angel, lace, latex, bow, crystal, frost) that scripts/mask-people.mjs burns into every photo.
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

## Youssef (youssef)

- **Mask:** devil
- **Gender:** Man
- **Age:** 29
- **Who:** a handsome 29-year-old Moroccan-Dutch man with short black curly hair, a neat short beard and warm brown eyes
- **Portrait:** waist-up photo of him sitting on a sofa at a friend's place in the evening against a plain off-white wall, a floor lamp beside him, in a plain dark navy t-shirt, his hands out of the frame, photo with flash, a confident half smile
- **Night out:** standing a few metres away on a rooftop bar terrace in Amsterdam at night in a fitted black shirt with the top two buttons open, a thin silver chain, hands in his pockets, city lights behind him, laughing
- **Daytime:** sitting a few metres away on the steps outside a brick building in Amsterdam on a sunny afternoon in a plain white t-shirt and black jeans, sunglasses on his head, squinting in the sun
- **Mirror:** mirror photo he took of himself in his bedroom wardrobe mirror before going out, his phone held at chest height, in a black shirt and dark trousers, an unmade bed and a chair with clothes behind him, warm bedside light
- **Selfie:** photo he took of himself at arm's length in the driver's seat of a parked car at night, lit by a street light, grainy, his arm out of the frame, a lopsided grin
- **Party:** blurry flash photo at a friend's birthday in a small bar at night, he laughs with his head thrown back, friends cut off at the edges, string lights behind him, slightly tilted
- **Candid:** photo taken by a friend on a busy terrace in summer, he is mid-sentence looking to the side, in a plain olive shirt, harsh sun and hard shadows, someone's arm at the edge of the frame
- **City:** Amsterdam
- **Country:** Netherlands
- **Bio:** Mint tea by day, rooftop bars by night. I'll make you laugh before I make a move.
- **Prompt:** A rooftop drink, then wherever the night takes us.
- **Intents:** Tonight, Open to more
- **Turn-ons:** Eye contact, Teasing, Good scent, Kissing, Taking charge
- **Yes:** Meet for a drink first, Protection, always, Go to theirs
- **Maybe:** Stay the night
- **Details:** orientation=Straight; relationship=Single; pronouns=he/him; height=180–189 cm; hosting=Sometimes; when=Late nights, Weekends; drinking=Rarely; smoking=Never; languages=Dutch, Arabic, English, French; sign=Aries
- **Prompts:** The way to win me over=Laugh at my worst joke like it was my best. | Green flags=Says what she wants, no guessing games.

## Lucas (lucas)

- **Mask:** masq
- **Gender:** Man
- **Age:** 27
- **Who:** a handsome 27-year-old Brazilian man with tanned skin, short dark brown hair with a fade and stubble
- **Portrait:** waist-up photo of him standing on a small apartment balcony at dusk, a plain concrete wall and a metal railing behind him, in a plain white linen shirt, his hands out of the frame, warm last sunlight on his face, a wide easy smile
- **Night out:** standing a few metres away outside a club in Rotterdam at night in a fitted black t-shirt and dark jeans, hands in his pockets, neon light from the door behind him, laughing
- **Daytime:** walking a few metres away along the river in Rotterdam on a sunny day in a light blue shirt with rolled sleeves, a big bridge far behind him, squinting in the sun
- **Mirror:** mirror photo he took of himself in a small bathroom mirror after a shower, his phone held at chest height, in a plain white t-shirt with a towel around his neck, wet hair, tiles and a shelf with bottles behind him, a bit of steam on the mirror, harsh overhead light
- **Selfie:** photo he took of himself at arm's length on a beach at sunset, wet hair, orange light, grainy, his arm out of the frame, smiling with his eyes half closed
- **Party:** blurry flash photo on a crowded dance floor at night, red and blue club lights, other people cut off at the edges, his face overexposed by the flash, he is mid-laugh
- **Candid:** photo taken by a friend at a barbecue in a small garden in summer, he stands by the grill in a plain grey t-shirt laughing, smoke in the air, someone's shoulder at the edge of the frame, harsh sun
- **City:** Rotterdam
- **Country:** Netherlands
- **Bio:** From Rio, living in Rotterdam. Samba, sunsets and someone who isn't afraid to dance badly with me.
- **Prompt:** Dancing until two, then food from the night shop.
- **Intents:** Tonight, One night
- **Turn-ons:** Dancing close, Humour, Spontaneous, Shower together, All night long
- **Yes:** Meet for a drink first, Host at my place, Protection, always
- **Maybe:** Couples & threesomes, Stay the night
- **Details:** orientation=Bisexual; relationship=Single; pronouns=he/him; height=170–179 cm; hosting=I can host; when=Late nights, Spontaneous; drinking=Socially; smoking=Socially; languages=Portuguese, English, Spanish; sign=Sagittarius
- **Prompts:** My most spontaneous moment=Flew to Lisbon for a concert, booked it at midnight. | A secret talent=I can teach anyone to samba in five minutes.

## Thomas (thomas)

- **Mask:** frost
- **Gender:** Man
- **Age:** 35
- **Who:** a handsome 35-year-old Belgian man with short light brown hair going slightly grey at the sides and a clean-shaven face
- **Portrait:** waist-up photo of him standing in a narrow cobbled street in Antwerp on an overcast afternoon, an old brick wall behind him, in a plain navy coat over a grey t-shirt, his hands in his pockets, flat grey daylight, a calm smile
- **Night out:** sitting a few metres away at the counter of a dim cocktail bar in Antwerp at night in a dark blue shirt with the sleeves rolled up, one whisky glass on the counter, his hands in his lap, a plain dark wall behind him, a slight smile
- **Daytime:** sitting a few metres away at an outdoor café table on a square in Antwerp in a light grey shirt, one coffee cup on the table, hands in his lap, relaxed
- **Mirror:** mirror photo he took of himself in a hotel room mirror, his phone held at chest height, in a white shirt and dark trousers, a made bed and a suitcase behind him, warm lamp light
- **Selfie:** photo he took of himself at arm's length on a train by the window, grey sky outside, flat light, a bit grainy, his arm out of the frame, a tired smile
- **Party:** flash photo at a friend's dinner party at night, he sits at a long table with wine glasses and plates, friends cut off at the edges, red eyes from the flash, laughing
- **Candid:** photo taken by a friend on a cycling path in the countryside, he stands next to his bike in a plain navy jacket, squinting into the sun, the horizon a bit crooked
- **City:** Antwerp
- **Country:** Belgium
- **Bio:** Divorced, happy about it, and honest about what I want. Good wine, slow evenings, no drama.
- **Prompt:** Dinner, a long walk, then a hotel with a view.
- **Intents:** This week, Regular FWB
- **Turn-ons:** Slow build-up, Hotel nights, Massage, Well dressed, Morning after
- **Yes:** Meet for a drink first, Protection, always, Stay the night
- **Maybe:** Host at my place, Kink-friendly
- **Details:** orientation=Straight; relationship=Single; pronouns=he/him; height=180–189 cm; hosting=Hotel person; when=Weeknights, Weekends; drinking=Wine o'clock; smoking=Never; languages=Dutch, French, English; sign=Capricorn
- **Prompts:** After a date, I like to=Send a message before you get home. | I'll know it's a match when=We close the restaurant.

## Emre (emre)

- **Mask:** latex
- **Gender:** Man
- **Age:** 32
- **Who:** a handsome 32-year-old Turkish-German man with short dark hair, a full trimmed dark beard and broad shoulders
- **Portrait:** waist-up photo of him standing in a park at dusk, dark trees out of focus behind him, in a plain black t-shirt, his hands in his pockets, the last blue light of the evening, a serious look with a hint of a smile
- **Night out:** standing a few metres away outside a bar in Eindhoven at night in a black leather jacket over a plain white t-shirt, hands in his jacket pockets, the bar's lit sign behind him, a slight smile
- **Daytime:** sitting a few metres away on a bench in a park in Eindhoven on a cloudy afternoon in a grey hoodie and jeans, hands in his pockets, relaxed
- **Mirror:** mirror photo he took of himself in a gym changing room mirror, his phone held at chest height, in a black tank top, lockers and a bench behind him, flat fluorescent light, a bit sweaty
- **Selfie:** photo he took of himself at arm's length lying on a sofa in the evening, dim light from a television, grainy, his arm out of the frame, a lazy smile
- **Party:** blurry flash photo in a crowded bar at night, friends cut off at the edges, he is laughing with his eyes half closed, slightly tilted
- **Candid:** photo taken by a friend at a lake in summer, he sits on a wooden jetty in black swim shorts, shirtless, his feet in the water, harsh sun, squinting
- **City:** Eindhoven
- **Country:** Netherlands
- **Bio:** Engineer by day, a little bit of trouble at night. I like clear rules and breaking them together.
- **Prompt:** One drink, then my place. I'll put on the right music.
- **Intents:** Tonight, Kink & play
- **Turn-ons:** Taking charge, Dirty talk, Blindfolds, Light bondage, A deep voice
- **Yes:** Meet for a drink first, Host at my place, Kink-friendly, Protection, always
- **Maybe:** Stay the night
- **Details:** orientation=Straight; relationship=Single; pronouns=he/him; height=180–189 cm; hosting=I can host; when=Weeknights, Late nights; drinking=Socially; smoking=Never; languages=Turkish, German, English, Dutch; sign=Scorpio
- **Prompts:** Ask me about=The safe word I always suggest. | Green flags=Tells me her limits before I have to ask.

## Noor (noor)

- **Mask:** angel
- **Gender:** Woman
- **Age:** 24
- **Who:** a pretty 24-year-old Dutch woman with long light brown hair in loose waves and light blue eyes
- **Portrait:** waist-up photo of her standing in front of the dark green front door of a student house in Groningen in the evening, in a plain white satin top with thin straps under an open denim jacket, her hands out of the frame, photo with flash, a playful smile
- **Night out:** standing a few metres away outside a bar in Groningen at night in a short silver skirt and a black top with thin straps, her hands out of the frame, bikes parked behind her, laughing
- **Daytime:** sitting a few metres away on the edge of a canal in Groningen on a sunny afternoon in a plain light blue t-shirt and denim shorts, her bike behind her, squinting in the sun
- **Mirror:** mirror photo she took of herself in a full-length mirror on her bedroom door before going out, her phone held at chest height, in a short black dress, clothes all over the bed behind her, warm ceiling light
- **Selfie:** photo she took of herself at arm's length in bed late at night, lit only by a small lamp, messy hair, grainy, her arm out of the frame, a sleepy grin
- **Party:** blurry flash photo at a student party at night, she dances with her eyes closed, other people cut off at the edges, purple light, her face overexposed by the flash
- **Candid:** photo taken by a friend at an outdoor festival in summer, she sits on the grass in a white crop top and shorts, glitter on her cheeks, harsh sun, someone's leg at the edge of the frame
- **City:** Groningen
- **Country:** Netherlands
- **Bio:** Final year, no plans for the weekend yet. Make me a good offer.
- **Prompt:** Shots, dancing, and a little bit of trouble.
- **Intents:** Tonight, One night
- **Turn-ons:** Flirty texting, Dancing close, Kissing, Spontaneous, Confidence
- **Yes:** Meet for a drink first, Protection, always
- **Maybe:** Go to theirs, Couples & threesomes
- **Details:** orientation=Bisexual; relationship=Single; pronouns=she/her; height=170–179 cm; hosting=I can't host; when=Weekends, Spontaneous; drinking=Socially; smoking=Socially; languages=Dutch, English, German; sign=Gemini
- **Prompts:** A turn-off for me=Asking for my number before saying hi. | My most spontaneous moment=Went home with a DJ. Best breakfast ever.

## Giulia (giulia)

- **Mask:** lace
- **Gender:** Woman
- **Age:** 29
- **Who:** a pretty 29-year-old Italian woman with olive skin, dark brown hair in a low bun with loose strands and brown eyes
- **Portrait:** waist-up photo of her sitting at an outdoor restaurant table on a dark street at night, warm lit windows out of focus behind her, one glass of red wine on the table, in a plain black top with thin straps, her hands in her lap, photo with flash, a warm smile
- **Night out:** standing a few metres away outside a wine bar in Amsterdam at night in a fitted red satin dress with thin straps, her hands out of the frame, the bar's lit window behind her, laughing
- **Daytime:** walking a few metres away down a quiet street in Amsterdam on a sunny morning in a white linen shirt and jeans, sunglasses on, a tote bag on her shoulder, smiling
- **Mirror:** mirror photo she took of herself in a narrow hallway mirror before going out, her phone held at chest height, in a short black dress, a coat rack and shoes behind her, harsh ceiling light, fingerprints on the mirror
- **Selfie:** photo she took of herself at arm's length on a balcony in the morning in an oversized white shirt, messy hair, soft grey light, grainy, her arm out of the frame, a small smile
- **Party:** flash photo at a friend's dinner party at night, she laughs at the table with wine glasses and candles in front of her, friends cut off at the edges, red eyes from the flash
- **Candid:** photo taken by a friend on a boat on an Amsterdam canal in summer, she sits at the edge in a yellow sundress with sunglasses on her head, laughing, harsh sun, the horizon a bit crooked
- **City:** Amsterdam
- **Country:** Netherlands
- **Bio:** I cook, you bring the wine. If the pasta is good, maybe dessert too.
- **Prompt:** Dinner at my place, candles, and no rush to leave.
- **Intents:** This week, Regular FWB
- **Turn-ons:** Candles & music, Good scent, Nice hands, Being spoiled, Morning after
- **Yes:** Meet for a drink first, Host at my place, Protection, always, Stay the night
- **Maybe:** Kink-friendly
- **Details:** orientation=Straight; relationship=Single; pronouns=she/her; height=160–169 cm; hosting=I can host; when=Weeknights, Weekends; drinking=Wine o'clock; smoking=Never; languages=Italian, English, Spanish; sign=Cancer
- **Prompts:** The way to win me over=Eat seconds and mean it. | After a date, I like to=Stay in bed until noon.

## Robin (robin)

- **Mask:** crystal
- **Gender:** Non-binary
- **Age:** 27
- **Who:** an attractive 27-year-old Dutch person with an androgynous look, short bleached platinum hair and a small silver nose ring
- **Portrait:** waist-up photo of them standing on a flat rooftop in the late afternoon, a pale open sky behind them, in a plain black tank top, their hands out of the frame, low golden sun from the side, a cool half smile
- **Night out:** standing a few metres away outside a bar in Utrecht at night in a black sleeveless top and black trousers with a silver chain, their hands out of the frame, pink neon light from the bar behind them, laughing
- **Daytime:** sitting a few metres away on a canal wharf in Utrecht on a sunny afternoon in an oversized plain white shirt and black jeans, sunglasses on, relaxed
- **Mirror:** mirror photo they took of themselves in a bathroom mirror at a club, their phone held at chest height, in a black top with a silver chain, stickers on the mirror, harsh red light
- **Selfie:** photo they took of themselves at arm's length in a tram at night, lit by the tram lights, grainy, their arm out of the frame, a lazy smile
- **Party:** blurry flash photo on a crowded dance floor at a queer party at night, they dance with their eyes closed, pink and blue lights, other people cut off at the edges, slightly tilted
- **Candid:** photo taken by a friend at a street party in summer, they stand in the sun with glitter on their cheeks in a plain white tank top, someone's shoulder at the edge of the frame, harsh sun
- **City:** Utrecht
- **Country:** Netherlands
- **Bio:** Queer, curious and very good at slow dancing. All genders welcome, good energy required.
- **Prompt:** A dark bar, a good DJ, and someone who leans in.
- **Intents:** Tonight, Open to more
- **Turn-ons:** Being led, Teasing, Tattoos, Dancing close, Role play
- **Yes:** Meet for a drink first, Protection, always, Couples & threesomes
- **Maybe:** Host at my place, Kink-friendly
- **Details:** orientation=Queer; relationship=Single; pronouns=they/them; height=170–179 cm; hosting=Sometimes; when=Late nights, Weekends; drinking=Socially; smoking=420 friendly; languages=Dutch, English; sign=Aquarius
- **Prompts:** Green flags=Asks for my pronouns and then just gets on with it. | Ask me about=The best queer night in Utrecht.
