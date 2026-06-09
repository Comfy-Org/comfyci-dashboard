import React from 'react'

/** Build a compact page window with ellipsis gaps, e.g. [1, '…', 4,5,6, '…', 20] */
function pageWindow(current: number, total: number): (number | '…')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    const pages: (number | '…')[] = [1]
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    if (start > 2) pages.push('…')
    for (let p = start; p <= end; p++) pages.push(p)
    if (end < total - 1) pages.push('…')
    pages.push(total)
    return pages
}

const navBtn =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-smoke-300 px-3 text-sm font-medium ' +
    'text-charcoal-800 transition hover:border-electric/50 disabled:cursor-not-allowed disabled:opacity-40 ' +
    'dark:border-charcoal-400/60 dark:text-smoke-200 dark:hover:border-electric/50 dark:hover:text-electric'

export const Pager: React.FC<{
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
}> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null
    const pages = pageWindow(currentPage, totalPages)

    return (
        <nav className="flex items-center gap-1.5">
            <button
                className={navBtn}
                disabled={currentPage <= 1}
                onClick={() => onPageChange(currentPage - 1)}
            >
                Prev
            </button>
            {pages.map((p, i) =>
                p === '…' ? (
                    <span
                        key={`gap-${i}`}
                        className="px-1 text-sm text-ash-500 dark:text-smoke-800"
                    >
                        …
                    </span>
                ) : (
                    <button
                        key={p}
                        onClick={() => onPageChange(p)}
                        className={
                            p === currentPage
                                ? 'inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-electric px-3 text-sm font-bold text-ink-900'
                                : navBtn
                        }
                    >
                        {p}
                    </button>
                )
            )}
            <button
                className={navBtn}
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange(currentPage + 1)}
            >
                Next
            </button>
        </nav>
    )
}
