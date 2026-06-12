import React from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ActionJobResult, WorkflowRunStatus } from '../src/api/generated'
import { Surface, SectionTitle } from './Surface'
import { formatDuration } from '../utils/format'

interface DashboardStats {
    total: number
    completed: number
    failed: number
    inProgress: number
    successRate: number | null
    avgRunSeconds: number
    osBreakdown: { name: string; count: number }[]
}

function computeStats(results: ActionJobResult[]): DashboardStats {
    let completed = 0
    let failed = 0
    let inProgress = 0
    let runSecondsSum = 0
    let runSecondsCount = 0
    const osCounts: Record<string, number> = {}

    for (const r of results) {
        switch (r.status) {
            case WorkflowRunStatus.WorkflowRunStatusCompleted:
                completed++
                break
            case WorkflowRunStatus.WorkflowRunStatusFailed:
                failed++
                break
            case WorkflowRunStatus.WorkflowRunStatusStarted:
                inProgress++
                break
        }
        if (typeof r.end_time === 'number' && typeof r.start_time === 'number') {
            runSecondsSum += Math.abs(r.end_time - r.start_time)
            runSecondsCount++
        }
        const os = r.operating_system || 'unknown'
        osCounts[os] = (osCounts[os] || 0) + 1
    }

    const finished = completed + failed
    return {
        total: results.length,
        completed,
        failed,
        inProgress,
        successRate: finished > 0 ? (completed / finished) * 100 : null,
        avgRunSeconds: runSecondsCount > 0 ? runSecondsSum / runSecondsCount : 0,
        osBreakdown: Object.entries(osCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count),
    }
}

const StatCard: React.FC<{
    label: string
    value: React.ReactNode
    sub?: string
    dotClass: string
    valueClass?: string
}> = ({ label, value, sub, dotClass, valueClass = '' }) => (
    <Surface className="p-5">
        <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
            <SectionTitle>{label}</SectionTitle>
        </div>
        <div className={`mt-2 text-3xl font-extrabold tracking-tight ${valueClass}`}>
            {value}
        </div>
        {sub && (
            <div className="mt-1 text-xs text-ash-500 dark:text-smoke-800">{sub}</div>
        )}
    </Surface>
)

// Status colors stay semantic (green/red/amber) for at-a-glance CI clarity.
const STATUS_COLORS = {
    completed: '#10b981',
    failed: '#ef4444',
    inProgress: '#fbbf24',
}

// OS bars: electric-yellow is the dark-mode signature, but it's invisible on
// white — so each bar color is theme-aware (dark accent in light mode).
const OS_BAR_CLASSES = [
    'bg-sapphire-700 dark:bg-electric',
    'bg-plum-600 dark:bg-plum-400',
    'bg-emerald-600 dark:bg-emerald-400',
    'bg-plum-400 dark:bg-plum-300',
    'bg-sky-600 dark:bg-sky-400',
]

