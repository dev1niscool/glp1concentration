import type { NextConfig } from 'next';

const isGitHubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  ...(isGitHubPages
    ? {
        output: 'export',
        trailingSlash: true,
        basePath: '/glp1concentration',
        assetPrefix: '/glp1concentration/',
      }
    : {}),
};

export default nextConfig;
