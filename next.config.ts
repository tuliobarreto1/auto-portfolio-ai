import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // gera .next/standalone para uma imagem Docker enxuta
  output: "standalone",
};

export default nextConfig;
