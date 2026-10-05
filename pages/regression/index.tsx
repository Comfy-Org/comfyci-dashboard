import { Spinner } from 'flowbite-react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React from 'react'
import { FetchError } from '../../components/FetchError'
import { HistoryTable } from '../../components/HistoryTable'
import { ClearableLabel } from '../../components/Labels/ClearableLabel'
import { LaneMissingNotice, LaneSelect } from '../../components/LaneSelect'
import { Pager } from '../../components/Pager'
import { RegressionBadge, displayVerdict } from '../../components/RegressionBadge'
import { Sparkline } from '../../components/Sparkline'
import { StaleBanner } from '../../components/StaleBanner'
import { StatCard } from '../../components/StatsDashboard'
import { Surface, SectionTitle } from '../../components/Surface'
import {
    COMFY_REPO,
    resolveLane,
    useIndexHead,
    useIndexShards,
    useLanes,
    useLatestPointer,
    useRegressionSummary,
} from '../../src/regression/client'
import type { LaneRef } from '../../src/regression/client'
import type {
    FirstBad,
    IndexEntry,
    IndexHead,
    LaneInfo,
    LatestPointer,
    RegressionSummary,
} from '../../src/regression/types'
import { formatRelative, monthKey, shortDate } from '../../utils/time'

const DEFAULT_BRANCH = 'master'
const PAGE_SIZE = 25
const KPI_WINDOW = 30
const SPARK_WINDOW = 60

/** Head entries plus any loaded monthly shards, de-duplicated and newest first. */
function mergeEntries(head: IndexEntry[], shards: IndexEntry[]): IndexEntry[] {
    const seen = new Set<string>()
    const merged: IndexEntry[] = []
    for (const e of [...head, ...shards]) {
        const key = `${e.c}:${e.t}`
        if (seen.has(key)) continue
        seen.add(key)
        merged.push(e)
    }
    return merged.sort((a, b) => b.t - a.t)
}

/** The next monthly shard to fetch, or null when everything the index counts is loaded. */
function nextShard(head: IndexHead, entries: IndexEntry[], loaded: string[]): string | null {
    if (entries.length === 0 || entries.length >= head.count) return null
    const oldest = monthKey(entries[entries.length - 1].t)
    const shards = [...head.shards].sort().reverse()
    // The head index may end part-way through a month: fetch that month's full shard first.
    if (shards.includes(oldest) && !loaded.includes(oldest)) return oldest
    return shards.find((s) => s < oldest && !loaded.includes(s)) ?? null
}

function EmptyState({ branch }: { branch: string }) {
    return (
        <Surface className="flex flex-col items-center justify-center gap-2 py-24 text-center">
            <span className="text-lg font-semibold">No regression runs yet</span>
            <span className="text-sm text-ash-500 dark:text-smoke-800">
                No runs have been published for branch <span className="font-mono">{branch}</span>.
            </span>
        </Surface>
    )
}

// Pre-index fallback: the latest pointer plus its summary, as the page showed before
// the worker published a run index.
function LatestRunCard({
    branch,
    laneId,
    latest,
    summary,
}: {
    branch: string
    laneId: string
    latest: LatestPointer
    summary: RegressionSummary | null | undefined
}) {
    const href = `/regression/${branch}/${latest.commit}?lane=${laneId}`
    const workflows = summary
        ? Object.values(summary.workflows).sort((a, b) => a.workflow_id.localeCompare(b.workflow_id))
        : []
    return (
        <Surface className="p-5">
            <SectionTitle>Latest run on {branch}</SectionTitle>
            <div className="mt-2 flex items-center gap-3">
                <Link
                    href={href}
                    className="font-mono text-lg font-bold text-sapphire-700 dark:text-electric hover:underline"
                >
                    {latest.commit.slice(0, 12)}
                </Link>
                {summary && <RegressionBadge verdict={summary.overall === 'pass' ? 'pass' : 'fail'} />}
            </div>
            <p className="mt-1 text-xs text-ash-500 dark:text-smoke-800">
                {new Date(latest.run_ts * 1000).toLocaleString()}
            </p>
            {workflows.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-4">
                    {workflows.map((wf) => (
                        <Link
                            key={wf.workflow_id}
                            href={href}
                            className="flex items-center gap-2 rounded-xl border border-smoke-300 dark:border-charcoal-400/60 px-4 py-3 hover:border-electric/50"
                        >
                            <span className="font-semibold text-charcoal-800 dark:text-smoke-100">
                                {wf.workflow_id}
                            </span>
                            <RegressionBadge verdict={wf.verdict} />
                        </Link>
                    ))}
                </div>
            )}
        </Surface>
    )
}

