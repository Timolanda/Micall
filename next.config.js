/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true, // optional if Vercel builds fail on types
  },

  images: {
    unoptimized: true, // prevents Next image caching weirdness for PWA
  },

  experimental: {
    appDir: true,
  },
};

module.exports = nextConfig;
