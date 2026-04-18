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
        hostname: "galaxia-uploads.s3.ap-south-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "galaxia-uploads.s3.eu-north-1.amazonaws.com",
      },
    ],
  },
  async rewrites() {
    const apiUrl = "http://65.1.183.241:4000/api";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl.replace(/\/$/, '')}/:path*`, 
      },
      {
        // Proxy /bot/* through the main backend (port 4000) which internally
        // reverse-proxies to the wa-chatbot service on port 4001
        source: "/bot/:path*",
        destination: "http://65.1.183.241:4000/bot/:path*",
      },
    ];
  },
};

export default nextConfig;
