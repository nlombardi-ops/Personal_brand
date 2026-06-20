import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: ".",
  },
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
