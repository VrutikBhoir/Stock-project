/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const target = process.env.BACKEND_URL || 'http://localhost:8001';
    return [
      { source: '/api/:path*', destination: `${target}/api/:path*` },
    ];
  },
};

module.exports = nextConfig;
