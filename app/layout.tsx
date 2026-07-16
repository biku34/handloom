import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SUTRA — Every thread has a story", template: "%s · SUTRA" },
  description:
    "SUTRA issues a Digital Product Passport for genuine Indian handloom — scan the tag, meet the weaver, verify the craft.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning tolerates attribute differences that browser
    // extensions (Grammarly, password managers, etc.) inject into <html>/<body>
    // before React hydrates. It only affects these two elements' own attributes —
    // it does NOT hide genuine hydration bugs inside the app's components.
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <div className="weave-border" />
        {children}
      </body>
    </html>
  );
}
