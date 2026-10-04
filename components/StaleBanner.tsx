import React from 'react'
import type { LaneInfo } from '../src/regression/types'
import { formatRelative, hoursSince } from '../utils/time'

// How old the latest run may be before the lane looks stalled. Per-commit lanes
// should see a run within a few hours of a push; slower cadences get their period
// plus some slack.
const STALE_HOURS: Record<LaneInfo['cadence'], number> = {
    'per-commit': 3,
    nightly: 26,
    weekly: 24 * 7 + 2,
}

/**
 * Freshness strip for a lane: the latest run's age, amber once it is older than the
 * cadence allows, and a notice while the worker has not published a run index yet.
 */
export const StaleBanner: React.FC<{
    latestTs: number | null | undefined
    indexMissing: boolean
    cadence?: LaneInfo['cadence']
}> = ({ latestTs, indexMissing, cadence = 'per-commit' }) => {
    const staleAfter = STALE_HOURS[cadence] ?? STALE_HOURS['per-commit']
    const stale = latestTs != null && hoursSince(latestTs) > staleAfter
    const warn = stale || indexMissing
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
            {latestTs != null ? (
                <span>
                    <span className="font-semibold">Latest run {formatRelative(latestTs)}</span>
                    <span className="text-charcoal-800/70 dark:text-smoke-200/70">
                        {' '}
                        · {new Date(latestTs * 1000).toLocaleString()}
                    </span>
                </span>
            ) : (
                <span className="font-semibold">No runs recorded for this lane yet</span>
            )}
            {stale && (
                <span>
                    — older than {staleAfter} h for a {cadence} lane; the worker may be stalled
                </span>
            )}
            {indexMissing && (
                <span className="font-semibold">
                    No run index published yet
                    {latestTs != null && (
                        <span className="font-normal"> — showing the latest run pointer only</span>
                    )}
                </span>
            )}
        </div>
    )
}
