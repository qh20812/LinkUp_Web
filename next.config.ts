import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: process.env.FRONTEND_IP_URL ? [process.env.FRONTEND_IP_URL] : [],
  output: "standalone",
  experimental: {
    // The /api rewrite buffers request bodies before proxying them to the Go
    // server. The 10MB default silently rejected larger uploads (community
    // avatar/cover, post media) with an HTML 500, hiding the real error.
    proxyClientMaxBodySize: "120mb",
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.emojifyi.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "media.giphy.com",
      },
      {
        protocol: "https",
        hostname: "media0.giphy.com",
      },
      {
        protocol: "https",
        hostname: "media1.giphy.com",
      },
      {
        protocol: "https",
        hostname: "media2.giphy.com",
      },
      {
        protocol: "https",
        hostname: "media3.giphy.com",
      },
      {
        protocol: "https",
        hostname: "media4.giphy.com",
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
        source: "/health",
        destination: `http://${backendUrl}/health`,
      },
    ];
  },
};

export default nextConfig;
