// Sample content for the first TestFlight build. Replace with Supabase data later.

export const VOWS = [
  { n: 'I', text: 'I only take a clear yes' },
  { n: 'II', text: 'I show up as my real self' },
  { n: 'III', text: 'I send nothing explicit uninvited' },
  { n: 'IV', text: 'I respect a no, the first time' },
  { n: 'V', text: 'I show up, or I say so' },
  { n: 'VI', text: 'What happens here, stays here' },
  { n: 'VII', text: 'I look after the people I meet' },
];

export const INTENTS = ['Tonight', 'This week', 'Regular FWB', 'Open to more'];

export const BOUNDARIES = ['Meet for a drink first', 'Host at my place', 'Go to theirs', 'Stay the night', 'Couples & threesomes', 'Kink-friendly', 'Protection, always'];

export const MAX_TURN_ONS = 8;

export const TURN_ON_GROUPS = [
  { title: 'The vibe', items: ['Confidence', 'Humour', 'Eye contact', 'Good scent', 'Nice hands', 'A deep voice', 'Tattoos', 'Well dressed'] },
  { title: 'The build-up', items: ['Slow build-up', 'Flirty texting', 'Dirty talk', 'Kissing', 'Teasing', 'Dancing close', 'Lingerie', 'Role play'] },
  { title: 'In the moment', items: ['Taking charge', 'Being led', 'Being spoiled', 'Massage', 'Hair pulling', 'Blindfolds', 'Light bondage', 'Toys'] },
  { title: 'Setting', items: ['Candles & music', 'Shower together', 'Morning after', 'Hotel nights', 'Spontaneous', 'All night long'] },
];

export const TURN_ONS = TURN_ON_GROUPS.flatMap((g) => g.items);

export const PEOPLE = [
  {
    id: 'lina',
    details: {
      orientation: 'Bisexual',
      relationship: 'Single',
      pronouns: 'she/her',
      height: '170–179 cm',
      hosting: 'I can host',
      when: ['Weekends', 'Late nights'],
      drinking: 'Socially',
      languages: ['English', 'Dutch'],
      sign: 'Scorpio',
    },
    prompts: [
      { q: 'Green flags', a: 'Asks what I like, remembers it next time.' },
      { q: 'Ask me about', a: 'The bar I’d take you to first.' },
    ],
    turnOns: ['Confidence', 'Eye contact', 'Slow build-up', 'Lingerie'],

    name: 'Lina',
    age: 29,
    dist: '2 km away',
    until: '1:00',
    fit: 7,
    tier: 'fire',
    seed: 0,
    tested: 'Oct',
    showsUp: 96,
    bio: 'Cocktail at Bar Mona first, then let’s see. I like confident and kind.',
    prompt: 'One drink, good conversation, no rush. If it clicks, it clicks.',
    both: ['A drink first', 'Protection, always', 'A slow build-up'],
    maybe: 'Staying over',
  },
  {
    id: 'sam',
    details: { orientation: 'Straight', relationship: 'Open relationship', height: '160–169 cm', hosting: 'Sometimes', when: ['Weeknights'], drinking: 'Wine o’clock', smoking: 'Never', sign: 'Leo' },
    prompts: [{ q: 'A turn-off for me', a: 'Being on your phone the whole night.' }],
    turnOns: ['Humour', 'Massage', 'Good scent'],

    name: 'Sam',
    age: 31,
    dist: 'Under 1 km',
    until: '2:00',
    fit: 7,
    tier: 'glow',
    seed: 3,
    tested: 'Nov',
    showsUp: 92,
    bio: 'Near the canal tonight. Good wine, better company.',
    prompt: 'Eye contact across a bar, then the slow walk home.',
    both: ['A drink first', 'Protection, always'],
    maybe: 'Hosting',
  },
  {
    id: 'noor',
    name: 'Noor',
    age: 27,
    dist: 'About 3 km',
    until: '0:30',
    fit: 6,
    tier: 'verified',
    seed: 1,
    tested: 'Sep',
    showsUp: 100,
    bio: 'New in town. Show me your favourite spot.',
    prompt: 'Dancing first. Everything else is a maybe.',
    both: ['A drink first', 'Kink-friendly'],
    maybe: 'Staying over',
  },
  {
    id: 'jules',
    name: 'Jules',
    age: 34,
    dist: 'About 2 km',
    until: '3:00',
    fit: 6,
    tier: 'glow',
    seed: 2,
    tested: 'Oct',
    showsUp: 89,
    bio: 'Late-night person. Bad jokes, good hands.',
    prompt: 'Massage, music, no phones.',
    both: ['Protection, always', 'Massage'],
    maybe: 'Going to theirs',
  },
];

