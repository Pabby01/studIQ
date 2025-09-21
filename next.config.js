/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure static and dynamic routes
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  optimizeFonts: true,
  // Enable static page generation
  output: 'standalone',
  // Configure static paths
  experimental: {
    // Enable static optimization where possible
    optimizePackageImports: ['@/components/ui'],
    // Improve static generation
    workerThreads: true,
    optimizeCss: true,
  },
  // Configure page settings
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  // Configure webpack
  webpack: (config) => {
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /@supabase\/realtime-js\/dist\/main\/RealtimeClient\.js/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
    ];

    return config;
  },
};

module.exports = nextConfig;
