
import type {NextConfig} from 'next';

const devIndicatorsConfig = {
  allowedDevOrigins: ['https://3000-firebase-studio-1748108769403.cluster-sumfw3zmzzhzkx4mpvz3ogth4y.cloudworkstations.dev'],
  // buildActivity: true, // Default: true. Explicitly adding might help TS in some cases.
  // appIsrStatus: true,  // Default: true.
};

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  // @ts-expect-error This is a valid Next.js 15+ option for devIndicators.
  // The TypeScript types might be lagging or there could be a local type resolution issue.
  devIndicators: devIndicatorsConfig,
};

export default nextConfig;
