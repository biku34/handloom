import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // The OS shows a native launch screen from the icon + name over
    // background_color. Keeping the name "SUTRA" and the background maroon makes
    // it identical to our in-app splash, so the two read as a single screen
    // (logo + SUTRA) that then flows into the app.
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
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
