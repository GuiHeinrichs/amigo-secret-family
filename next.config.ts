import type { NextConfig } from "next";

const privateHeaders = [
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  // Os testes ponta a ponta sobem um segundo servidor de desenvolvimento; uma
  // pasta de saída própria deixa os dois conviverem.
  distDir: process.env.NEXT_DIST_DIR?.trim() || ".next",
  cacheComponents: true,
  partialPrefetching: true,
  // Postgres drivers ship native/WASM bits that must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/g/:path*", headers: privateHeaders },
      { source: "/k/:path*", headers: privateHeaders },
      { source: "/api/:path*", headers: privateHeaders },
    ];
  },
};

export default nextConfig;
