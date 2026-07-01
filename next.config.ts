import type { NextConfig } from "next";

// Allow the host serving the app (derived from NEXT_PUBLIC_API_BASE_URL) as a
// dev origin, so the "page auto-refreshes every few minutes" fix keeps working
// when the base URL changes in .env.local — no need to edit this file again.
// Adds the API host, its parent domain, and a wildcard for that parent
// (e.g. api.infoskyglobalit.in -> infoskyglobalit.in + *.infoskyglobalit.in,
// which covers sjm.infoskyglobalit.in etc.). Dev-only.
const apiDevOrigins = (() => {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!raw) return [] as string[];
  try {
    const { hostname } = new URL(raw);
    const parent = hostname.split(".").slice(1).join(".");
    return [hostname, parent, parent && `*.${parent}`].filter(Boolean) as string[];
  } catch {
    return [] as string[];
  }
})();

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'localhost',
    '*.localhost',
    // Catch-all for ANY IPv4 address (e.g. 192.168.0.133, 192.168.3.225,
    // 103.154.234.213, ...). Next matches allowedDevOrigins per dot-separated
    // segment, and every IPv4 is exactly 4 segments, so `*.*.*.*` matches them
    // all. Without an allow-listed origin, Next dev blocks /_next/* (HMR + RSC),
    // and the failed fetches make the App Router hard-reload the page
    // ("page auto-refreshing every few minutes"). This is a dev-only setting.
    '*.*.*.*',
    '*.127.0.0.1.nip.io',
    '*.13.126.47.172.nip.io',
    '*.103.154.234.213.nip.io',
    // Production-style tenant domains used in dev (sls, dev3, admin, ...).
    'vowerp.co.in',
    '*.vowerp.co.in',
    // Host serving the app, derived from NEXT_PUBLIC_API_BASE_URL (see top of file).
    ...apiDevOrigins,
  ],
  images: {
    // Allow image optimization for localhost subdomains
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '*.localhost',
        port: '3000',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
      },
      {
        protocol: 'http',
        hostname: '*.13.126.47.172',
        port: '3000',
      },
      {
        protocol: 'http',
        hostname: '13.126.47.172',
        port: '3000',
      },
      {
        protocol: 'http',
        hostname: '*.13.126.47.172.nip.io',
        port: '3000',
      },
    ],
    // Use unoptimized images for local development to avoid subdomain issues
    unoptimized: process.env.NODE_ENV === 'development',
  },
  // async rewrites() {
  //   // Determine the backend URL based on the environment
  //   const isProduction = process.env.NODE_ENV === 'production';
  //   // const backendHost = process.env.NEXT_PUBLIC_BACKENDHOST || 'localhost:8000'; // Default for non-Docker dev
  //   // Updated: Add logging and ensure backendHost is set correctly
  //   const backendHost = process.env.NEXT_PUBLIC_BACKENDHOST || 'localhost:8000'; // Default for non-Docker dev
  //   console.log('Backend Host:', backendHost); // Debug: Log the backend host

  //   // Backend URL for proxying
  //   // const backendUrl = isProduction
  //   //   ? 'https://vowerp.co.in' // Production backend URL
  //   //   : `http://${backendHost}/api`; // Development (localhost or Docker service)
  //   // Updated: Add logging for backendUrl and ensure proper URL construction
  //   const backendUrl = isProduction
  //     ? 'https://vowerp.co.in' // Production backend URL
  //     // : `${backendHost}/api`; // Development (localhost or Docker service)
  //           : `http://localhost:8000/api`; // Development (localhost or Docker service)
  //   console.log('Backend URL for proxy:', backendUrl); // Debug: Log the constructed backend URL

  //   // Only apply the proxy in development
  //   if (isProduction) {
  //     return [];
  //   }

  //   return [
  //     {
  //       source: '/api/:path*', // Match all /api/* requests
  //       destination: `${backendUrl}/:path*`, // Proxy to backend
  //     },
  //   ];
  // }
  async rewrites() {
    const useProxy = process.env.USE_NEXT_PROXY === 'true';
    const backendHost = process.env.NEXT_PUBLIC_BACKENDHOST || 'localhost:8000';
    const backendUrl = backendHost.includes('http')
      ? `${backendHost}/api`
      : `http://${backendHost}/api`;

    if (!useProxy) {
      return [];
    }
  
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },

 
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

export default nextConfig;