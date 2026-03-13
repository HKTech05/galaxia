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
    ],
  },
  async rewrites() {
    // Determine the backend base URL (remove trailing /api if present, as path* already contains it)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://3.108.193.168:4000/api";
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
