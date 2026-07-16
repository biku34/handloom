/** Branded loading state — a loom of shimmering threads. */
export default function LoadingWeave({ label = "Weaving the page…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-28 gap-5">
      <div className="flex items-end gap-1.5 h-10" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <span
            key={i}
            className="w-1.5 rounded-full bg-maroon-600/70"
            style={{
              height: "100%",
              animation: `threadPulse 1.1s ${i * 0.12}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-silk-700">{label}</p>
      <style>{`@keyframes threadPulse { 0%,100% { transform: scaleY(0.35); opacity:.45 } 50% { transform: scaleY(1); opacity:1 } }`}</style>
    </div>
  );
}
