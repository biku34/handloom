import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // Launch: Android paints its native launch screen from the largest "any"
    // icon over background_color. That icon (launch-512.png) is plain maroon, so
    // the native screen is an empty maroon field and the first thing the user
    // sees is our in-app SUTRA splash — no S logo on launch. The home-screen
    // icon comes from the maskable S mark; the 192 "any" S serves small UI.
    // (No SVG "any" icon: Chrome may prefer it for the launch screen.)
    name: "SUTRA",
    short_name: "SUTRA",
    description: "Scan a tag, meet the weaver, verify the craft.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#40101a",
    theme_color: "#40101a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/launch-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
