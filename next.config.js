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
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Image sizes for different breakpoints
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  compress: true,
  poweredByHeader: false,
  swcMinify: true,
  // Enable production source maps for better debugging (optional)
  productionBrowserSourceMaps: false,
  // Optimize fonts
  optimizeFonts: true,
  // Suppress webpack warnings
  webpack: (config, { isServer, dev }) => {
    // Suppress commonjs/amd warnings
    config.ignoreWarnings = [
      { module: /node_modules/ },
      { file: /node_modules/ },
    ]
    
    // Optimize server bundle size for Netlify
    if (isServer && !dev) {
      // Ensure server-only dependencies are properly tree-shaken
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
      }
      
      // Split server chunks to reduce individual function size
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          // Separate heavy dependencies into their own chunk
          googleapis: {
            name: 'googleapis',
            test: /[\\/]node_modules[\\/]googleapis[\\/]/,
            chunks: 'all',
            priority: 30,
            reuseExistingChunk: true,
          },
          nodemailer: {
            name: 'nodemailer',
            test: /[\\/]node_modules[\\/]nodemailer[\\/]/,
            chunks: 'all',
            priority: 30,
            reuseExistingChunk: true,
          },
        },
      }
    }
    
    // Optimize bundle size for client
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      }
    }
    
    return config
  },
  // Experimental features for better performance
  experimental: {
    // optimizeCss: true, // Disabled to prevent CSS 404 errors in dev mode
  },
  // ESLint configuration
  eslint: {
    // Disable ESLint during builds to avoid deprecated options error
    // You can run `npm run lint` separately to check for linting issues
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig

