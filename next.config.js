import mdx from '@next/mdx'
// const withMDX = (await import("@next/mdx")).default({
const withMDX = mdx({
    extension: /\.mdx?$/,
    options: {
        remarkPlugins: [],
        rehypePlugins: [],
        // If you use `MDXProvider`, uncomment the following line.
        providerImportSource: '@mdx-js/react',
    },
})

/** @type {import('next').NextConfig} */
const conf = {
    reactStrictMode: true,
    swcMinify: true,
    // Append the default value with md extensions
    pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
    images: {
        unoptimized: true,
        domains: [
            // user avatar
            'avatars.githubusercontent.com',
            // image
            'firebasestorage.googleapis.com',
            'storage.googleapis.com',
            'via.placeholder.com',
        ],
    },
    webpack: (config) => {
        config.experiments.topLevelAwait = true
        return config
    },
}
export default withMDX(conf)
// module.exports = withMDX(conf)
