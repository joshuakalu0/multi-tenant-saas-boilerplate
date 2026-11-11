import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true
  },
  serverExternalPackages: ["@prisma/client"]
};

export default nextConfig;
