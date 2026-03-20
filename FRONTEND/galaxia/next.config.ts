import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "galaxia-uploads.s3.eu-north-1.amazonaws.com",
      },
    ],
  },
  async rewrites() {
    // Determine the backend base URL (remove trailing /api if present, as path* already contains it)
    const apiUrl = "http://65.1.183.241:4000/api";
    // Proxy all /api/* requests to the external backend API
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl.replace(/\/$/, '')}/:path*`, 
      },
    ];
  },
};

export default nextConfig;
