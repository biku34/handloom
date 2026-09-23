/* Pre-written, witty campaign notifications — Zomato-style copy, tuned for a
   handloom cooperative. The composer lets an officer pick one and tweak it,
   or write a fully custom one. `emoji` is only for the picker UI. */

export type NotifTemplate = {
  id: string;
  label: string; // shown on the template card
  emoji: string;
  title: string;
  body: string;
  url?: string;
};

export const NOTIF_TEMPLATES: NotifTemplate[] = [
  {
    id: "closet-called",
    label: "Your closet called",
    emoji: "📞",
    title: "Your closet just called 📞",
    body: "It said it's tired of fast fashion and wants something handwoven. We may know a weaver or two.",
    url: "/explore",
  },
  {
    id: "six-yards",
    label: "Six yards of yes",
    emoji: "✨",
    title: "Six yards of 'treat yourself' ✨",
    body: "A new handwoven saree just dropped. No two threads alike — kind of like you.",
    url: "/explore",
  },
  {
    id: "weekend-drape",
    label: "Weekend drape",
    emoji: "🧣",
    title: "It's the weekend, go drape yourself 🧣",
    body: "Fresh handloom stoles just landed. Warning: compliments incoming.",
    url: "/explore",
  },
  {
    id: "festive-drop",
    label: "Festive drop",
    emoji: "🪔",
    title: "The festive collection is here 🪔",
    body: "Handwoven for the season. Your relatives will ask where you got it. Be humble about it.",
    url: "/explore",
  },
  {
    id: "meet-the-maker",
    label: "Meet the maker",
    emoji: "🧑‍🎨",
    title: "Someone spent 3 weeks on this ❤️",
    body: "Meet the weaver behind your next favourite piece. Every thread has a story — come read it.",
    url: "/explore",
  },
  {
    id: "restock",
    label: "Back in stock",
    emoji: "🔁",
    title: "It's back. Don't fumble it this time 🔁",
    body: "The piece you've been eyeing is woven and ready. This is your sign.",
    url: "/explore",
  },
  {
    id: "monsoon-mood",
    label: "Monsoon mood",
    emoji: "🌧️",
    title: "Rainy day, cosy drape 🌧️",
    body: "Handwoven cotton that feels like a hug. Chai not included, sadly.",
    url: "/explore",
  },
  {
    id: "verify-love",
    label: "Verify your love",
    emoji: "🔍",
    title: "Is your saree the real deal? 🔍",
    body: "Scan its tag and meet the hands that made it. Authenticity looks good on you.",
    url: "/purchases",
  },
];

export function findTemplate(id: string): NotifTemplate | undefined {
  return NOTIF_TEMPLATES.find((t) => t.id === id);
}