function FirstBadBanner({
    wf,
    fb,
    branch,
    laneId,
    entries,
}: {
    wf: string
    fb: FirstBad
    branch: string
    laneId: string
    entries: IndexEntry[]
}) {
    const subject = entries.find((e) => e.c === fb.commit)?.m?.s
    const dim = 'text-red-600/80 dark:text-red-400/80'
    return (
        <div
            role="alert"
            className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-4 py-2.5 text-sm text-red-600 dark:text-red-400"
        >
            <span className="font-mono font-semibold">{wf}</span>
            <span>failing since</span>
            <Link
                href={`/regression/${branch}/${fb.commit}?lane=${laneId}`}
                className="font-mono font-semibold hover:underline"
            >
                {fb.commit.slice(0, 7)}
            </Link>
            {(fb.pr != null || fb.author) && (
                <span>
                    (
                    {fb.pr != null && (
                        <a
                            href={`${COMFY_REPO}/pull/${fb.pr}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                        >
                            #{fb.pr}
                        </a>
                    )}
                    {fb.pr != null && fb.author && ', '}
                    {fb.author})
                </span>
            )}
            {subject && (
                <span className={`max-w-md truncate ${dim}`} title={subject}>
                    — {subject}
                </span>
            )}
            <span className={dim}>
                · {fb.runs} run{fb.runs === 1 ? '' : 's'} · since {shortDate(fb.run_ts)}
                {fb.golden ? ` · vs golden ${fb.golden}` : ''}
            </span>
            {fb.prev_good && (
                <span className={dim}>
                    · last good{' '}
                    <Link
                        href={`/regression/${branch}/${fb.prev_good}?lane=${laneId}`}
                        className="font-mono hover:underline"
                    >
                        {fb.prev_good.slice(0, 7)}
                    </Link>
                </span>
            )}
        </div>
    )
}

function LaneKpis({
    entries,
    workflows,
    goldens,
}: {
    entries: IndexEntry[]
    workflows: string[]
    goldens?: LaneInfo['goldens']
}) {
    const window = entries.slice(0, KPI_WINDOW)
    const scored = window.filter((e) => !e.infra)
    const passed = scored.filter((e) => e.o === 'pass').length
    const infra = window.length - scored.length
    const latest = entries[0]
    const open = latest
        ? workflows.filter((wf) => {
              const cell = latest.w[wf]
              return (
                  !!cell &&
                  displayVerdict(cell.v, cell.sha, goldens?.[wf]?.sha, cell.d).verdict === 'fail'
              )
          })
        : []
    const primaryWf = workflows[0]
    const execs = window
        .map((e) => e.w[primaryWf]?.exec)
        .filter((x): x is number => x != null)
        .sort((a, b) => a - b)
    const median = execs.length ? execs[Math.floor(execs.length / 2)] : null

    return (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
                label="Pass Rate"
                value={scored.length ? `${((passed / scored.length) * 100).toFixed(0)}%` : '—'}
                sub={`${passed} of ${scored.length} scored${infra ? ` · ${infra} infra` : ''} · last ${window.length} runs`}
                dotClass="bg-emerald-600 dark:bg-emerald-400"
                valueClass="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
                label="Open Regressions"
                value={open.length}
                sub={open.length ? open.join(', ') : 'latest run is clean'}
                dotClass="bg-red-600 dark:bg-red-400"
                valueClass={
                    open.length ? 'text-red-600 dark:text-red-400' : 'text-charcoal-400 dark:text-smoke-500'
                }
            />
            <StatCard
                label="Median Exec"
                value={median == null ? '—' : `${median.toFixed(1)}s`}
                sub={primaryWf ? `${primaryWf} · last ${window.length} runs` : 'no workflows'}
                dotClass="bg-plum-600 dark:bg-plum-300"
                valueClass="text-plum-600 dark:text-plum-300"
            />
            <StatCard
                label="Last Run"
                value={latest ? formatRelative(latest.t) : '—'}
                sub={latest ? new Date(latest.t * 1000).toLocaleString() : undefined}
                dotClass="bg-sapphire-700 dark:bg-electric"
                valueClass="text-sapphire-700 dark:text-electric"
            />
        </div>
    )
}

function Trends({ entries, workflows }: { entries: IndexEntry[]; workflows: string[] }) {
    const window = entries.slice(0, SPARK_WINDOW)
    if (window.length < 2) return null
    return (
        <Surface className="mb-6 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <SectionTitle>Drift vs golden</SectionTitle>
                <span className="text-[11px] text-ash-500 dark:text-smoke-800">
                    mean MSE per run · last {window.length} runs, oldest to newest
                </span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {workflows.map((wf) => {
                    const points = window
                        .map((e) => ({ commit: e.c, ts: e.t, value: e.w[wf]?.mse ?? null }))
                        .reverse()
                    const latest = points[points.length - 1]?.value
                    return (
                        <div
                            key={wf}
                            className="rounded-xl border border-smoke-300 dark:border-charcoal-400/60 px-4 py-3"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-xs font-semibold text-charcoal-800 dark:text-smoke-100">
                                    {wf}
                                </span>
                                <span className="font-mono text-xs tabular-nums text-ash-500 dark:text-smoke-800">
                                    {latest == null ? '—' : latest.toFixed(3)}
                                </span>
                            </div>
                            <div className="mt-2">
                                <Sparkline points={points} />
                            </div>
                        </div>
                    )
                })}
            </div>
        </Surface>
    )
}

// Keyed on branch + lane by the page so paging and loaded shards reset with them.
function LaneHistory({ branch, lane }: { branch: string; lane: LaneRef & { info?: LaneInfo } }) {
    const headQuery = useIndexHead(branch, lane.id)
    const head = headQuery.data
    // Only a null result (the file is not published) means the index is absent; a failed
    // fetch is reported as such below, never read as "nothing published".
    const headMissing = headQuery.isSuccess && head == null
    // Pre-index fallback, only consulted once the index is known to be absent.
    const latestQuery = useLatestPointer(headMissing ? branch : undefined, lane)
    const latest = latestQuery.data
    const summaryQuery = useRegressionSummary(headMissing ? branch : undefined, latest?.commit, lane)

    const [page, setPage] = React.useState(1)
    const [olderMonths, setOlderMonths] = React.useState<string[]>([])
    const shardQueries = useIndexShards(branch, lane.id, olderMonths)
    const loadingOlder = shardQueries.some((q) => q.isPending)
    const failedShard = shardQueries.find((q) => q.isError)

    const entries = mergeEntries(
        head?.entries ?? [],
        shardQueries.flatMap((q) => q.data?.entries ?? [])
    )
    const workflows = Array.from(new Set(entries.flatMap((e) => Object.keys(e.w)))).sort()
    const goldens = lane.info?.goldens
    const next = head ? nextShard(head, entries, olderMonths) : null
    const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
    const pageEntries = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    if (
        headQuery.isPending ||
        (headMissing && (latestQuery.isPending || (latest && summaryQuery.isPending)))
    ) {
        return (
            <div className="flex justify-center items-center py-24">
                <Spinner size="xl" />
            </div>
        )
    }

    if (headQuery.isError) {
        return (
            <FetchError
                what="the run index"
                error={headQuery.error}
                busy={headQuery.isFetching}
                onRetry={() => headQuery.refetch()}
            />
        )
    }

    if (!head) {
        if (latestQuery.isError) {
            return (
                <FetchError
                    what="the latest run pointer"
                    error={latestQuery.error}
                    busy={latestQuery.isFetching}
                    onRetry={() => latestQuery.refetch()}
                />
            )
        }
        // lanes.json names each lane's branches: one it leaves out has no runs on this lane.
        const unlistedBranch = lane.info && !lane.info.branches?.[branch] ? branch : undefined
        return (
            <>
                <StaleBanner
                    latestTs={latest?.run_ts ?? null}
                    indexMissing
                    cadence={lane.info?.cadence}
                    unlistedBranch={unlistedBranch}
                />
                {summaryQuery.isError && (
                    <FetchError
                        what="the latest run summary"
                        error={summaryQuery.error}
                        busy={summaryQuery.isFetching}
                        onRetry={() => summaryQuery.refetch()}
                    />
                )}
                {latest ? (
                    <LatestRunCard
                        branch={branch}
                        laneId={lane.id}
                        latest={latest}
                        summary={summaryQuery.data}
                    />
                ) : (
                    <EmptyState branch={branch} />
                )}
            </>
        )
    }

    const firstBad = Object.entries(head.first_bad ?? {})
        .sort(([a], [b]) => a.localeCompare(b))
        .filter(([wf]) => {
            // A re-blessed golden closes the chain even before the next run reports a pass.
            const cell = entries[0]?.w[wf]
            return !cell || displayVerdict(cell.v, cell.sha, goldens?.[wf]?.sha, cell.d).verdict !== 'accepted'
        })

    return (
        <>
            <StaleBanner
                latestTs={head.latest?.run_ts ?? entries[0]?.t ?? null}
                indexMissing={false}
                cadence={lane.info?.cadence}
            />
            {firstBad.map(([wf, fb]) => (
                <FirstBadBanner key={wf} wf={wf} fb={fb} branch={branch} laneId={lane.id} entries={entries} />
            ))}
            <LaneKpis entries={entries} workflows={workflows} goldens={goldens} />
            <Trends entries={entries} workflows={workflows} />
            {entries.length === 0 ? (
                <EmptyState branch={branch} />
            ) : (
                <>
                    <HistoryTable
                        branch={branch}
                        laneId={lane.id}
                        entries={pageEntries}
                        workflows={workflows}
                        goldens={goldens}
                    />
                    {failedShard && (
                        <FetchError
                            className="mt-6"
                            what="older runs"
                            error={failedShard.error}
                            busy={failedShard.isFetching}
                            onRetry={() => failedShard.refetch()}
                        />
                    )}
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                        <Pager currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                        {next && (
                            <button
                                type="button"
                                disabled={loadingOlder}
                                onClick={() => setOlderMonths((months) => [...months, next])}
                                className="inline-flex h-9 items-center rounded-lg border border-smoke-300 dark:border-charcoal-400/60 px-3 text-sm font-medium text-charcoal-800 dark:text-smoke-200 transition hover:border-electric/50 dark:hover:text-electric disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {loadingOlder ? 'Loading…' : `Load older (${head.count - entries.length} more)`}
                            </button>
                        )}
                    </div>
                    <p className="mt-2 text-center text-[11px] text-ash-500 dark:text-smoke-800">
                        Showing {entries.length} of {head.count} runs · index generated{' '}
                        {formatRelative(head.generated_ts)}
                    </p>
                </>
            )}
        </>
    )
}

export default function RegressionIndexPage() {
    const router = useRouter()
    const [branch, setBranch] = React.useState(DEFAULT_BRANCH)
    const [commitLookup, setCommitLookup] = React.useState('')

    React.useEffect(() => {
        const b = router.query.branch
        if (typeof b === 'string' && b) setBranch(b)
    }, [router.query.branch])

    const laneParam = typeof router.query.lane === 'string' ? router.query.lane : undefined
    const lanesQuery = useLanes()
    const lane = resolveLane(lanesQuery.data, laneParam)
    const ready = router.isReady && !lanesQuery.isPending
    const selectLane = (id: string) =>
        router.replace(
            { pathname: router.pathname, query: { ...router.query, lane: id } },
            undefined,
            { shallow: true }
        )

    return (
        <div className="pt-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-charcoal-800 dark:text-white">
                        GPU Regression
                    </h1>
                    <p className="mt-1 text-sm text-ash-500 dark:text-smoke-800">
                        Curated fixed-seed workflows run on serverless GPUs for every push, compared
                        against golden baselines and the previous run.
                    </p>
                </div>
                <LaneSelect lanes={lanesQuery.data} value={lane.id} onChange={selectLane} />
            </div>

            <Surface className="mb-6 p-4">
                <SectionTitle className="mb-3">Lookup</SectionTitle>
                <div className="flex flex-wrap items-center gap-3">
                    <ClearableLabel
                        id="regression-branch"
                        label="Branch"
                        value={branch}
                        onChange={setBranch}
                        onClear={() => setBranch(DEFAULT_BRANCH)}
                    />
                    <ClearableLabel
                        id="regression-commit"
                        label="Commit SHA"
                        value={commitLookup}
                        onChange={setCommitLookup}
                        onClear={() => setCommitLookup('')}
                    />
                    {commitLookup ? (
                        <Link
                            href={`/regression/${branch}/${commitLookup.trim()}?lane=${lane.id}`}
                            className="rounded-lg border border-smoke-300 dark:border-charcoal-400/60 px-3 py-1.5 text-sm font-medium text-charcoal-800 dark:text-smoke-200 hover:border-electric/50 hover:text-electric"
                        >
                            Open commit
                        </Link>
                    ) : (
                        <span
                            aria-disabled
                            className="rounded-lg border border-smoke-300 dark:border-charcoal-400/60 px-3 py-1.5 text-sm font-medium text-ash-500/50"
                        >
                            Open commit
                        </span>
                    )}
                </div>
            </Surface>

            {!ready ? (
                <div className="flex justify-center items-center py-24">
                    <Spinner size="xl" />
                </div>
            ) : lanesQuery.isError ? (
                <FetchError
                    what="the lane index"
                    error={lanesQuery.error}
                    busy={lanesQuery.isFetching}
                    onRetry={() => lanesQuery.refetch()}
                />
            ) : (
                <>
                    {lane.missing && (
                        <LaneMissingNotice missing={lane.missing} showing={lane.info?.label ?? lane.id} />
                    )}
                    <LaneHistory key={`${branch}:${lane.id}`} branch={branch} lane={lane} />
                </>
            )}
        </div>
    )
}
