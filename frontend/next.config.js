/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const target = process.env.BACKEND_URL || 'https://stocklens-production-89a6.up.railway.app';
    return [
      { source: '/api/:path*', destination: `${target}/api/:path*` },
    ];
  },
};

module.exports = nextConfig;
