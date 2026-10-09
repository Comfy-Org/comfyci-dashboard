import React from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts'

export interface SparkPoint {
    commit: string
    ts: number
    value: number | null
}

/**
 * Tiny single-series line, chronological left to right (e.g. mean MSE vs golden per
 * run). Same tooltip chrome as UsageGraph; the stroke follows the theme accent
 * (sapphire on light, electric on dark) through currentColor, since electric yellow
 * is invisible on white. Runs without a value (infra errors) are bridged so the
 * trend stays readable.
 */
export const Sparkline: React.FC<{ points: SparkPoint[]; unit?: string; height?: number }> = ({
    points,
    unit = 'MSE',
    height = 44,
}) => (
    <div className="w-full text-sapphire-700 dark:text-electric" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <Tooltip
                    contentStyle={{
                        background: '#19161a',
                        border: '1px solid #3c3d42',
                        borderRadius: 8,
                        color: '#f3f3f3',
                        fontSize: 12,
                    }}
                    itemStyle={{ color: '#f3f3f3' }}
                    labelStyle={{ color: '#8a8a8a' }}
                    cursor={{ stroke: '#55565e', strokeDasharray: '3 3' }}
                    formatter={(value: number) => [value.toFixed(4), unit]}
                    labelFormatter={(_, payload) => {
                        const p = payload?.[0]?.payload as SparkPoint | undefined
                        return p
                            ? `${p.commit.slice(0, 7)} · ${new Date(p.ts * 1000).toLocaleDateString()}`
                            : ''
                    }}
                />
                <Line
                    type="monotone"
                    dataKey="value"
                    stroke="currentColor"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                />
            </LineChart>
        </ResponsiveContainer>
    </div>
)
