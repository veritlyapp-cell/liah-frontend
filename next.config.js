/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        // Attempt to disable Turbopack if it's enabled by default in this version
        turbo: {
            enabled: false
        }
    }
};
module.exports = nextConfig;
