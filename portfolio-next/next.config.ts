import type { NextConfig } from "next";

// URL interne de l'API (réseau Docker). En dev local : API_INTERNAL_URL=http://localhost:4000
const apiInternalUrl = process.env.API_INTERNAL_URL || "http://api:4000";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.148.140"],
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiInternalUrl}/api/:path*` }];
  },
};

export default nextConfig;

