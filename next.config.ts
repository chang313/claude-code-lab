import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/map",
        destination: "/search",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
