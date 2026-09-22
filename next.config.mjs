/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Uploaded identity documents are served only through an authorised route
  // handler, never as static assets.
  experimental: {
    serverActions: {
      // Verification evidence can be several megabytes (scans of Emirates ID,
      // practising certificates, trade licences).
      bodySizeLimit: '12mb',
    },
  },
};

export default nextConfig;
