import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "localhost:8080";
    return [
      {
        source: "/api/:path*",
        destination: `http://${backendUrl}/api/:path*`,
      },
      {
        source: "/ads-management/:path*",
        destination: `http://${backendUrl}/ads-management/:path*`,
      },
      {
        source: "/health",
        destination: `http://${backendUrl}/health`,
      },
    ];
  },
};

export default nextConfig;
