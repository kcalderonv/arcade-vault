import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
    /* config options here */
    // Solo desarrollo: permite probar desde el celular por la IP de la red local.
    allowedDevOrigins: ['192.168.1.*'],
    experimental: {
        agentFeedback: true,
    },
    cacheComponents: true,
    partialPrefetching: true,
    turbopack: {
        rules: {
            '*.css': {
                loaders: ['@tailwindcss/turbopack'],
                as: '*.css',
            },
        },
    },
};
export default nextConfig;
