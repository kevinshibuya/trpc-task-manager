import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `pnpm lint` runs ESLint on its own, locally and in CI, so the build
  // does not run it a second time.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
