const nextConfig = {
    // Standard Next.js config
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    // Removing experimental turbo config that might be causing issues on production builds
};
module.exports = nextConfig;
