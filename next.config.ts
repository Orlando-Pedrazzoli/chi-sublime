import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    qualities: [75, 80, 85, 90, 95],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
