import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/router"
import ThemeToggler from "./ThemeToggler"

const NAV = [
    { href: "/", label: "All Results" },
    { href: "/waterfall", label: "Waterfall" },
]

const ComfyMark = () => (
    <span className="flex items-center gap-3">
        {/* Yellow logo for dark mode, ink logo for light mode */}
        <Image
            src="/brand/logo-full-yellow.svg"
            alt="Comfy"
            width={204}
            height={57}
            priority
            className="hidden h-7 w-auto dark:block"
        />
        <Image
            src="/brand/logo-full-ink.svg"
            alt="Comfy"
            width={204}
            height={57}
            priority
            className="block h-7 w-auto dark:hidden"
        />
        <span className="hidden rounded-md border border-smoke-300 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-ash-500 dark:border-charcoal-400/60 dark:text-smoke-700 sm:inline-block">
            CI / CD
        </span>
    </span>
)

export const Header = () => {
    const router = useRouter()
    const isActive = (href: string) =>
        href === "/" ? router.pathname === "/" : router.pathname.startsWith(href)

    return (
        <header className="sticky top-0 z-40 border-b border-smoke-300 dark:border-charcoal-400/60 bg-smoke-100/80 dark:bg-ink-900/80 backdrop-blur-md">
            <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
                <Link href="/" className="shrink-0">
                    <ComfyMark />
                </Link>

                <nav className="flex items-center gap-1 rounded-full border border-smoke-300 dark:border-charcoal-400/60 bg-smoke-200/60 dark:bg-charcoal-700/60 p-1">
                    {NAV.map(({ href, label }) => {
                        const active = isActive(href)
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={[
                                    "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
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
