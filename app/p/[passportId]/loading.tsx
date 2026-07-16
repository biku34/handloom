/** Instant skeleton for the verify page (FR-F1 — the render must never feel stalled). */
export default function Loading() {
  return (
    <main className="mx-auto max-w-md px-4 py-6 pb-16">
      <div className="skeleton h-32 w-full" />
      <div className="skeleton mt-5 aspect-[4/3] w-full" />
      <div className="skeleton mt-4 h-7 w-2/3" />
      <div className="skeleton mt-2 h-4 w-1/2" />
      <div className="skeleton mt-5 h-16 w-full rounded-2xl" />
      <div className="skeleton mt-5 aspect-square w-full" />
      <div className="mt-5 space-y-2.5">
        <div className="skeleton h-14 w-full" />
        <div className="skeleton h-14 w-full" />
        <div className="skeleton h-14 w-full" />
      </div>
    </main>
  );
}