export const CHATS = [
  {
    id: 'lina',
    plan: { place: 'Bar Mona', time: '21:30' },
    messages: [{ me: true, text: 'Drink at Bar Mona, 21:30?' }, { plan: true }, { me: false, text: 'Yes! I’ll grab a seat at the bar' }, { me: true, text: 'Black jacket. Can’t miss me.' }],
  },
  { id: 'sam', left: '6h left', messages: [{ me: false, text: 'Free after 10? I’m near the canal' }] },
  { id: 'noor', left: '23h left', messages: [] },
  { id: 'jules', left: '40h left', messages: [{ me: false, text: 'Haha fair. What are you up to Friday?' }] },
];

export const POSTS = [
  { id: 'p1', by: 'velvet_fox', topic: 'Confidence', title: 'How do you bring up boundaries without killing the mood?', likes: 212, replies: 48, expert: true },
  { id: 'p2', by: 'nightowl_k', topic: 'First times', title: 'First hookup in years after a long relationship. Nervous-excited. Tips?', likes: 156, replies: 61 },
  { id: 'p3', by: 'm_and_j', topic: 'Date night', title: 'New outfit for Friday: red or black?', likes: 98, replies: 23, spicy: true },
];

// Guides read like short blog articles: a lead, then blocks ({ h } heading, { p } paragraph, { say } lines to try,
// { tip } highlighted tip, { list } bullets, { quote } pull quote). `body` is the "In short" summary at the end.
export const GUIDES = [
  {
    id: 'g1',
    cat: 'Talking & consent',
    title: 'Asking for what you want, out loud',
    mins: 5,
    art: require('../assets/guides/g1.jpg'), // scripts/generate-cartoons.mjs --guide g1, option 1
    artLabel: 'Illustration: Blaze and Volt, both masked, talking on a couch with a heart speech bubble between them',
    lead: 'Most people would rather guess than ask. Guessing is how you end up with a night that was fine instead of a night you keep thinking about. Saying what you want is a skill, and like any skill it gets easier the more you use it.',
    blocks: [
      { h: 'Why it feels so awkward' },
      { p: 'We grow up learning that good sex just happens: two people read each other’s minds and everything clicks. In real life nobody can read minds, and the people who seem effortless in bed are usually just the ones who talk. They ask, they say what they like, and they make it sound easy.' },
      { p: 'The awkwardness mostly comes from fear of rejection. If you say “I’d love it if…” and the answer is no, it can feel like they’re saying no to you. They aren’t. A no to one thing is information, not a verdict.' },
      { h: 'Start with what you like' },
      { p: 'Leading with a yes is softer than leading with a list of rules. Compare “Don’t be too rough” with “I love it slow at first.” Same message, but one sounds like a warning and the other sounds like an invitation.' },
      { say: ['I love it when you…', 'Can we try…? I’ve been thinking about it all day.', 'That thing you did earlier: more of that.'] },
      { tip: 'Bring it up before things get heated. Over drinks or in the chat is easier than in the moment, and it builds anticipation too.' },
      { h: 'Check in without killing the mood' },
      { p: 'Checking in doesn’t have to be a formal interview. Short questions work best, said with a smile, and they show you care about how the other person is doing. That’s attractive, not awkward.' },
      { say: ['This good?', 'Want more?', 'Faster or slower?', 'Still with me?'] },
      { p: 'Listen to the answer, and to the body too. A clear, happy yes is what you’re looking for. Silence, hesitation or a stiff “I guess” is not a yes. When in doubt, pause and ask.' },
      { quote: 'Consent isn’t a box you tick once. It’s a conversation that keeps going all night.' },
      { h: 'Hearing no (and saying it)' },
      { p: 'Anyone can stop at any moment, for any reason, without explaining. That goes for you too. If you want to stop, “Let’s pause” is enough. If they want to stop, thank them for saying so. That reaction is what makes people feel safe with you, and it’s what makes them want to see you again.' },
      { list: ['Stopping is always allowed, even halfway.', 'A yes to one thing is not a yes to everything.', 'Changing your mind is normal, not rude.'] },
      { h: 'Use the app to do the hard part' },
      { p: 'Your yes / maybe / no boundaries and your wishlist already said a lot before you met. Matches only see wishlist items you both added, so there’s no awkward reveal: if it shows up, you both want it. Use that as an easy opener.' },
    ],
    body: [
      'Lead with what you like: “I love it when…” lands softer than a list of rules.',
      'Check in with short questions. Look for a clear, happy yes.',
      'Anyone can stop at any moment, without a reason.',
    ],
  },
  {
    id: 'g2',
    cat: 'Sexual health',
    title: 'Getting tested without the awkwardness',
    mins: 5,
    lead: 'Getting tested is one of the most attractive things you can do. It says you take care of yourself and the people you meet. And it’s a lot less awkward than most people think: a few questions, a quick swab or blood test, done.',
    blocks: [
      { h: 'How often should you go?' },
      { p: 'If you meet new people regularly, many clinics suggest a check every three to six months. If you’re having sex less often, once a year is a good habit. Always go sooner if you have symptoms, if a partner tells you they tested positive, or after a condom broke or wasn’t used.' },
      { tip: 'Put a recurring reminder in your calendar. It turns testing into a routine, like going to the dentist, instead of a big decision.' },
      { h: 'Where to go' },
      {
        list: [
          'Sexual health clinics: often free or low-cost, and they see this all day. In the Netherlands that’s the GGD, with free tests for many groups.',
          'Your GP: can test you and refer you if needed.',
          'Home kits: order online, take the sample at home, post it back. Handy, but check the provider is certified.',
        ],
      },
      { h: 'What actually happens' },
      { p: 'You’ll get a few questions about your recent partners and what you did. Nobody is judging you; the answers decide which tests make sense. Then it’s usually a urine sample or swab, plus a small blood sample for things like HIV and syphilis. Results tend to come back within a week.' },
      { p: 'Some infections take a while to show up in a test, so a test the morning after won’t tell you about last night. If you’re worried about a specific moment, ask the clinic when to test. They’ll tell you the right timing.' },
      { quote: 'Testing isn’t about being worried. It’s about knowing.' },
      { h: 'Talking about it with a match' },
      { p: 'It doesn’t have to be a big talk. Saying when you last tested, and asking the same, is normal here. Most people find it a relief when someone else brings it up first.' },
      { say: ['I got tested last month, all clear. You?', 'I like to know where we both stand. When did you last get tested?'] },
      { h: 'And if something comes back positive' },
      { p: 'Most STIs are common and treatable. Take the treatment, follow the clinic’s advice, and let recent partners know so they can get checked too. Clinics can often notify them anonymously if that feels easier. It’s the decent thing to do, and nobody here will think less of you for it.' },
      { tip: 'Add the month of your last test to your profile. Only the month shows, never your results.' },
    ],
    body: [
      'Every three to six months if you meet new people regularly, at least once a year otherwise.',
      'Clinics, your GP or a certified home kit all work. It’s quick and private.',
      'Share the month you were tested on your profile. Results stay private.',
    ],
  },
  {
    id: 'g3',
    cat: 'Aftercare',
    title: 'Aftercare: the part people forget',
    mins: 4,
    lead: 'What happens after sex says a lot about how it felt. A few minutes of care turns a good night into one you both feel good about tomorrow. It isn’t only for couples or for kink. It’s for anyone who wants the other person to leave feeling respected.',
    blocks: [
      { h: 'What aftercare is' },
      { p: 'Aftercare is simply looking after each other once things wind down. Bodies and emotions can feel a lot more intense afterwards than people expect, especially with someone new. A little warmth helps you both land.' },
      { h: 'The basics' },
      { list: ['A glass of water, and something small to eat.', 'A blanket, or a shower if they want one.', 'Five minutes of lying close, if you both like that.', 'A quick check: “How are you feeling?”'] },
      { tip: 'Ask, don’t assume. Some people want cuddles, others want space. Both are fine.' },
      { h: 'Talk about it' },
      { p: 'Saying what you liked is kind and useful. It tells the other person they did well and what to do again. Ask what they liked too, and listen.' },
      { say: ['That was really good. I loved it when you…', 'How are you feeling?', 'Anything you’d want different next time?'] },
      { h: 'The next day' },
      { p: 'A short message the next day goes a long way, even if it was a one-time thing. “Thanks for last night, hope your day is good” costs ten seconds and leaves a great impression. Silence after intimacy can make people feel used, even when you didn’t mean it that way.' },
      { quote: 'Being kind afterwards is part of being good in bed.' },
      { h: 'If something felt off' },
      { p: 'Sometimes a moment didn’t feel right, for you or for them. Bring it up gently and without blame. If anything happened that felt unsafe, you can always talk to our team through Support, and Ward is there for the serious stuff.' },
    ],
    body: [
      'Water, a blanket and a few minutes of talking go a long way.',
      'Ask how they feel, and say how you feel.',
      'A quick message the next day is kind, even after a one-time thing.',
    ],
  },
  {
    id: 'g4',
    cat: 'First meet',
    title: 'A safe and fun first meet',
    mins: 4,
    lead: 'The first meet is where chat turns real. A little planning makes it safer, and it makes it more fun too, because you can relax and actually enjoy yourself.',
    blocks: [
      { h: 'Meet somewhere public first' },
      { p: 'A bar, a café, a busy terrace: somewhere with people around, where you can leave easily. Even if you both know where the night is heading, a drink first lets you check the vibe in person. Chemistry in the chat doesn’t always carry over, and that’s fine.' },
      { tip: 'Get there on your own. Having your own way home means you can always leave when you want.' },
      { h: 'Tell a friend' },
      { p: 'Share your plan with a friend in the app: who, where and when. Set a check-in time. If you don’t tap “I’m good” by then, your friend gets a message. Most nights you’ll forget it was even there, and that’s the point.' },
      { h: 'Talk before you go anywhere' },
      { p: 'Before heading somewhere private, have a quick chat about what you’re both up for. Your boundaries in the app are a great starting point. It doesn’t need to be serious: keep it light and flirty, as long as it’s clear.' },
      { say: ['So, what are you hoping for tonight?', 'Just so you know, I’m into…, but not…', 'Your place or mine? Or another drink first?'] },
      { h: 'Trust your gut' },
      { p: 'If something feels off, it’s okay to leave, at any point, without a reason. “I’m going to head home” is a full sentence. Anyone who makes that hard is showing you exactly why you were right to go.' },
      { list: ['Keep an eye on your drink.', 'Keep your phone charged.', 'Leaving early is always fine.'] },
      { quote: 'Safe and sexy aren’t opposites. Feeling safe is what lets you let go.' },
      { h: 'After the meet' },
      { p: 'Tap “I’m good” when you’re home. Afterwards the app asks how it went. Your check-in keeps the community honest, and positive check-ins help you both earn your glow-up frames.' },
    ],
    body: [
      'Meet somewhere public first, and share your plan with a friend in the app.',
      'Set a check-in time. If you don’t tap “I’m good”, your friend is told.',
      'Trust your gut. Leaving early is always fine.',
    ],
  },
];

