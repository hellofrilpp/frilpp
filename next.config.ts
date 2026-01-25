import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      // Ensure the marketing SPA shell is always revalidated so mobile clients don't get stuck
      // on a stale `public/site/index.html` that points to old hashed assets.
      {
        source: "/site/index.html",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source:
          "/:path((?!api|_next|site|legal(?:/|$)|r(?:/|$)|o(?:/|$)|sitemap\\.xml$).*)",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/favicon.ico", destination: "/site/favicon.ico" },
        { source: "/robots.txt", destination: "/site/robots.txt" },
        { source: "/placeholder.svg", destination: "/site/placeholder.svg" },
          {
            source:
              "/:path((?!api|_next|site|legal(?:/|$)|auth/callback(?:/|$)|verify-email(?:/|$)|r(?:/|$)|o(?:/|$)|sitemap\\.xml$|brand/auth(?:/|$)|brand/login(?:/|$)|brand/signup(?:/|$)|brand/dashboard(?:/|$)|brand/campaigns(?:/|$)|brand/pipeline(?:/|$)|influencer/auth(?:/|$)|influencer/login(?:/|$)|influencer/signup(?:/|$)|onboarding(?:/|$)|.*\\.txt$).*)",
            destination: "/site/index.html",
          },
      ],
    };
  },
};

export default nextConfig;
