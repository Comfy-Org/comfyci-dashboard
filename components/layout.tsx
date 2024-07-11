import Head from 'next/head'
import { ThemeModeScript } from 'flowbite-react'
import { Header } from './Header'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Layout({ children }: React.PropsWithChildren) {
    return (
        <>
            <Head>
                <title>ComfyCI Dashboard</title>
                <meta
                    name="description"
                    content="ComfyCI Dashboard tests changes in ComfyUI by running workflows and custom nodes."
                />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                />
                <meta
                    name="robots"
                    content="index, follow"
                />
                <link
                    rel="icon"
                    type="image/png"
                    sizes="16x16"
                    href="/images/favicon-16x16.png"
                />
                <link
                    rel="icon"
                    type="image/png"
                    sizes="32x32"
                    href="/images/favicon-32x32.png"
                />
                <link
                    rel="icon"
                    type="image/x-icon"
                    href="/images/favicon.ico"
                />
                <link
                    rel="icon"
                    type="image/png"
                    sizes="192x192"
                    href="/images/android-chrome-192x192.png"
                />
                <link
                    rel="icon"
                    type="image/png"
                    sizes="512x512"
                    href="/images/android-chrome-512x512.png"
                />
                <link
                    rel="apple-touch-icon"
                    sizes="180x180"
                    href="/images/apple-touch-icon.png"
                />
                <meta
                    name="theme-color"
                    content="#ffffff"
                />
                <meta
                    name="mobile-web-app-capable"
                    content="yes"
                />
                <meta
                    name="apple-mobile-web-app-capable"
                    content="yes"
                />
                <meta
                    name="apple-mobile-web-app-status-bar-style"
                    content="black-translucent"
                />

                {/* Open Graph Meta Tags */}
                <meta
                    property="og:title"
                    content="ComfyCI Dashboard"
                />
                <meta
                    property="og:description"
                    content="ComfyCI Dashboard tests changes in ComfyUI by running workflows and custom nodes."
                />
                <meta
                    property="og:image"
                    content="/images/android-chrome-512x512.png"
                />
                <meta
                    property="og:url"
                    content="https://comfyci.org"
                />
                <meta
                    property="og:type"
                    content="website"
                />

                {/* Twitter Card Meta Tags */}
                <meta
                    name="twitter:card"
                    content="summary_large_image"
                />
                <meta
                    name="twitter:title"
                    content="ComfyCI Dashboard"
                />
                <meta
                    name="twitter:description"
                    content="ComfyCI Dashboard for testing changes in ComfyUI by running workflows and custom nodes."
                />
                <meta
                    name="twitter:image"
                    content="/images/android-chrome-512x512.png"
                />
                <meta
                    name="twitter:site"
                    content="@ComfyUI"
                />
                <meta
                    name="twitter:creator"
                    content="@ComfyUI"
                />

                <ThemeModeScript />
                <Header />
            </Head>
            <ToastContainer />
            <main>{children}</main>
        </>
    )
}