export const IDEAS = [
  {
    id: 'i1',
    title: 'Voice intro on profiles',
    desc: 'Ten seconds of someone’s voice says more than any bio.',
    by: 'velvet_fox',
    cat: 'New features',
    status: 'Planned',
    score: 142,
    reply: 'Building it now, aiming for January.',
  },
  { id: 'i2', title: 'Couples: one profile, two logins', desc: 'So we can both chat and plan without sharing a phone.', by: 'Anonymous', cat: 'Profiles', status: 'Open', score: 97 },
  {
    id: 'i3',
    title: 'Show exact distance',
    desc: '“About 2 km” is too vague when I’m out.',
    by: 'Anonymous',
    cat: 'Discover',
    status: 'Not planned',
    score: -12,
    reply: 'Rounding protects everyone’s location, so this stays.',
  },
];

export const personById = (id) => PEOPLE.find((p) => p.id === id);

// Optional profile details, shown as an icon grid on someone's page. multi: pick several.
export const DETAILS = [
  { key: 'orientation', label: 'Orientation', icon: 'orient', options: ['Straight', 'Gay', 'Lesbian', 'Bisexual', 'Pansexual', 'Queer', 'Curious'] },
  { key: 'relationship', label: 'Relationship', icon: 'link', options: ['Single', 'Open relationship', 'Partnered, ethically', 'Couple', 'It’s complicated'] },
  { key: 'pronouns', label: 'Pronouns', icon: 'user', options: ['she/her', 'he/him', 'they/them', 'she/they', 'he/they'] },
  { key: 'height', label: 'Height', icon: 'ruler', options: ['Under 160 cm', '160–169 cm', '170–179 cm', '180–189 cm', '190 cm +'] },
  { key: 'hosting', label: 'Hosting', icon: 'home', options: ['I can host', 'I can’t host', 'Sometimes', 'Hotel person'] },
  { key: 'when', label: 'Usually free', icon: 'clock', options: ['Weeknights', 'Weekends', 'Late nights', 'Daytime', 'Spontaneous'], multi: true },
  { key: 'drinking', label: 'Drinking', icon: 'glass', options: ['Socially', 'Rarely', 'Never', 'Wine o’clock'] },
  { key: 'smoking', label: 'Smoking', icon: 'smoke', options: ['Never', 'Socially', 'Yes', '420 friendly'] },
  { key: 'languages', label: 'Languages', icon: 'lang', options: ['English', 'Dutch', 'German', 'French', 'Spanish', 'Arabic', 'Turkish', 'Portuguese', 'Italian'], multi: true },
  { key: 'sign', label: 'Star sign', icon: 'star', options: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'] },
];

// Extra prompts people can answer (up to 3), shown as cards between the photos.
export const PROMPTS = [
  'Green flags',
  'A turn-off for me',
  'Ask me about',
  'The way to win me over',
  'My most spontaneous moment',
  'After a date, I like to',
  'A secret talent',
  'I’ll know it’s a match when',
];
