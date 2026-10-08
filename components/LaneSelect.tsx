import React from 'react'
import { BrandSelect } from './Inputs'
import type { LanesIndex } from '../src/regression/types'

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
