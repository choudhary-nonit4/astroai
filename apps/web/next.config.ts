import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.AWS_STATIC_EXPORT === "true" ? "export" : "standalone",
  images: { unoptimized: true },
};

export default nextConfig;
