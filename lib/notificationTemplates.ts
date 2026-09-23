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
    title: "Your closet misses you 💌",
    body: "It's craving something handwoven. Shall we matchmake?",
    url: "/explore",
  },
  {
    id: "six-yards",
    label: "Six yards of yes",
    emoji: "😍",
    title: "Six yards, eyes on you 😍",
    body: "A new handwoven saree just dropped. Rare — like you.",
    url: "/explore",
  },
  {
    id: "weekend-drape",
    label: "Weekend drape",
    emoji: "🧣",
    title: "Go get draped 🧣",
    body: "New handloom stoles, already flirting with your neckline.",
    url: "/explore",
  },
  {
    id: "festive-drop",
    label: "Festive drop",
    emoji: "🪔",
    title: "Dressed to impress 🪔",
    body: "Handwoven to turn heads — starting with yours.",
    url: "/explore",
  },
  {
    id: "meet-the-maker",
    label: "Meet the maker",
    emoji: "❤️",
    title: "Meet your next crush ❤️",
    body: "Three weeks of heart in every thread. Come get swept away.",
    url: "/explore",
  },
  {
    id: "restock",
    label: "Back in stock",
    emoji: "😏",
    title: "It came back. For you 😏",
    body: "The one you've been eyeing is done playing hard to get. Your move.",
    url: "/explore",
  },
  {
    id: "monsoon-mood",
    label: "Monsoon mood",
    emoji: "🌧️",
    title: "Rainy day, warm drape, you 🌧️",
    body: "Handwoven cotton that wants to wrap around you all evening.",
    url: "/explore",
  },
  {
    id: "verify-love",
    label: "Verify your love",
    emoji: "🔍",
    title: "Is it the real deal? 🔍",
    body: "Scan the tag, meet its maker. Authenticity looks good on you.",
    url: "/purchases",
  },
];

export function findTemplate(id: string): NotifTemplate | undefined {
  return NOTIF_TEMPLATES.find((t) => t.id === id);
}
