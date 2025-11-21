/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com', 'via.placeholder.com'],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    unoptimized: process.env.NODE_ENV === 'production' && process.env.NETLIFY === 'true' ? false : undefined,
  },
  compress: true,
  poweredByHeader: false,
  swcMinify: true,
  // Removed experimental.optimizeCss as it may cause issues on Netlify
}

module.exports = nextConfig

