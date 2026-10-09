import '../styles/globals.css'
import type { AppProps } from 'next/app'
import React from 'react'
import Layout from '../components/layout'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import FlowBiteThemeProvider from '../components/flowbite-theme'

export default function App({ Component, pageProps }: AppProps) {
    // Create the client once per app instance rather than on every render.
    const [queryClient] = React.useState(
        () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } })
    )

    return (
        <QueryClientProvider client={queryClient}>
            <FlowBiteThemeProvider>
                <Layout>
                    <Component {...pageProps} />
                </Layout>
            </FlowBiteThemeProvider>
        </QueryClientProvider>
    )
}
