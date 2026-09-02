/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Nothing debugs production from the browser here, and the maps are large.
  productionBrowserSourceMaps: false,
  experimental: {
    // Route handlers receive full-resolution phone photos.
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
