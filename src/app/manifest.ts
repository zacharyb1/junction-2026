import type { MetadataRoute } from "next";

/** Install the live chat as its own window. Cases and conversations stay on the server. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "AIDaddy",
    short_name: "AIDaddy",
    description: "Your family’s butler. Talk, research, and keep the next step in reach.",
    lang: "en",
    start_url: "/chat",
    scope: "/",
    display: "standalone",
    background_color: "#fffaf1",
    theme_color: "#fffaf1",
    icons: [
      { src: "/icons/app-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/app-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/app-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
