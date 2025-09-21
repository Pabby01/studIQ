/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure build settings
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  optimizeFonts: true,
  output: 'standalone',
  // Disable static optimization
  staticPageGenerationTimeout: 0,
  experimental: {
    // Enable package optimization
    optimizePackageImports: ['@/components/ui'],
    // Enable server components optimization
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
    // Enable server actions
    serverActions: true,
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
