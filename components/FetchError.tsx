import React from 'react'

/**
 * A fetch that failed (rate limit, 5xx, network), as opposed to a file the worker has
 * not published: the client reports that as null and the pages show an empty state.
 */
export const FetchError: React.FC<{
    /** What could not be loaded, e.g. "the run index". */
    what: string
    error: unknown
    onRetry: () => void
    /** True while a retry is in flight. */
    busy?: boolean
    className?: string
}> = ({ what, error, onRetry, busy = false, className = 'mb-6' }) => (
    <div
        role="alert"
        className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-4 py-2.5 text-sm text-red-600 dark:text-red-400 ${className}`}
    >
        <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
        <span className="min-w-0 break-words">
            <span className="font-semibold">Could not load {what}</span>
            <span className="text-red-600/80 dark:text-red-400/80">
                : {error instanceof Error ? error.message : String(error)}
            </span>
        </span>
        <button
            type="button"
            onClick={onRetry}
            disabled={busy}
            className="ml-auto rounded-lg border border-red-500/40 px-3 py-1 text-xs font-semibold transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
            {busy ? 'Retrying…' : 'Retry'}
        </button>
    </div>
)
