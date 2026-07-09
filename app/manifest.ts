import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Notes",
    short_name: "Notes",
    description: "Quick personal notes.",
    start_url: "/",
    display: "standalone",
    background_color: "#4b5563",
    theme_color: "#4b5563",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    share_target: {
      action: "/shared",
      method: "GET",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    },
  };
}
