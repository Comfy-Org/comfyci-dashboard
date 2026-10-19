// Perf baselines as series: one scenario and one metric at a time, oldest to newest,
// with the class the frontend's own rule assigned to every point when it was ingested.
import { monthKey } from '../../utils/time'
import type { PerfClass, PerfCmp, PerfEntry, PerfLatest, PerfMetric } from './types'

export const PERF_CLASSES: PerfClass[] = ['r', 'i', 'n', 'x', '-']

export const isPerfClass = (value: unknown): value is PerfClass =>
    typeof value === 'string' && (PERF_CLASSES as string[]).includes(value)

/** One metric's class from an entry's cls string; null when absent or not a known char. */
export function decodeCls(cls: string | undefined, metricIndex: number): PerfClass | null {
    const ch = cls?.charAt(metricIndex)
    return isPerfClass(ch) ? ch : null
}

/** Wording per class; the rule is the frontend's (scripts/perf-stats.ts), published with the data. */
export const CLASS_META: Record<PerfClass, { text: string; title: string }> = {
    r: { text: 'Regression', title: 'z-score above 2 against the mean of the preceding baselines' },
    i: { text: 'Improvement', title: 'z-score below -2 against the mean of the preceding baselines' },
    n: {
        text: 'Neutral',
        title: 'Within 2 standard deviations of the preceding baselines, or a change under the metric minimum',
    },
    x: { text: 'Noisy', title: 'Preceding baselines vary by more than 50 % (CV): not judged' },
    '-': { text: 'Insufficient', title: 'Fewer than 2 preceding baselines to compare against' },
}

/** A class that should be looked at: the card opens by default for it. */
export const needsAttention = (cls: PerfClass | null) => cls === 'r' || cls === 'i' || cls === 'x'

/**
 * Short sha to show for a baseline: the first 7 of its commit, else the sha part of its
 * id ("<timestamp>-<sha8>", which the publisher takes from the baseline's file name).
 */
export function shortPerfSha(e: { id: string; c: string | null }): string {
    const sha = e.c ?? e.id.split('-')[1]
    return sha ? sha.slice(0, 7) : '—'
}

/** Head entries plus loaded monthly shards, de-duplicated by id, newest first. */
export function mergePerfEntries(head: PerfEntry[], shards: PerfEntry[]): PerfEntry[] {
    const seen = new Set<string>()
    const merged: PerfEntry[] = []
    for (const e of [...head, ...shards]) {
        if (seen.has(e.id)) continue
        seen.add(e.id)
        merged.push(e)
    }
    return merged.sort((a, b) => b.t - a.t)
}

/**
 * The next monthly shard to fetch, or null when everything the head counts is loaded.
 * The head may end part-way through a month: that month's full shard comes first, then
 * each older month in turn. Shared by the perf section and the CI table.
 */
export function nextMonth(
    head: { count: number; shards: Record<string, number> },
    loadedCount: number,
    oldestTs: number | null | undefined,
    loaded: string[]
): string | null {
    if (loadedCount === 0 || oldestTs == null || loadedCount >= head.count) return null
    const oldest = monthKey(oldestTs)
    const months = Object.keys(head.shards).sort().reverse()
    if (months.includes(oldest) && !loaded.includes(oldest)) return oldest
    return months.find((m) => m < oldest && !loaded.includes(m)) ?? null
}

export interface PerfPoint {
    id: string
    /** Full commit SHA; null when the baseline file carried none. */
    c: string | null
    t: number
    /** The run's mean for the metric; null when the metric was absent. */
    value: number | null
    cls: PerfClass | null
}

/** One scenario's values for one metric over the loaded entries, oldest to newest. */
export function perfSeries(entries: PerfEntry[], scenario: string, metricIndex: number): PerfPoint[] {
    const points: PerfPoint[] = []
    for (const e of entries) {
        const means = e.s[scenario]
        if (!means) continue
        points.push({
            id: e.id,
            c: e.c,
            t: e.t,
            value: means[metricIndex] ?? null,
            cls: decodeCls(e.cls[scenario], metricIndex),
        })
    }
    return points.reverse()
}

export const metricIndexOf = (metrics: PerfMetric[], key: string) => metrics.findIndex((m) => m.key === key)

/** The latest comparison tuple for a scenario and metric, or null when the scenario was not measured. */
export const latestCmp = (latest: PerfLatest | null | undefined, scenario: string, metricIndex: number): PerfCmp | null =>
    latest?.cmp[scenario]?.[metricIndex] ?? null

export interface ScenarioState {
    scenario: string
    cmp: PerfCmp | null
    cls: PerfClass | null
}

/** Every scenario's latest state for one metric, in the head's scenario order. */
export const scenarioStates = (
    latest: PerfLatest | null | undefined,
    scenarios: string[],
    metricIndex: number
): ScenarioState[] =>
    scenarios.map((scenario) => {
        const cmp = latestCmp(latest, scenario, metricIndex)
        return { scenario, cmp, cls: cmp ? cmp[5] : null }
    })

/** Scenario names with at least one metric in each non-neutral class at the latest baseline. */
export function latestSummary(latest: PerfLatest | null | undefined, scenarios: string[]) {
    const out = { regressions: [] as string[], improvements: [] as string[], noisy: [] as string[] }
    if (!latest) return out
    for (const scenario of scenarios) {
        const classes = (latest.cmp[scenario] ?? []).map((c) => c[5])
        if (classes.includes('r')) out.regressions.push(scenario)
        if (classes.includes('i')) out.improvements.push(scenario)
        if (classes.includes('x')) out.noisy.push(scenario)
    }
    return out
}

/** The two frame-time metrics, where the p5 fps target (1000 / fps ms) is a meaningful line. */
export const isFrameTimeMetric = (key: string) => key === 'frameDurationMs' || key === 'p95FrameDurationMs'

export const targetFrameMs = (p5Fps: number | undefined) => (p5Fps && p5Fps > 0 ? 1000 / p5Fps : null)

/** A value in the metric's unit: ms with two decimals under 10, bytes as MB, counts (unit "") as integers. */
export function formatMetric(value: number | null | undefined, unit: string): string {
    if (value == null || !isFinite(value)) return '—'
    if (unit === 'ms') return `${Math.abs(value) < 10 ? value.toFixed(2) : value.toFixed(1)} ms`
    if (unit === 'bytes') return `${(value / 1048576).toFixed(1)} MB`
    if (unit === '') return Math.round(value).toLocaleString()
    return `${value.toFixed(1)} ${unit}`
}

/** Signed change of the current median against the history mean, as a percentage string. */
export function formatDelta(cmp: PerfCmp | null): string | null {
    if (!cmp || cmp[0] == null || cmp[1] == null || cmp[1] === 0) return null
    const pct = ((cmp[0] - cmp[1]) / Math.abs(cmp[1])) * 100
    return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`
}
