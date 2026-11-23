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

export const BOUNDARIES = [
  'Meet for a drink first',
  'Host at my place',
  'Go to theirs',
  'Stay the night',
  'Couples & threesomes',
  'Kink-friendly',
  'Protection, always',
];

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
    messages: [
      { me: true, text: 'Drink at Bar Mona, 21:30?' },
      { plan: true },
      { me: false, text: 'Yes! I’ll grab a seat at the bar' },
      { me: true, text: 'Black jacket. Can’t miss me.' },
    ],
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

export const GUIDES = [
  { id: 'g1', cat: 'Talking & consent', title: 'Asking for what you want, out loud', mins: 4, body: ['Say what you want before what you don’t: “I love it when…” lands softer than a list of rules.', 'Check in with simple questions: “This good?” “More?” A yes should be clear and enthusiastic.', 'Consent can change at any moment. Stopping is always allowed, and never needs a reason.'] },
  { id: 'g2', cat: 'Sexual health', title: 'Getting tested without the awkwardness', mins: 3, body: ['Most clinics offer free or cheap STI tests; many cities also have walk-in or home-kit options.', 'Every three months is a good rhythm if you meet new people regularly.', 'Share the month you were tested on your profile. Results stay private.'] },
  { id: 'g3', cat: 'Aftercare', title: 'Aftercare: the part people forget', mins: 3, body: ['A glass of water, a blanket and five minutes of talking go a long way.', 'Ask how they feel, and say how you feel.', 'A quick message the next day is kind, even if it was a one-time thing.'] },
  { id: 'g4', cat: 'First meet', title: 'A safe and fun first meet', mins: 4, body: ['Meet somewhere public first. Share your plan with a friend in the app.', 'Set a check-in time. If you don’t tap “I’m good”, your friend is told.', 'Trust your gut. Leaving early is always fine.'] },
];

export const IDEAS = [
  { id: 'i1', title: 'Voice intro on profiles', desc: 'Ten seconds of someone’s voice says more than any bio.', by: 'velvet_fox', cat: 'New features', status: 'Planned', score: 142, reply: 'Building it now, aiming for January.' },
  { id: 'i2', title: 'Couples: one profile, two logins', desc: 'So we can both chat and plan without sharing a phone.', by: 'Anonymous', cat: 'Profiles', status: 'Open', score: 97 },
  { id: 'i3', title: 'Show exact distance', desc: '“About 2 km” is too vague when I’m out.', by: 'Anonymous', cat: 'Discover', status: 'Not planned', score: -12, reply: 'Rounding protects everyone’s location, so this stays.' },
];

export const personById = (id) => PEOPLE.find((p) => p.id === id);
