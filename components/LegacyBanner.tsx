import Link from 'next/link'
import React from 'react'
import { Surface } from './Surface'

/** Last day the legacy core GPU CI (comfy-action) reported to api.comfy.org. */
export const LEGACY_CI_LAST_REPORT = '2026-06-22'

/** Newest of the given api.comfy.org timestamps (unix seconds or date strings). */
function newestDate(times: (number | string | undefined)[]): Date | undefined {
    let newest = -Infinity
    for (const t of times) {
        const ms = typeof t === 'number' ? t * 1000 : t ? new Date(t).getTime() : NaN
        if (isFinite(ms) && ms > newest) newest = ms
    }
    return isFinite(newest) ? new Date(newest) : undefined
}

/**
 * Amber notice for the pages backed by api.comfy.org: that CI has stopped reporting
 * and its thumbnail bucket has been emptied. Current GPU results live under /regression.
 */
export const LegacyBanner: React.FC<{ resultTimes?: (number | string | undefined)[] }> = ({
    resultTimes = [],
}) => {
    const newest = newestDate(resultTimes)
    return (
        <Surface className="mb-6 overflow-hidden">
            <div className="bg-amber-500/[0.08] px-5 py-4 text-sm text-amber-700 dark:text-amber-400">
                <span className="font-semibold">Legacy data</span> — the core GPU CI (comfy-action)
                has not reported since {LEGACY_CI_LAST_REPORT} and its thumbnails are no longer
                available. Current GPU results live under{' '}
                <Link
                    href="/regression"
                    className="font-semibold underline underline-offset-2 hover:text-charcoal-900 dark:hover:text-electric"
                >
                    Regression
                </Link>
                .
                {newest && (
                    <span className="ml-3 text-xs">newest result: {newest.toLocaleDateString()}</span>
                )}
            </div>
        </Surface>
    )
}
