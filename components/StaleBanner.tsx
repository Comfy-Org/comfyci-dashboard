import React from 'react'
import type { LaneInfo } from '../src/regression/types'
import { formatRelative, hoursSince } from '../utils/time'

// How old the latest run may be before the lane looks stale. A day without a push is
// an ordinary night or weekend for a per-commit lane, so the threshold is a day;
// slower cadences get their period plus slack. Only beyond twice the threshold is
// the worker itself suspect.
const STALE_HOURS: Record<LaneInfo['cadence'], number> = {
    'per-commit': 24,
    nightly: 36,
    weekly: 24 * 8,
}

const formatHours = (hours: number) =>
    hours >= 48 ? `${Math.round(hours / 24)} d` : `${hours} h`

/**
 * Freshness strip for a lane: the latest run's age, amber once it is older than the
 * cadence allows, and a notice while the worker has not published a run index yet.
 */
export const StaleBanner: React.FC<{
    latestTs: number | null | undefined
    indexMissing: boolean
    cadence?: LaneInfo['cadence']
    /** Set when lanes.json lists the lane but not this branch: the lane never ran on it. */
    unlistedBranch?: string
}> = ({ latestTs, indexMissing, cadence = 'per-commit', unlistedBranch }) => {
    const staleAfter = STALE_HOURS[cadence] ?? STALE_HOURS['per-commit']
    const age = latestTs != null ? hoursSince(latestTs) : 0
    const stale = latestTs != null && age > staleAfter
    const warn = stale || indexMissing
    // A published latest run outranks a lanes.json that does not list the branch yet.
    const noRunsOnBranch = latestTs == null && !!unlistedBranch
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
            ) : noRunsOnBranch ? (
                <span className="font-semibold">
                    This lane has no runs on <span className="font-mono">{unlistedBranch}</span>
                </span>
            ) : (
                <span className="font-semibold">No runs recorded for this lane yet</span>
            )}
            {stale && (
                <span>
                    — no run in the last {formatHours(staleAfter)} on this {cadence} lane
                    {age > 2 * staleAfter && '; the worker may be stalled'}
                </span>
            )}
            {indexMissing && !noRunsOnBranch && (
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
