/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com', 'via.placeholder.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.in',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/uploads/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    unoptimized: process.env.NODE_ENV === 'production' && process.env.NETLIFY === 'true' ? false : undefined,
  },
  compress: true,
  poweredByHeader: false,
  swcMinify: true,
  // Suppress webpack warnings
  webpack: (config, { isServer }) => {
    // Suppress commonjs/amd warnings
    config.ignoreWarnings = [
      { module: /node_modules/ },
      { file: /node_modules/ },
    ]
    return config
  },
  // Removed experimental.optimizeCss as it may cause issues on Netlify
}

module.exports = nextConfig

