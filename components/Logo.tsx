/**
 * SUTRA brand mark — a single gold thread drawn as an "S", finished with a
 * needle eye. Built from plain paths (no font dependency) so it stays crisp
 * from a 16px favicon up to a home-screen icon.
 */
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#40101a" />
      <path
        d="M44.5 19.5C41 14 23 13 22.5 23.5 22 32.5 42 30.5 42 41.5 42 51.5 24 52 19.5 45"
        fill="none"
        stroke="#e5c383"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle cx="44.5" cy="19.5" r="2" fill="#40101a" />
    </svg>
  );
}

export default function Logo({ tagline = false, light = true }: { tagline?: boolean; light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark className="h-9 w-9 shrink-0 rounded-[10px] ring-1 ring-silk-300/40" />
      <span className="flex flex-col leading-none">
        <span className={`font-display text-[22px] font-bold tracking-[0.12em] ${light ? "text-silk-100" : "text-maroon-900"}`}>SUTRA</span>
        {tagline && (
          <span className={`mt-1 text-[10px] font-medium tracking-wide ${light ? "text-silk-300/80" : "text-silk-700"}`}>
            Verified handloom
          </span>
        )}
      </span>
    </span>
  );
}