export const StatsDashboard: React.FC<{ results: ActionJobResult[] }> = ({
    results,
}) => {
    const stats = React.useMemo(() => computeStats(results), [results])

    const donutData = [
        { name: 'Success', value: stats.completed, color: STATUS_COLORS.completed },
        { name: 'Failed', value: stats.failed, color: STATUS_COLORS.failed },
        { name: 'In Progress', value: stats.inProgress, color: STATUS_COLORS.inProgress },
    ].filter((d) => d.value > 0)

    const maxOsCount = Math.max(1, ...stats.osBreakdown.map((o) => o.count))

    return (
        <section className="brand-aura mb-8">
            {/* KPI row */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                    label="Workflow Runs"
                    value={stats.total}
                    sub="in current view"
                    dotClass="bg-sapphire-700 dark:bg-electric"
                    valueClass="text-sapphire-700 dark:text-electric"
                />
                <StatCard
                    label="Success Rate"
                    value={
                        stats.successRate === null
                            ? '—'
                            : `${stats.successRate.toFixed(1)}%`
                    }
                    sub={`${stats.completed} passed${stats.failed ? ` · ${stats.failed} failed` : ''}`}
                    dotClass="bg-emerald-600 dark:bg-emerald-400"
                    valueClass="text-emerald-600 dark:text-emerald-400"
                />
                <StatCard
                    label="Failed"
                    value={stats.failed}
                    sub={stats.inProgress ? `${stats.inProgress} in progress` : 'no active failures pending'}
                    dotClass="bg-red-600 dark:bg-red-400"
                    valueClass={stats.failed > 0 ? 'text-red-600 dark:text-red-400' : 'text-charcoal-400 dark:text-smoke-500'}
                />
                <StatCard
                    label="Avg Run Time"
                    value={formatDuration(stats.avgRunSeconds)}
                    sub="per workflow"
                    dotClass="bg-plum-600 dark:bg-plum-300"
                    valueClass="text-plum-600 dark:text-plum-300"
                />
            </div>

            {/* Charts row */}
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Status donut */}
                <Surface className="p-5">
                    <SectionTitle>Status Breakdown</SectionTitle>
                    <div className="mt-2 flex items-center gap-4">
                        <div className="relative h-36 w-36 shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={donutData.length ? donutData : [{ name: 'No data', value: 1, color: '#3c3d42' }]}
                                        dataKey="value"
                                        innerRadius={46}
                                        outerRadius={64}
                                        paddingAngle={donutData.length > 1 ? 3 : 0}
                                        stroke="none"
                                    >
                                        {(donutData.length ? donutData : [{ color: '#3c3d42' }]).map(
                                            (d, i) => (
                                                <Cell key={i} fill={d.color} />
                                            )
                                        )}
                                    </Pie>
                                    {donutData.length > 0 && (
                                        <Tooltip
                                            contentStyle={{
                                                background: '#19161a',
                                                border: '1px solid #3c3d42',
                                                borderRadius: 8,
                                            }}
                                            itemStyle={{ color: '#f3f3f3' }}
                                            labelStyle={{ color: '#f3f3f3' }}
                                        />
                                    )}
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-extrabold leading-none">
                                    {stats.total}
                                </span>
                                <span className="text-[10px] uppercase tracking-wider text-ash-500 dark:text-smoke-800">
                                    runs
                                </span>
                            </div>
                        </div>
                        <ul className="flex flex-col gap-2 text-sm">
                            {[
                                { label: 'Success', value: stats.completed, color: STATUS_COLORS.completed },
                                { label: 'Failed', value: stats.failed, color: STATUS_COLORS.failed },
                                { label: 'In Progress', value: stats.inProgress, color: STATUS_COLORS.inProgress },
                            ].map((s) => (
                                <li key={s.label} className="flex items-center gap-2">
                                    <span
                                        className="h-2.5 w-2.5 rounded-full"
                                        style={{ backgroundColor: s.color }}
                                    />
                                    <span className="text-ash-500 dark:text-smoke-700">
                                        {s.label}
                                    </span>
                                    <span className="font-semibold">{s.value}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </Surface>

                {/* OS breakdown */}
                <Surface className="p-5 lg:col-span-2">
                    <SectionTitle>Operating Systems</SectionTitle>
                    <div className="mt-3 flex flex-col gap-3">
                        {stats.osBreakdown.length === 0 && (
                            <div className="text-sm text-ash-500 dark:text-smoke-800">
                                No data in current view.
                            </div>
                        )}
                        {stats.osBreakdown.map((os, i) => (
                            <div key={os.name} className="flex items-center gap-3">
                                <div className="w-40 shrink-0 truncate text-sm font-medium">
                                    {os.name}
                                </div>
                                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-smoke-300 dark:bg-charcoal-400/50">
                                    <div
                                        className={`h-full rounded-full ${OS_BAR_CLASSES[i % OS_BAR_CLASSES.length]}`}
                                        style={{ width: `${(os.count / maxOsCount) * 100}%` }}
                                    />
                                </div>
                                <div className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums">
                                    {os.count}
                                </div>
                            </div>
                        ))}
                    </div>
                </Surface>
            </div>
        </section>
    )
}

export default StatsDashboard
