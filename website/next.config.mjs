/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: process.cwd(),
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' }
        ]
      },
      { source: '/llms.txt', headers: [{ key: 'Content-Type', value: 'text/markdown; charset=utf-8' }] },
      { source: '/robots.txt', headers: [{ key: 'Content-Type', value: 'text/plain; charset=utf-8' }] },
      { source: '/sitemap.xml', headers: [{ key: 'Content-Type', value: 'application/xml; charset=utf-8' }] }
    ];
  }
};
export default nextConfig;
