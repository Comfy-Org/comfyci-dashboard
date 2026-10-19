import React from 'react'
import { FetchError } from '../FetchError'
import { BrandSelect } from '../Inputs'
import { Surface } from '../Surface'
import { PerfLegend } from './PerfBadge'
import { PerfScenarioCard, PerfScenarioRow } from './PerfScenarioCard'
import { SectionHead, SectionMissing, SectionSkeleton } from './SectionState'
import type { useFrontendPerf } from '../../src/frontend/client'
import { frontendCommitUrl, useFrontendPerfShards } from '../../src/frontend/client'
import {
    formatMetric,
    isFrameTimeMetric,
    mergePerfEntries,
    metricIndexOf,
    needsAttention,
    nextMonth,
    perfSeries,
    scenarioStates,
    shortPerfSha,
    targetFrameMs,
} from '../../src/frontend/perf'
import { formatRelative } from '../../utils/time'

const TITLE = 'Perf baselines'
const FILE = 'frontend/perf/head.json'
const dim = 'text-ash-500 dark:text-smoke-800'
const btn =
    'inline-flex h-8 items-center rounded-lg border border-smoke-300 dark:border-charcoal-400/60 px-3 text-xs font-medium text-charcoal-800 dark:text-smoke-200 transition hover:border-electric/50 dark:hover:text-electric disabled:cursor-not-allowed disabled:opacity-40'

/**
 * Perf history per scenario for one metric at a time. Cards open for every scenario
 * whose latest state is a regression, improvement or noisy; the rest fold into one-line
 * rows behind "Show all". The head carries the newest 100 baselines; "Load older"
 * appends a monthly shard.
 */
export const PerfSection: React.FC<{ query: ReturnType<typeof useFrontendPerf> }> = ({ query }) => {
    const head = query.data
    const [metricKey, setMetricKey] = React.useState<string | null>(null)
    const [showAll, setShowAll] = React.useState(false)
    const [olderMonths, setOlderMonths] = React.useState<string[]>([])
    const shardQueries = useFrontendPerfShards(olderMonths)

    if (query.isPending) return <SectionSkeleton title={TITLE} rows={4} />
    if (query.isError) {
        return (
            <FetchError
                what="the perf baselines"
                error={query.error}
                busy={query.isFetching}
                onRetry={() => query.refetch()}
            />
        )
    }
    if (!head) return <SectionMissing title={TITLE} file={FILE} />

    const metrics = head.metrics ?? []
    const key = metricKey != null && metricIndexOf(metrics, metricKey) !== -1 ? metricKey : metrics[0]?.key
    const mi = key != null ? metricIndexOf(metrics, key) : -1
    const metric = metrics[mi]
    const entries = mergePerfEntries(
        head.entries,
        shardQueries.flatMap((q) => q.data?.entries ?? [])
    )
    const loadingOlder = shardQueries.some((q) => q.isPending)
    const failedShard = shardQueries.find((q) => q.isError)
    const oldest = entries[entries.length - 1]
    const next = nextMonth(head, entries.length, oldest?.t, olderMonths)
    const caption = `${head.count} baselines · ${entries.length} loaded · ${head.scenarios.length} scenarios`

    if (!metric) {
        return (
            <Surface className="mb-6 p-5">
                <SectionHead title={TITLE} caption={caption} />
                <p className={`mt-2 text-sm ${dim}`}>No metrics are published for this data yet.</p>
            </Surface>
        )
    }

    const states = scenarioStates(head.latest, head.scenarios, mi)
    const attention = states.filter((s) => needsAttention(s.cls))
    const rest = states.filter((s) => !needsAttention(s.cls))
    const cards = showAll ? states : attention
    const targetMs = isFrameTimeMetric(metric.key) ? targetFrameMs(head.targets?.p5_fps) : null
    const minAbs = metric.min_abs_delta
    const gate = minAbs != null ? `; a change under ${formatMetric(minAbs, metric.unit)} is neutral` : ''
    // The thresholds are published with the data (the frontend's perf-stats.ts rule).
    const z = head.rule?.z ?? 2
    const cv = head.rule?.cv_noisy_pct ?? 50
    const rule = `Current median against the mean of the ${head.window} preceding baselines: regression at z above ${z}, improvement below -${z}, noisy when the history varies by more than ${cv} % (CV)${gate}.`
    const latest = head.latest
    const latestHref = latest ? frontendCommitUrl(latest.c) : null
    const latestSha = latest ? shortPerfSha(latest) : null
    const counts = !latest
        ? 'no comparison published for the latest baseline yet'
        : [
              `${attention.length} of ${states.length} scenarios need attention for ${metric.label}`,
              attention.length === 0 ? 'all neutral or insufficient' : null,
          ]
              .filter(Boolean)
              .join(' · ')

    return (
        <Surface className="mb-6 p-5">
            <SectionHead title={TITLE} caption={caption} />
            <div className="mt-3 flex flex-wrap items-center gap-3">
                <label htmlFor="perf-metric" className={`text-xs font-medium ${dim}`}>
                    Metric
                </label>
                <BrandSelect
                    id="perf-metric"
                    value={metric.key}
                    onChange={(e) => setMetricKey(e.target.value)}
                    className="w-64"
                >
                    {metrics.map((m) => (
                        <option key={m.key} value={m.key}>
                            {m.label}
                            {m.unit ? ` (${m.unit})` : ''}
                        </option>
                    ))}
                </BrandSelect>
                {latest && (
                    <span className={`text-xs ${dim}`}>
                        latest baseline{' '}
                        {latestHref ? (
                            <a href={latestHref} target="_blank" rel="noopener noreferrer" className="font-mono hover:underline">
                                {latestSha}
                            </a>
                        ) : (
                            <span className="font-mono">{latestSha}</span>
                        )}{' '}
                        · {formatRelative(latest.t)} · {latest.n_hist} preceding
                    </span>
                )}
            </div>
            <p className={`mt-2 text-[11px] ${dim}`}>{rule}</p>
            <p className="mt-3 text-xs text-charcoal-800 dark:text-smoke-200">{counts}</p>
            {cards.length > 0 && (
                <ul className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {cards.map((s) => (
                        <PerfScenarioCard
                            key={s.scenario}
                            scenario={s.scenario}
                            metric={metric}
                            points={perfSeries(entries, s.scenario, mi)}
                            cmp={s.cmp}
                            targetMs={targetMs}
                        />
                    ))}
                </ul>
            )}
            {!showAll && rest.length > 0 && (
                <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                    {rest.map((s) => (
                        <PerfScenarioRow key={s.scenario} scenario={s.scenario} metric={metric} cmp={s.cmp} />
                    ))}
                </ul>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3">
                {rest.length > 0 && (
                    <button type="button" onClick={() => setShowAll((v) => !v)} className={btn}>
                        {showAll ? 'Show fewer' : `Show all ${states.length} scenarios`}
                    </button>
                )}
                {next && (
                    <button
                        type="button"
                        disabled={loadingOlder}
                        onClick={() => setOlderMonths((months) => [...months, next])}
                        className={btn}
                    >
                        {loadingOlder ? 'Loading…' : `Load older (${head.count - entries.length} more)`}
                    </button>
                )}
                <PerfLegend />
            </div>
            {failedShard && (
                <FetchError
                    className="mt-4"
                    what="older baselines"
                    error={failedShard.error}
                    busy={failedShard.isFetching}
                    onRetry={() => failedShard.refetch()}
                />
            )}
        </Surface>
    )
}
