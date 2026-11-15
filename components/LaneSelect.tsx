import Link from 'next/link'
import type { LinkProps } from 'next/link'
import React from 'react'
import { WorkflowDot } from './WorkflowDots'
import type { DotKind } from './WorkflowDots'
import { laneRunsCaption, laneTag, orderedLaneIds } from '../src/regression/lanes'
import type { LanesIndex } from '../src/regression/types'

/** What one lane's pill shows besides its label: a status dot, its hover text, and an optional note. */
export interface LanePillStatus {
    kind: DotKind
    /** Hover text and screen-reader text for the dot, e.g. "latest run on master: pass". */
    text: string
    /** A quiet word after the label, e.g. "not run". */
    note?: string
    /** Dim the pill (it stays a link): the lane has nothing to show here. */
    muted?: boolean
}

/**
 * One pill per published lane in lane order (primary, active lanes, retired last), each
 * with a status dot, its label and a quiet "primary" or "retired" tag, and the selected
 * lane's cadence underneath. The pills wrap, and a long label truncates inside its pill,
 * so the row never widens a phone screen. Renders nothing until lanes.json is loaded.
 */
export const LanePills: React.FC<{
    lanes: LanesIndex | null | undefined
    value: string
    hrefFor: (laneId: string) => LinkProps['href']
    statusFor: (laneId: string, lanes: LanesIndex) => LanePillStatus
    /** Swap the URL in place (shallow replace) instead of navigating: for a lane param on the same page. */
    inPlace?: boolean
    /** Show the selected lane's cadence and blocking line under the pills. */
    caption?: boolean
    className?: string
}> = ({ lanes, value, hrefFor, statusFor, inPlace = false, caption = false, className = '' }) => {
    const ids = orderedLaneIds(lanes)
    if (!lanes || ids.length === 0) return null
    const current = ids.includes(value) ? lanes.lanes[value] : undefined
    return (
        <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
            <nav aria-label="Lanes" className="flex flex-wrap gap-2">
                {ids.map((id) => {
                    const info = lanes.lanes[id]
                    const tag = laneTag(lanes, id)
                    const status = statusFor(id, lanes)
                    const active = id === value
                    const quiet = active ? 'text-ink-900/70' : 'text-ash-500/80 dark:text-smoke-800'
                    return (
                        <Link
                            key={id}
                            href={hrefFor(id)}
                            replace={inPlace}
                            shallow={inPlace}
                            scroll={inPlace ? false : undefined}
                            aria-current={active ? 'true' : undefined}
                            title={`${info.label}\n${status.text}`}
                            className={[
                                'inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                                active
                                    ? 'border-electric bg-electric text-ink-900 shadow-sm'
                                    : 'border-smoke-300 dark:border-charcoal-400/60 bg-smoke-200/60 dark:bg-charcoal-700/60 text-ash-500 dark:text-smoke-700 hover:border-electric/50 hover:text-charcoal-800 dark:hover:text-white',
                                status.muted && !active ? 'opacity-60 hover:opacity-100' : '',
                            ].join(' ')}
                        >
                            <WorkflowDot kind={status.kind} />
                            <span className="sr-only">{status.text}: </span>
                            <span className="min-w-0 truncate">{info.label}</span>
                            {tag && (
                                <span className={`shrink-0 text-[10px] font-medium uppercase tracking-wider ${quiet}`}>
                                    {tag}
                                </span>
                            )}
                            {status.note && (
                                <span className={`shrink-0 text-[10px] font-medium ${quiet}`}>{status.note}</span>
                            )}
                        </Link>
                    )
                })}
            </nav>
            {caption && current && (
                <span className="text-[11px] text-ash-500 dark:text-smoke-800">{laneRunsCaption(current)}</span>
            )}
        </div>
    )
}

/** One line when ?lane= names a lane that is not published and another lane is shown instead. */
export const LaneMissingNotice: React.FC<{ missing: string; showing: string }> = ({
    missing,
    showing,
}) => (
    <p
        role="status"
        className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/[0.08] px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400"
    >
        Lane <span className="font-mono font-semibold">{missing}</span> is not published; showing{' '}
        {showing}.
    </p>
)
