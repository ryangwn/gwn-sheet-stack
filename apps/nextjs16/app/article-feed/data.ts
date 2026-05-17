export type Article = {
  id: string;
  title: string;
  author: string;
  minutes: number;
  excerpt: string;
  body: string;
  bullets: string[];
  related: string[];
  category: string;
  accent: string;
  cover: string;
};

export const ARTICLES: Article[] = [
  {
    id: 'a1',
    title: 'The Quiet Web',
    author: 'Maya Chen',
    minutes: 6,
    excerpt: 'Why the best parts of the internet are the ones nobody is shouting about.',
    body: 'There is a kind of website that does not ask for your attention. It loads instantly, reads cleanly, and leaves you alone. The quiet web is small, personal, and stubbornly text-first — a counter-current to feeds tuned for outrage.\n\nIt rewards the patient. You find it through footnotes, mailing lists, and friends who still send links. Nothing about it scales, which is precisely the point.',
    bullets: [
      'Quiet sites optimize for reader trust, not retention metrics.',
      'Personal blogs and digital gardens are growing again.',
      'Calm design is a competitive advantage in 2026.',
    ],
    related: ['a2', 'a3'],
    category: 'Essay',
    accent: '#c2410c',
    cover: 'linear-gradient(135deg, #fdba74 0%, #c2410c 100%)',
  },
  {
    id: 'a2',
    title: 'On Slow Software',
    author: 'Jordan Reed',
    minutes: 4,
    excerpt: 'Fast software respects your time. Slow software respects your attention.',
    body: 'Slow software is not lazy software. It is deliberate — taking the time to ask whether an interaction is needed, whether a notification deserves to interrupt, whether the user actually wants to be online right now.\n\nThe pause before a confirmation. The unread badge that does not exist. The screen that simply ends.',
    bullets: [
      'Latency is a feature, not just a bug to minimize.',
      'Interruptions cost more than the seconds they take.',
      'Defaults shape behavior more than settings ever will.',
    ],
    related: ['a1', 'a3'],
    category: 'Design',
    accent: '#0f766e',
    cover: 'linear-gradient(135deg, #5eead4 0%, #0f766e 100%)',
  },
  {
    id: 'a3',
    title: 'Sheets, Stacks, States',
    author: 'Kola Okafor',
    minutes: 9,
    excerpt: 'A field guide to modeling overlay UI as a finite-state stack.',
    body: 'Treat each overlay as a layer with a stable id and a phase. Treat the collection as an ordered stack. Suddenly bugs that used to be untestable race conditions become diagrams you can point at.\n\nThe trick is keeping animation out of the state machine. Phases say what is true; CSS and springs say how it looks.',
    bullets: [
      'Layers have phases; stacks have order.',
      'Animation belongs to the adapter, not the state machine.',
      'Focus restoration is a stack concern, not a component concern.',
    ],
    related: ['a1', 'a2'],
    category: 'Engineering',
    accent: '#4338ca',
    cover: 'linear-gradient(135deg, #a5b4fc 0%, #4338ca 100%)',
  },
  {
    id: 'a4',
    title: 'The Last Mile of Forms',
    author: 'Priya Raman',
    minutes: 5,
    excerpt: 'Validation is easy. Recovery is the hard part nobody designs for.',
    body: 'Most forms are tested on the happy path. A user types valid input, hits submit, sees a green check. The interesting work begins when the network drops mid-submit, when the back button takes you somewhere unexpected, when autofill conflicts with your masked input.\n\nThe last mile is recovery: preserving draft state, restoring focus to the offending field, telling the user what to do next in a sentence they actually read.',
    bullets: [
      'Drafts should survive accidental navigation.',
      'Error messages should name the next action, not the failure.',
      'Submit buttons should be idempotent under double-clicks.',
    ],
    related: ['a2', 'a5'],
    category: 'Design',
    accent: '#be185d',
    cover: 'linear-gradient(135deg, #f9a8d4 0%, #be185d 100%)',
  },
  {
    id: 'a5',
    title: 'Routing Is a User Interface',
    author: 'Theo Marquez',
    minutes: 7,
    excerpt: 'The URL is the most-used widget in your app. Treat it that way.',
    body: 'URLs are typed, shared, bookmarked, and screenshotted. They appear in support tickets and tweets. They are the only piece of UI that survives a full page reload, a tab restore, or a link from a coworker.\n\nDesigning routes is designing UI. Choose names users can read aloud. Avoid opaque ids when a slug will do. Make every important state addressable, and make every URL bring you back to the same place.',
    bullets: [
      'Every meaningful state deserves its own URL.',
      'Query params are state; path segments are identity.',
      'Back and forward should always do the obvious thing.',
    ],
    related: ['a3', 'a6'],
    category: 'Engineering',
    accent: '#0369a1',
    cover: 'linear-gradient(135deg, #7dd3fc 0%, #0369a1 100%)',
  },
  {
    id: 'a6',
    title: 'A Short Defense of Boring Stacks',
    author: 'Hana Lindqvist',
    minutes: 4,
    excerpt: 'The framework you already know is almost always the right choice.',
    body: 'There is a tax on novelty. New tools come with new bugs, new edges, new gaps in documentation, and new questions your team cannot answer at 3am. Boring stacks have paid that tax already.\n\nThis is not an argument against learning. It is an argument for spending your novelty budget on the parts of the system where novelty actually buys you something — and using the boring thing everywhere else.',
    bullets: [
      'Novelty is a budget; spend it where it matters.',
      'Boring tools have boring failure modes, which is the point.',
      'Documentation density beats feature count.',
    ],
    related: ['a5', 'a3'],
    category: 'Essay',
    accent: '#65a30d',
    cover: 'linear-gradient(135deg, #bef264 0%, #65a30d 100%)',
  },
  {
    id: 'a7',
    title: 'Animations That Mean Something',
    author: 'Yusuf Adesanya',
    minutes: 6,
    excerpt: 'Motion is a language. Most apps mumble.',
    body: 'A good animation tells you where something came from and where it went. A bad one just moves pixels. The difference is intent: is the motion communicating a relationship, or is it decoration glued on after the fact?\n\nThe best motion in software is the kind you stop noticing — because it matches what your hand and eye already expected to happen.',
    bullets: [
      'Motion should explain change, not announce it.',
      'Spring physics beats easing curves for most interactions.',
      'If you can remove an animation without losing meaning, remove it.',
    ],
    related: ['a2', 'a4'],
    category: 'Design',
    accent: '#7c3aed',
    cover: 'linear-gradient(135deg, #c4b5fd 0%, #7c3aed 100%)',
  },
];

export const articleById = (id: string) => ARTICLES.find((a) => a.id === id)!;
