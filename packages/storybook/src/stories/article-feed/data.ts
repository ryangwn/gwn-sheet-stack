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
];

export const articleById = (id: string) => ARTICLES.find((a) => a.id === id)!;
