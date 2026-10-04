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
