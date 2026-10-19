import React from 'react'
import { formatRelative, hoursSince } from '../../utils/time'

/** The publisher ticks twice an hour; beyond this age it is probably stalled. */
const STALE_HOURS = 2

export interface HeadFreshness {
    label: string
    /** updated_ts of the head; undefined while loading, null when the file is not published. */
    ts: number | null | undefined
}

/**
 * Freshness strip for the tab: the newest updated_ts across the three head files, amber
 * once that is older than two hours or a head is missing, and "publisher has not run
 * yet" while none of them is published.
 */
export const FreshnessBanner: React.FC<{ heads: HeadFreshness[] }> = ({ heads }) => {
    const known = heads.filter((h) => h.ts !== undefined)
    if (known.length === 0) return null
    const published = known.filter((h) => h.ts != null)
    const missing = known.filter((h) => h.ts === null).map((h) => h.label)
    const newest = published.length ? Math.max(...published.map((h) => h.ts as number)) : null
    const stale = newest != null && hoursSince(newest) > STALE_HOURS
    const warn = stale || missing.length > 0
    const perHead = published
        .map((h) => `${h.label} ${formatRelative(h.ts as number)}`)
        .join(' · ')

    return (
        <div
            role={warn ? 'alert' : 'status'}
            className={`mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-4 py-2.5 text-sm ${
                warn
                    ? 'border-amber-500/40 bg-amber-500/[0.08] text-amber-700 dark:text-amber-400'
                    : 'border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-400'
            }`}
        >
            <span className={`h-2 w-2 shrink-0 rounded-full ${warn ? 'bg-amber-400' : 'bg-emerald-500'}`} />
            {newest != null ? (
                <span title={perHead}>
                    <span className="font-semibold">Published {formatRelative(newest)}</span>
                    <span className="text-charcoal-800/70 dark:text-smoke-200/70">
                        {' '}
                        · {new Date(newest * 1000).toLocaleString()}
                    </span>
                </span>
            ) : (
                <span className="font-semibold">Publisher has not run yet</span>
            )}
            {stale && (
                <span>— no publish in the last {STALE_HOURS} h; the frontend-index publisher may be stalled</span>
            )}
            {newest != null && missing.length > 0 && (
                <span>
                    — not published yet: <span className="font-semibold">{missing.join(', ')}</span>
                </span>
            )}
            {newest == null && (
                <span className="text-charcoal-800/70 dark:text-smoke-200/70">
                    — none of the frontend files are published; the tab fills in after the first tick
                </span>
            )}
        </div>
    )
}
