import Link from 'next/link'
import React from 'react'
import { Surface } from './Surface'
import { dateUtc } from '../utils/time'

/** Last day the legacy core GPU CI (comfy-action) reported to api.comfy.org. */
export const LEGACY_CI_LAST_REPORT = '2026-06-22'

/** LEGACY_CI_LAST_REPORT as shown on the page, e.g. "22 Jun 2026". */
export const LEGACY_CI_LAST_REPORT_TEXT = dateUtc(Date.parse(`${LEGACY_CI_LAST_REPORT}T00:00:00Z`) / 1000)

/**
 * Amber notice for the pages backed by api.comfy.org: that CI has stopped reporting
 * and its thumbnail bucket has been emptied. Current GPU results live under All Results.
 */
export const LegacyBanner: React.FC = () => {
    return (
        <Surface className="mb-6 overflow-hidden">
            <div className="bg-amber-500/[0.08] px-5 py-4 text-sm text-amber-700 dark:text-amber-400">
                <span className="font-semibold">Legacy data</span> — the core GPU CI (comfy-action) behind
                these pages stopped reporting on {LEGACY_CI_LAST_REPORT_TEXT} and its thumbnails are no longer
                available. Current results live under{' '}
                <Link
                    href="/"
                    className="font-semibold underline underline-offset-2 hover:text-charcoal-900 dark:hover:text-electric"
                >
                    All Results
                </Link>
                .
            </div>
        </Surface>
    )
}
