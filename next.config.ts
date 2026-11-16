import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'etschqfatclugukntchl.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/api/game/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, X-Portal-Signature, Authorization, x-portal-signature' },
        ],
      },
      {
        source: '/game/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, X-Portal-Signature, Authorization, x-portal-signature' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/game/init',
        destination: '/api/game/init',
      },
      {
        source: '/game/match/complete',
        destination: '/api/game/match/complete',
      },
      {
        source: '/game/session',
        destination: '/api/game/session',
      },
    ];
  },
};

export default nextConfig;
