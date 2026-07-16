import SiteHeader from "@/components/SiteHeader";
import PurchaseSearch from "./PurchaseSearch";

export const metadata = { title: "My purchases" };

export default function PurchasesPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-silk-700">Your collection</p>
        <h1 className="font-display mt-2 text-3xl font-bold text-maroon-900 text-center">My purchases</h1>
        <p className="mx-auto mt-3 max-w-md text-center text-sm text-stone-600">
          Enter the phone number you used when claiming your pieces to see everything you own and open each one&apos;s full story.
        </p>
        <div className="mt-8">
          <PurchaseSearch />
        </div>
        <p className="mt-8 text-center text-xs text-stone-400">
          No account needed. Only items claimed with your number are shown.
        </p>
      </main>
    </div>
  );
}
