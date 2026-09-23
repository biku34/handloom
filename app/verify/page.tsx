import SiteHeader from "@/components/SiteHeader";
import VerifyForm from "@/components/VerifyForm";

export default function VerifyEntryPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="font-display text-3xl font-bold text-maroon-900 text-center">Verify a tag</h1>
        <p className="mt-3 text-center text-sm text-stone-600">
          Scan the QR code with your phone camera, or type the code printed below it.
        </p>
        <VerifyForm />
        <p className="mt-6 text-center text-xs text-stone-400">
          No app. No account. Verification is free and anonymous.
        </p>
      </main>
    </div>
  );
}
