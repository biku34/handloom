import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import SiteHeader, { portalHome } from "@/components/SiteHeader";
import { LogoMark } from "@/components/Logo";
import LoginForm from "@/components/LoginForm";
import { getSession } from "@/lib/auth";

export default async function LoginPage() {
  // Already signed in → don't show the login form again; send them home.
  const session = await getSession();
  if (session) {
    const home = portalHome(session.role);
    redirect(home !== "/" ? home : "/purchases");
  }

  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-8 sm:py-12">
        <div className="text-center">
          <LogoMark className="mx-auto h-14 w-14 rounded-2xl shadow-md" />
          <h1 className="font-display mt-4 text-3xl font-bold text-maroon-900">Welcome back</h1>
          <p className="mt-1.5 text-sm text-stone-600">Sign in for weavers, cooperatives, verifiers and admins.</p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <div className="mt-6 rounded-2xl bg-silk-100/70 p-4 text-center">
          <p className="text-sm font-semibold text-maroon-900">Just shopping?</p>
          <p className="mt-0.5 text-xs text-stone-600">You don&apos;t need an account to browse, scan or find your purchases.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href="/explore" className="btn-secondary">Browse the shop</Link>
            <Link href="/verify" className="btn-secondary">Scan a tag</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
