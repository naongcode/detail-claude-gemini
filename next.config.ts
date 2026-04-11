import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['puppeteer', 'puppeteer-core', '@sparticuz/chromium', 'sharp'],
  outputFileTracingIncludes: {
    '/api/projects/[id]/generate/render': ['./node_modules/@sparticuz/chromium/bin/**/*'],
  },
};

export default nextConfig;
