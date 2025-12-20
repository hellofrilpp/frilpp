import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/favicon.ico", destination: "/site/favicon.ico" },
      { source: "/robots.txt", destination: "/site/robots.txt" },
      { source: "/placeholder.svg", destination: "/site/placeholder.svg" },
      {
        source:
          "/((?!api|_next|site|legal|r|o|sitemap.xml).*)",
        destination: "/site/index.html",
      },
    ];
  },
};

export default nextConfig;
