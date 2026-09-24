import SiteHeader from "@/components/SiteHeader";
import JourneyExplorer from "./JourneyExplorer";

export const metadata = {
  title: "How it works",
  description: "Follow one handloom saree from the loom to its buyer — verification, Digital Passport, hash-chained ledger and blockchain anchoring.",
};

export default function HowItWorksPage() {
  return (
    <div>
      <SiteHeader />
      <main>
        <section className="bg-maroon-900 text-silk-100">
          <div className="mx-auto max-w-6xl px-4 pt-10 pb-20 md:pt-14 md:pb-24 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-silk-300">How SUTRA works</p>
            <h1 className="font-display mt-3 text-3xl sm:text-5xl font-bold leading-tight">
              Follow one saree from <span className="text-silk-300">loom</span> to <span className="text-silk-300">buyer</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-[15px] sm:text-lg text-silk-100/80">
              Eight steps, four people, one unbroken thread — verified by a human, sealed in a hash-chained ledger and anchored on Polygon.
            </p>
          </div>
        </section>
        <JourneyExplorer />
      </main>
      <footer className="bg-maroon-900 text-silk-100/70 text-center text-xs py-6">SUTRA · every thread has a story</footer>
    </div>
  );
}
