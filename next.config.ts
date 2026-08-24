import type { NextConfig } from 'next';

const isGitHubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  ...(isGitHubPages
    ? {
        output: 'export',
        basePath: '/glp-1-plotter',
        assetPrefix: '/glp-1-plotter/',
      }
    : {}),
};

export default nextConfig;
