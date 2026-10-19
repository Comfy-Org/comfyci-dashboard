import React from 'react'
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, YAxis } from 'recharts'
import { PerfBadge } from './PerfBadge'
import { frontendCommitUrl } from '../../src/frontend/client'
import { CLASS_META, formatDelta, formatMetric, shortPerfSha } from '../../src/frontend/perf'
import type { PerfPoint } from '../../src/frontend/perf'
import type { PerfClass, PerfCmp, PerfMetric } from '../../src/frontend/types'

const dim = 'text-ash-500 dark:text-smoke-800'
const mono = 'font-mono text-xs font-semibold text-charcoal-800 dark:text-smoke-100'

// Marker colour per class; neutral and insufficient points get no marker, so the
// line itself shows where the frontend's rule fired.
const MARK: Partial<Record<PerfClass, string>> = { r: '#ef4444', i: '#10b981', x: '#f59e0b' }

/** Point renderer for recharts: a dot only on regression, improvement and noisy points. */
function Marker(props: { key?: string; cx?: number; cy?: number; payload?: PerfPoint }) {
    const { key, cx, cy, payload } = props
    const fill = payload?.cls ? MARK[payload.cls] : undefined
    return <circle key={key} cx={cx} cy={cy} r={fill ? 3 : 0} fill={fill ?? 'none'} stroke="none" />
}

/**
 * One scenario's history for one metric, oldest to newest, with the frontend's class on
 * every point and the p5 fps target as a dashed line on the frame-time metrics. The
 * stroke follows the theme accent through currentColor.
 */
export const PerfChart: React.FC<{
    points: PerfPoint[]
    unit: string
    targetMs: number | null
    height?: number
}> = ({ points, unit, targetMs, height = 56 }) => (
    <div className="w-full text-sapphire-700 dark:text-electric" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 6, right: 6, left: 6, bottom: 6 }}>
                {/* Hidden axis with a tight domain: small frame-time changes stay visible and the target line has an axis. */}
                <YAxis hide domain={['auto', 'auto']} />
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
                    formatter={(value: number) => [formatMetric(value, unit), 'mean']}
                    labelFormatter={(_, payload) => {
                        const p = payload?.[0]?.payload as PerfPoint | undefined
                        if (!p) return ''
                        const cls = p.cls ? ` · ${CLASS_META[p.cls].text}` : ''
                        return `${shortPerfSha(p)} · ${new Date(p.t * 1000).toLocaleString()}${cls}`
                    }}
                />
                {targetMs != null && (
                    <ReferenceLine y={targetMs} stroke="#f59e0b" strokeDasharray="3 3" ifOverflow="extendDomain" />
                )}
                <Line
                    type="monotone"
                    dataKey="value"
                    stroke="currentColor"
                    strokeWidth={2}
                    dot={Marker}
                    activeDot={{ r: 3 }}
                    connectNulls
                    isAnimationActive={false}
                />
            </LineChart>
        </ResponsiveContainer>
    </div>
)

/** The comparison behind a badge: history mean and spread, n, z and the change. */
function statsLine(cmp: PerfCmp | null, unit: string): string {
    if (!cmp) return 'not in the latest baseline'
    const spread = cmp[2] != null ? ` ± ${formatMetric(cmp[2], unit)}` : ''
    return [
        `history ${formatMetric(cmp[1], unit)}${spread}`,
        `n ${cmp[3]}`,
        cmp[4] != null ? `z ${cmp[4].toFixed(2)}` : null,
        formatDelta(cmp),
    ]
        .filter(Boolean)
        .join(' · ')
}

export const PerfScenarioCard: React.FC<{
    scenario: string
    metric: PerfMetric
    points: PerfPoint[]
    cmp: PerfCmp | null
    targetMs: number | null
}> = ({ scenario, metric, points, cmp, targetMs }) => {
    const latest = points[points.length - 1]
    const href = latest ? frontendCommitUrl(latest.c) : null
    const stats = statsLine(cmp, metric.unit)
    const current = cmp ? cmp[0] : latest?.value
    return (
        <li className="min-w-0 rounded-xl border border-smoke-300 dark:border-charcoal-400/60 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
                <span className={`min-w-0 truncate ${mono}`} title={scenario}>
                    {scenario}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                    <PerfBadge cls={cmp ? cmp[5] : null} />
                    <span className="font-mono text-xs tabular-nums text-charcoal-800 dark:text-smoke-100">
                        {formatMetric(current, metric.unit)}
                    </span>
                </span>
            </div>
            <div className="mt-2">
                <PerfChart points={points} unit={metric.unit} targetMs={targetMs} />
            </div>
            <div className={`mt-1 truncate text-[11px] ${dim}`} title={stats}>
                {stats}
                {targetMs != null && ` · target ${formatMetric(targetMs, 'ms')} dashed`}
            </div>
            <div className={`mt-0.5 text-[11px] ${dim}`}>
                {points.length} baseline{points.length === 1 ? '' : 's'} loaded
                {latest && (
                    <>
                        {' · latest '}
                        {href ? (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="font-mono hover:underline">
                                {shortPerfSha(latest)}
                            </a>
                        ) : (
                            <span className="font-mono">{shortPerfSha(latest)}</span>
                        )}
                    </>
                )}
            </div>
        </li>
    )
}

/** Collapsed form of a card: name, badge and the latest value on one line. */
export const PerfScenarioRow: React.FC<{ scenario: string; metric: PerfMetric; cmp: PerfCmp | null }> = ({
    scenario,
    metric,
    cmp,
}) => (
    <li
        className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-smoke-300 dark:border-charcoal-400/60 px-3 py-1.5"
        title={statsLine(cmp, metric.unit)}
    >
        <span className={`min-w-0 truncate ${mono}`}>{scenario}</span>
        <span className="flex shrink-0 items-center gap-2">
            <PerfBadge cls={cmp ? cmp[5] : null} />
            <span className={`font-mono text-[11px] tabular-nums ${dim}`}>
                {formatMetric(cmp ? cmp[0] : null, metric.unit)}
            </span>
        </span>
    </li>
)
