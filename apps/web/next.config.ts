import path from 'node:path';
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
  async redirects() {
    return [
      ...["about", "briefs", "candidates", "coverage", "login", "watchlists"].map((route) => ({
        source: `/${route}`,
        destination: "/",
        permanent: false,
      })),
      { source: "/companies", destination: "/", permanent: false },
      { source: "/companies/:path*", destination: "/", permanent: false },
      { source: "/divergences/:path*", destination: "/", permanent: false },
    ];
  },
};
export default nextConfig;
