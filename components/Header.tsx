import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/router"
import React from "react"
import ThemeToggler from "./ThemeToggler"

const NAV = [
    { href: "/", label: "All Results" },
    { href: "/waterfall", label: "Waterfall" },
    { href: "/frontend", label: "Frontend" },
]

// All Results also owns the commit pages under /regression; the legacy pages and the
// legacy workflow page belong to no tab.
const isActivePath = (href: string, pathname: string) =>
    href === "/" ? pathname === "/" || pathname.startsWith("/regression") : pathname.startsWith(href)

const ComfyMark = () => (
    <span className="flex items-center gap-3">
        {/* Yellow logo for dark mode, ink logo for light mode; on a phone just the mark,
            so all three tabs fit beside it. */}
        <Image
            src="/brand/logo-mark-yellow.svg"
            alt="Comfy"
            width={147}
            height={159}
            priority
            className="hidden h-7 w-auto dark:block sm:dark:hidden"
        />
        <Image
            src="/brand/logo-mark-ink.svg"
            alt="Comfy"
            width={148}
            height={159}
            priority
            className="block h-7 w-auto dark:hidden sm:hidden"
        />
        <Image
            src="/brand/logo-full-yellow.svg"
            alt="Comfy"
            width={204}
            height={57}
            priority
            className="hidden h-7 w-auto sm:dark:block"
        />
        <Image
            src="/brand/logo-full-ink.svg"
            alt="Comfy"
            width={204}
            height={57}
            priority
            className="hidden h-7 w-auto sm:block sm:dark:hidden"
        />
        <span className="hidden rounded-md border border-smoke-300 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-ash-500 dark:border-charcoal-400/60 dark:text-smoke-700 sm:inline-block">
            CI / CD
        </span>
    </span>
)

export const Header = () => {
    const router = useRouter()
    const isActive = (href: string) => isActivePath(href, router.pathname)
    const navRef = React.useRef<HTMLElement>(null)

    // Should the tabs still overflow (a very narrow screen, a large font), keep the active
    // one in view inside the pill. The tabs change width when the web fonts swap in, which
    // can be after this first runs, so scroll again whenever the pill or a tab resizes.
    React.useEffect(() => {
        const nav = navRef.current
        const active = nav?.querySelector<HTMLElement>('[aria-current="page"]')
        if (!nav || !active) return
        const keepActiveInView = () => {
            // Both offsets are from the sticky header, so their difference is the tab's place in the pill.
            const right = active.offsetLeft - nav.offsetLeft + active.offsetWidth
            nav.scrollLeft = Math.max(0, right - nav.clientWidth)
        }
        keepActiveInView()
        const observer = new ResizeObserver(keepActiveInView)
        observer.observe(nav)
        Array.from(nav.children).forEach((tab) => observer.observe(tab))
        return () => observer.disconnect()
    }, [router.pathname])

    return (
        <header className="sticky top-0 z-40 border-b border-smoke-300 dark:border-charcoal-400/60 bg-smoke-100/80 dark:bg-ink-900/80 backdrop-blur-md">
            <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
                <Link href="/" className="shrink-0">
                    <ComfyMark />
                </Link>

                {/* min-w-0 + overflow-x-auto: on a phone the links scroll inside the pill
                    instead of pushing the page wider than the viewport. */}
                <nav
                    ref={navRef}
                    className="flex min-w-0 max-w-full items-center gap-0.5 overflow-x-auto rounded-full sm:gap-1 border border-smoke-300 dark:border-charcoal-400/60 bg-smoke-200/60 dark:bg-charcoal-700/60 p-1"
                >
                    {NAV.map(({ href, label }) => {
                        const active = isActive(href)
                        return (
                            <Link
                                key={href}
                                href={href}
                                aria-current={active ? "page" : undefined}
                                className={[
                                    "whitespace-nowrap rounded-full px-2 py-1.5 text-xs font-semibold transition-colors sm:px-4 sm:text-sm",
                                    active
                                        ? "bg-electric text-ink-900 shadow-sm"
                                        : "text-ash-500 dark:text-smoke-700 hover:text-charcoal-800 dark:hover:text-white",
                                ].join(" ")}
                            >
                                {label}
                            </Link>
                        )
                    })}
                </nav>

                <div className="flex shrink-0 items-center gap-2">
                    <ThemeToggler />
                </div>
            </div>
        </header>
    )
}
