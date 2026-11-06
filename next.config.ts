import type { NextConfig } from 'next';
const isolatedBuildDir = process.env.DOCTOR_ACCEPTANCE_DIST_DIR;
const nextConfig: NextConfig = {
  // Keep acceptance builds isolated from any existing `next start` using `.next`.
  distDir: isolatedBuildDir && /^\.next-doctor-[a-z0-9-]+$/i.test(isolatedBuildDir)
    ? isolatedBuildDir
    : process.env.DOCTOR_ACCEPTANCE_RUNTIME === '1' ? '.next-doctor-acceptance' : '.next',
};
export default nextConfig;
