import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  compiler: {
    // This removes all console.* calls in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
