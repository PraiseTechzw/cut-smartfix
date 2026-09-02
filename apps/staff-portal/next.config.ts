import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  transpilePackages: ["@cut-smartfix/api-client", "@cut-smartfix/contracts"],
};
export default nextConfig;
