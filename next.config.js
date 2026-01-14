const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    // Force webpack for stability (avoid Turbopack issues)
    experimental: {
        webpackBuildWorker: true,
    },
};
module.exports = nextConfig;
