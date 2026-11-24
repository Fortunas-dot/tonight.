// How complete a profile is, like Tinder's "% complete", plus the most valuable next step.
const STEPS = [
  { id: 'photos', weight: 20, label: 'Add a second photo', done: (p) => (p.photos || []).length >= 2, partial: (p) => ((p.photos || []).length === 1 ? 12 : 0) },
  { id: 'verified', weight: 15, label: 'Verify with a selfie', done: (p) => !!p.verified },
  { id: 'bio', weight: 10, label: 'Write a description', done: (p) => (p.bio || '').trim().length >= 20 },
  { id: 'prompt', weight: 10, label: 'Describe your ideal night', done: (p) => (p.prompt || '').trim().length >= 10 },
  { id: 'place', weight: 10, label: 'Add your city', done: (p) => !!p.city && !!p.country },
  { id: 'intents', weight: 10, label: 'Say what you’re after', done: (p) => (p.intents || []).length > 0 },
  { id: 'boundaries', weight: 10, label: 'Answer your boundaries', done: (p) => Object.keys(p.boundaries || {}).length >= 4 },
  { id: 'turnOns', weight: 5, label: 'Pick 3 turn-ons', done: (p) => (p.turnOns || []).length >= 3 },
  { id: 'details', weight: 5, label: 'Add 4 details', done: (p) => Object.values(p.details || {}).filter((v) => (Array.isArray(v) ? v.length : v)).length >= 4 },
  { id: 'basics', weight: 5, label: 'Add your name and age', done: (p) => !!p.name && !!p.age },
];

/** { percent, next: { label, gain, id } | null } */
export function completeness(profile = {}) {
  let percent = 0;
  let next = null;
  for (const s of STEPS) {
    if (s.done(profile)) percent += s.weight;
    else {
      const part = s.partial ? s.partial(profile) : 0;
      percent += part;
      if (!next) next = { id: s.id, label: s.label, gain: s.weight - part };
    }
  }
  return { percent: Math.min(100, percent), next };
}
