import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Las fotos de eventos (hasta 5 MB) viajan dentro de la Server Action.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
