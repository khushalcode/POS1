import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};
module.exports = {
  allowedDevOrigins: ['10.229.245.89'],
}
export default nextConfig;
