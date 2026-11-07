import type { NextConfig } from 'next';
const securityHeaders = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];
const nextConfig: NextConfig = {
    /* config options here */
    // Solo desarrollo: permite probar desde el celular por la IP de la red local.
    allowedDevOrigins: ['192.168.1.*'],
    experimental: {
        agentFeedback: true,
    },
    headers: async () => [{ source: '/(.*)', headers: securityHeaders }],
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
