import { Suspense } from "react";
import SiteHeader from "@/components/SiteHeader";
import ReportForm from "@/components/ReportForm";

export default function ReportPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="font-display text-3xl font-bold text-maroon-900 text-center">Report a suspicious item</h1>
        <p className="mt-3 text-center text-sm text-stone-600">
          Counterfeits steal from weavers. Your report goes straight to the investigation queue — no account needed.
        </p>
        <div className="mt-8">
          <Suspense fallback={null}>
            <ReportForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
