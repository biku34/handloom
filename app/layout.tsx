import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import SplashScreen from "@/components/SplashScreen";
import InstallPrompt from "@/components/InstallPrompt";
import NotificationGate from "@/components/NotificationGate";

export const metadata: Metadata = {
  title: { default: "SUTRA — Every thread has a story", template: "%s · SUTRA" },
  description:
    "SUTRA issues a Digital Product Passport for genuine Indian handloom — scan the tag, meet the weaver, verify the craft.",
  applicationName: "SUTRA",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    // iOS ignores SVG touch icons — it needs a PNG.
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  // Installs cleanly as a home-screen / desktop app (standalone, no browser chrome).
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "SUTRA" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // fills the notch/safe-area on installed apps
  themeColor: "#40101a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning tolerates attribute differences that browser
    // extensions (Grammarly, password managers, etc.) inject into <html>/<body>
    // before React hydrates. It only affects these two elements' own attributes —
    // it does NOT hide genuine hydration bugs inside the app's components.
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        {/* Capture the install event before Chrome shows its own mini-infobar,
            and suppress that infobar (preventDefault) so OUR button/banner is
            the only install entry point and always holds the deferred prompt.
            beforeInteractive is hoisted early and only adds window listeners
            (no DOM changes), so it doesn't affect hydration. */}
        <Script id="pwa-install-capture" strategy="beforeInteractive">{`
          (function(){
            try{
              window.__sutraBIP = window.__sutraBIP || null;
              window.addEventListener('beforeinstallprompt', function(e){
                e.preventDefault();
                window.__sutraBIP = e;
                try { window.dispatchEvent(new Event('sutra-bip')); } catch(_){}
              });
              window.addEventListener('appinstalled', function(){
                window.__sutraBIP = null;
                try { window.dispatchEvent(new Event('sutra-installed')); } catch(_){}
              });
            }catch(_){}
          })();
        `}</Script>
        <SplashScreen />
        <div className="weave-border" />
        {children}
        <InstallPrompt />
        <NotificationGate />
      </body>
    </html>
  );
}
