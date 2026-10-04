import Link from 'next/link'
import React from 'react'
import { BrandSelect } from './Inputs'
import type { LanesIndex } from '../src/regression/types'

/** Pill links to the same page on each published lane; hidden with fewer than two lanes. */
export const LaneTabs: React.FC<{
    lanes: LanesIndex | null | undefined
    value: string
    hrefFor: (laneId: string) => string
}> = ({ lanes, value, hrefFor }) => {
    if (!lanes) return null
    const ids = Object.keys(lanes.lanes)
    if (ids.length < 2) return null
    return (
        <nav className="flex flex-wrap items-center gap-1 rounded-full border border-smoke-300 dark:border-charcoal-400/60 bg-smoke-200/60 dark:bg-charcoal-700/60 p-1">
            {ids.map((id) => (
                <Link
                    key={id}
                    href={hrefFor(id)}
                    className={[
                        'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                        id === value
                            ? 'bg-electric text-ink-900 shadow-sm'
                            : 'text-ash-500 dark:text-smoke-700 hover:text-charcoal-800 dark:hover:text-white',
                    ].join(' ')}
                >
                    {lanes.lanes[id].label}
                </Link>
            ))}
        </nav>
    )
}

/** Lane picker fed by index/lanes.json; renders nothing until lanes are published. */
export const LaneSelect: React.FC<{
    lanes: LanesIndex | null | undefined
    value: string
    onChange: (laneId: string) => void
}> = ({ lanes, value, onChange }) => {
    if (!lanes) return null
    const ids = Object.keys(lanes.lanes)
    if (ids.length === 0) return null
    const current = lanes.lanes[value]
    return (
        <div className="flex flex-col gap-1">
            <BrandSelect
                id="lane-select"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-80"
            >
                {ids.map((id) => {
                    const lane = lanes.lanes[id]
                    const suffix =
                        id === lanes.primary ? ' · primary' : lane.role === 'legacy' ? ' · legacy' : ''
                    return (
                        <option key={id} value={id}>
                            {lane.label}
                            {suffix}
                        </option>
                    )
                })}
            </BrandSelect>
            {current && (
                <span className="text-[11px] text-ash-500 dark:text-smoke-800">
                    {current.cadence} · {current.blocking ? 'blocking' : 'informational'}
                </span>
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
