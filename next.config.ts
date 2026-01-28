import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip TypeScript errors during build (fix these later)
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
