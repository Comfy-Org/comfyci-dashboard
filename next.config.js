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
            // regression results (worker repo results branch)
            'raw.githubusercontent.com',
            'via.placeholder.com',
        ],
    },
    webpack: (config) => {
        config.experiments.topLevelAwait = true
        return config
    },
    // Old links keep working; every redirect passes the query string through. Temporary
    // (307), so browsers do not cache them while the pages settle.
    async redirects() {
        // "/" used to be the legacy api.comfy.org results page: a link carrying one of its
        // filters, or a branch of the PR-CI shape "<number>/merge" (ComfyUI's
        // pullrequest-ci-run.yml posted https://ci.comfy.org/?branch=1234%2Fmerge on PRs),
        // still means that page.
        const legacyResults = ['repo', 'os', 'workflowName', 'commitId'].map((key) => ({
            source: '/',
            has: [{ type: 'query', key }],
            destination: '/legacy',
            permanent: false,
        }))
        return [
            // The Regression tab became All Results; commit pages keep /regression/<branch>/<sha>.
            { source: '/regression', destination: '/', permanent: false },
            ...legacyResults,
            {
                source: '/',
                has: [{ type: 'query', key: 'branch', value: '\\d+/merge' }],
                destination: '/legacy',
                permanent: false,
            },
            // The legacy waterfall only ever wrote ?repo=.
            {
                source: '/waterfall',
                has: [{ type: 'query', key: 'repo' }],
                destination: '/legacy/waterfall',
                permanent: false,
            },
        ]
    },
}
export default withMDX(conf)
// module.exports = withMDX(conf)
