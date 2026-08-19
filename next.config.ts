import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
    remotePatterns: [
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
