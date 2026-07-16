import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SUTRA — Every thread has a story", template: "%s · SUTRA" },
  description:
    "SUTRA issues a Digital Product Passport for genuine Indian handloom — scan the tag, meet the weaver, verify the craft.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <div className="weave-border" />
        {children}
      </body>
    </html>
  );
}
