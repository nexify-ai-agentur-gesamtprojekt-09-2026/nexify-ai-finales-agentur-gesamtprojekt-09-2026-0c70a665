/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hinter dem Traefik-Router unter /myadmin; ohne DNS-Aenderung erreichbar.
  basePath: '/myadmin',
  output: 'standalone',
  poweredByHeader: false,
}

export default nextConfig
