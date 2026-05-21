import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ hostname: "cdn.nba.com" }],
  },
};

export default nextConfig;
