import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source:
          "/:path((?!api|_next|site|legal(?:/|$)|r(?:/|$)|o(?:/|$)|sitemap\\.xml$).*)",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
