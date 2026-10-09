import Link from 'next/link'
import React from 'react'
import { Surface } from './Surface'

/** Last day the legacy core GPU CI (comfy-action) reported to api.comfy.org. */
export const LEGACY_CI_LAST_REPORT = '2026-06-22'

/**
 * Amber notice for the pages backed by api.comfy.org: that CI has stopped reporting
 * and its thumbnail bucket has been emptied. Current GPU results live under /regression.
 */
export const LegacyBanner: React.FC = () => {
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
            </div>
        </Surface>
    )
}
