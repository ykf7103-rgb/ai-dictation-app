import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pfst.cf2.poecdn.net" },
      { protocol: "https", hostname: "*.poecdn.net" },
    ],
  },
};

export default nextConfig;
