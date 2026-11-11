import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Laço — amigo secreto",
    short_name: "Laço",
    description: "Amigo secreto no papelzinho: sorteio pelo link, conta sem senha.",
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    background_color: "#fffaf7",
    theme_color: "#c2183c",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
