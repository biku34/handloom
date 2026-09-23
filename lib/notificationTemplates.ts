/* Pre-written, flirty campaign notifications — Zomato-style copy with a wink,
   tuned for a handloom cooperative. The composer lets an officer pick one and
   tweak it, or write a fully custom one. `emoji` is only for the picker UI. */

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
    emoji: "💌",
    title: "Your closet's been thinking about you 💌",
    body: "It confessed it's bored of fast fashion and craving something handwoven. Want us to play matchmaker?",
    url: "/explore",
  },
  {
    id: "six-yards",
    label: "Six yards of yes",
    emoji: "😍",
    title: "Six yards, and it only has eyes for you 😍",
    body: "A new handwoven saree just slipped into the collection. No two threads alike — rare, just like whoever's reading this.",
    url: "/explore",
  },
  {
    id: "weekend-drape",
    label: "Weekend drape",
    emoji: "🧣",
    title: "It's the weekend — go get draped 🧣",
    body: "Fresh handloom stoles just landed and they're already flirting with your neckline. Compliments? Practically guaranteed.",
    url: "/explore",
  },
  {
    id: "festive-drop",
    label: "Festive drop",
    emoji: "🪔",
    title: "The festive collection is dressed to impress 🪔",
    body: "Handwoven to turn heads — starting with yours. When they ask where you got it, feel free to play coy.",
    url: "/explore",
  },
  {
    id: "meet-the-maker",
    label: "Meet the maker",
    emoji: "❤️",
    title: "Someone poured three weeks of heart into this ❤️",
    body: "Meet the weaver behind your next crush. Every thread has a story — come let it sweep you off your feet.",
    url: "/explore",
  },
  {
    id: "restock",
    label: "Back in stock",
    emoji: "😏",
    title: "It came back. For you 😏",
    body: "The piece you've been eyeing is woven, ready, and done playing hard to get. Your move.",
    url: "/explore",
  },
  {
    id: "monsoon-mood",
    label: "Monsoon mood",
    emoji: "🌧️",
    title: "Rainy day, warm drape, and you 🌧️",
    body: "Handwoven cotton that wants to wrap around you all evening. Chai optional, cosy guaranteed.",
    url: "/explore",
  },
  {
    id: "verify-love",
    label: "Verify your love",
    emoji: "🔍",
    title: "Is it the real deal — like the way you look in it? 🔍",
    body: "Scan its tag and meet the hands that made it. Authenticity is a very good look on you.",
    url: "/purchases",
  },
];

export function findTemplate(id: string): NotifTemplate | undefined {
  return NOTIF_TEMPLATES.find((t) => t.id === id);
}
