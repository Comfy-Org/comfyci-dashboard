import React from 'react';
import Head from 'next/head'
import Link from 'next/link'
import { ThemeModeScript } from 'flowbite-react'
import { Header } from './Header'
import { LEGACY_CI_LAST_REPORT_TEXT } from './LegacyBanner'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const WORKER_REPO = 'https://github.com/Comfy-Org/comfyci-runpod-worker'
const footerLink = 'hover:text-charcoal-800 dark:hover:text-electric hover:underline'

const Footer = () => (
    <footer className="border-t border-smoke-300 dark:border-charcoal-400/60">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-5 text-xs text-ash-500 dark:text-smoke-800 sm:px-6 lg:px-8">
            <Link href="/legacy" className={footerLink}>
                Legacy CI results (until {LEGACY_CI_LAST_REPORT_TEXT})
            </Link>
            <Link href="/legacy/waterfall" className={footerLink}>
                Legacy waterfall
            </Link>
            <a href={WORKER_REPO} target="_blank" rel="noopener noreferrer" className={footerLink}>
                Worker repo
            </a>
            <a
                href="https://github.com/Comfy-Org/comfyci-dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className={footerLink}
            >
                Dashboard repo
            </a>
            <a
                href={`${WORKER_REPO}/blob/main/manifest/lanes.json`}
                target="_blank"
                rel="noopener noreferrer"
                className={footerLink}
            >
                Lane registry (lanes.json)
            </a>
        </div>
    </footer>
)

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
                    type="image/svg+xml"
                    href="/brand/favicon.svg"
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
                    content="#151317"
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
                    content="https://ci.comfy.org"
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
            </Head>
            <ToastContainer theme="dark" />
            {/* A flex column so the footer sits at the bottom of a short page. */}
            <main className="flex min-h-screen flex-col bg-smoke-100 dark:bg-ink-900 text-charcoal-800 dark:text-smoke-100">
                <Header />
                <div className="mx-auto w-full max-w-[1600px] flex-1 px-4 sm:px-6 lg:px-8 pb-16">
                    {children}
                </div>
                <Footer />
            </main>
        </>
    )
}
