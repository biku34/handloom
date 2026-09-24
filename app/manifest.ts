import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // Launch: Android paints its native launch screen from the largest "any"
    // icon over background_color, then our in-app splash (SUTRA wordmark) takes
    // over — so the "any" 512 icon is the wordmark and both screens read as one
    // "SUTRA" screen. The home-screen icon comes from the maskable S mark.
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
      { src: "/splash-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
