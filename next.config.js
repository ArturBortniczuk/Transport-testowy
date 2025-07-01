/** @type {import('next').NextConfig} */
const nextConfig = {
  // Podstawowa konfiguracja
  reactStrictMode: true,
  swcMinify: true,
  
  // Eksperymentalne funkcje
  experimental: {
    serverComponentsExternalPackages: ['knex', 'pg', 'mysql2', 'sqlite3'],
  },

  // Konfiguracja API
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: '10mb',
    externalResolver: true,
  },

  // Webpack konfiguracja
  webpack: (config, { isServer }) => {
    // Ignoruj ostrzeżenia dla node_modules
    config.ignoreWarnings = [
      /critical dependency:/i,
      /the request of a dependency is an expression/i,
    ];

    // Dodaj fallbacks dla node modules w przeglądarce
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }

    // Obsługa bibliotek SOAP i XML
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push({
        'utf-8-validate': 'commonjs utf-8-validate',
        'bufferutil': 'commonjs bufferutil',
      });
    }

    return config;
  },

  // Obsługa błędów kompilacji
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },

  // Optymalizacje
  poweredByHeader: false,
  compress: true,

  // Headers bezpieczeństwa
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },

  // Przekierowania i rewrites
  async rewrites() {
    return [
      // API fallbacks
      {
        source: '/api/kurier/stats/realtime',
        destination: '/api/kurier/stats?period=realtime',
      },
      {
        source: '/api/kurier/stats/archive',
        destination: '/api/kurier/stats?archive=true',
      },
    ];
  },

  // Obsługa błędów w trybie development
  ...(process.env.NODE_ENV === 'development' && {
    async redirects() {
      return [];
    },
  }),

  // Zmienne środowiskowe publiczne
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Output konfiguracja dla Vercel
  output: 'standalone',

  // Obsługa obrazów
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },

  // ESLint konfiguracja
  eslint: {
    ignoreDuringBuilds: true, // Tymczasowo ignoruj błędy ESLint podczas budowania
  },

  // TypeScript konfiguracja
  typescript: {
    ignoreBuildErrors: true, // Tymczasowo ignoruj błędy TypeScript
  },
};

module.exports = nextConfig;
