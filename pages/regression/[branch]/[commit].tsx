import { Spinner } from 'flowbite-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React from 'react'
import { FiExternalLink } from 'react-icons/fi'
import { CommitMetaChip } from '../../../components/CommitMetaChip'
import { LaneTabs } from '../../../components/LaneSelect'
import { MetricTable } from '../../../components/MetricTable'
import { RegressionBadge, displayVerdict } from '../../../components/RegressionBadge'
import type { DisplayState } from '../../../components/RegressionBadge'
import { ReblessCallout } from '../../../components/ReblessCallout'
import { RegressionSummaryHeader } from '../../../components/RegressionSummaryHeader'
import { Surface, SectionTitle } from '../../../components/Surface'
import {
    COMFY_REPO,
    figureUrl,
    outputUrl,
    resolveLane,
    useIndexHead,
    useLanes,
    useNoiseFloor,
    useRegressionSummary,
    useRunRecord,
} from '../../../src/regression/client'
import type { LaneRef } from '../../../src/regression/client'
import type {
    CommitMeta,
    IndexWorkflowCell,
    RegressionSummary,
    RunEnv,
    WorkflowRegressionResult,
} from '../../../src/regression/types'

function Figure({ src, caption }: { src: string; caption: string }) {
    const [failed, setFailed] = React.useState(false)
    if (failed) return null
    return (
        <figure className="min-w-0">
            <a href={src} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element -- figure sizes vary; plain img keeps aspect */}
                <img
                    src={src}
                    alt={caption}
                    onError={() => setFailed(true)}
                    className="max-h-96 w-auto rounded-lg border border-smoke-300 dark:border-charcoal-400/60"
                />
            </a>
            <figcaption className="mt-1 text-[11px] text-ash-500 dark:text-smoke-800">
                {caption}
            </figcaption>
        </figure>
    )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-ash-500 dark:text-smoke-800">
                {label}
            </div>
            <div className="font-mono text-xs tabular-nums text-charcoal-800 dark:text-smoke-200">
                {value}
            </div>
        </div>
    )
}

const gb = (mb: number | null | undefined) =>
    mb == null ? null : `${(mb / 1024).toFixed(1)} GB`

const formatBackends = (b: RunEnv['runtime_backends']) => {
    if (!b) return null
    if (typeof b === 'string') return b
    if (Array.isArray(b)) return b.join(', ')
    return Object.entries(b)
        .map(([k, v]) => (v === true ? k : `${k}=${v}`))
        .join(', ')
}

// How a workflow result reads on this page once the index entry's drift info is folded
// in. Only the index knows whether the previous run failed against the same golden, so
// without an entry a failing run reads as a regression even when its output is
// bit-identical to the previous run's (a re-blessed golden produces exactly that); the
// summary line still says the output is unchanged.
function workflowState(
    result: WorkflowRegressionResult,
    cell: IndexWorkflowCell | undefined,
    goldenSha: string | null | undefined
): DisplayState {
    return displayVerdict(result.verdict, cell?.sha ?? result.output_sha256, goldenSha, cell?.d ?? null)
}

// The worker's overall is pass/fail; soften it the same way the history table does
// when every failure is inherited or accepted.
function overallState(summary: RegressionSummary, states: Record<string, DisplayState>): DisplayState {
    if (summary.overall === 'pass') return { verdict: 'pass', inherited: false }
    const all = Object.values(states)
    const failing = all.filter((s) => s.verdict === 'fail')
    if (failing.length === 0 && all.some((s) => s.verdict === 'accepted')) {
        return { verdict: 'accepted', inherited: false }
    }
    return { verdict: 'fail', inherited: failing.length > 0 && failing.every((s) => s.inherited) }
}

function WorkflowCard({
    branch,
    commit,
    lane,
    result,
    state,
    summaryEnv,
}: {
    branch: string
    commit: string
    lane: LaneRef
    result: WorkflowRegressionResult
    state: DisplayState
    summaryEnv?: RunEnv | null
}) {
    const { data: run } = useRunRecord(branch, commit, result.workflow_id, lane)
    const { data: prevRun } = useRunRecord(
        branch,
        result.previous_commit ?? undefined,
        result.workflow_id,
        lane
    )
    const { data: noiseFloor } = useNoiseFloor(
        result.workflow_id,
        result.golden_tag ?? undefined,
        lane
    )
    const pngs = (run?.outputs ?? []).filter(
        (o) => o.filename.endsWith('.png') && !o.truncated
    )

    const timings = run?.timings ?? result.timings
    const exec = timings?.prompt_exec_s
    const prevExec = prevRun?.timings?.prompt_exec_s
    const execDeltaPct =
        exec != null && prevExec != null && prevExec > 0
            ? ((exec - prevExec) / prevExec) * 100
            : null
    const env = run?.env ?? summaryEnv
    const vramPeak = run?.vram_peak_mb ?? result.vram_peak_mb
    const rssPeak = run?.rss_peak_mb ?? result.rss_peak_mb
    const comfyVersion = run?.comfy_version ?? result.comfy_version
    const torchVersion = run?.torch_version ?? result.torch_version ?? env?.torch
    const pythonVersion = run?.python_version ?? result.python_version ?? env?.python
    const backends = formatBackends(env?.runtime_backends)

    const validation = run?.validation
    const driftNotes = [
        ...(validation?.missing_nodes ?? []).map((n) => `missing node class: ${n}`),
        ...(validation?.stripped_inputs ?? []).map((n) => `input not in this commit's schema, stripped: ${n}`),
        ...(validation?.filled_defaults ?? []).map((n) => `missing input filled from schema default: ${n}`),
    ]
    const showGoldenFigures =
        result.vs_golden && !result.vs_golden.identical && !result.vs_golden.error
    const showPrevFigures =
        result.vs_previous && !result.vs_previous.identical && !result.vs_previous.error

    return (
        <Surface className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-charcoal-800 dark:text-white">
                        {result.workflow_id}
                    </h3>
                    <RegressionBadge verdict={state.verdict} inherited={state.inherited} />
                </div>
                <div className="text-xs text-ash-500 dark:text-smoke-800">
                    {result.gpu_name && <span>{result.gpu_name} · </span>}
                    {result.golden_tag && <span>golden: {result.golden_tag} · </span>}
                    {result.previous_commit && (
                        <span>
                            prev:{' '}
                            <Link
                                href={`/regression/${branch}/${result.previous_commit}?lane=${lane.id}`}
                                className="font-mono hover:text-electric hover:underline"
                            >
                                {result.previous_commit.slice(0, 7)}
                            </Link>
                        </span>
                    )}
                </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 rounded-lg bg-smoke-200/40 dark:bg-charcoal-700/40 px-4 py-2.5">
                {exec != null && (
                    <Stat
                        label="Exec"
                        value={
                            <>
                                {exec.toFixed(1)}s
                                {execDeltaPct != null && (
                                    <span
                                        className={
                                            execDeltaPct > 10
                                                ? 'text-red-400'
                                                : 'text-ash-500 dark:text-smoke-800'
                                        }
                                    >
                                        {' '}
                                        ({execDeltaPct >= 0 ? '+' : ''}
                                        {execDeltaPct.toFixed(1)}% vs prev)
                                    </span>
                                )}
                            </>
                        }
                    />
                )}
                {timings?.server_start_s != null && (
                    <Stat label="Server start" value={`${timings.server_start_s.toFixed(1)}s`} />
                )}
                {timings?.checkout_s != null && timings.checkout_s > 0 && (
                    <Stat label="Checkout" value={`${timings.checkout_s.toFixed(1)}s`} />
                )}
                {vramPeak != null && <Stat label="Peak VRAM" value={gb(vramPeak)} />}
                {rssPeak != null && <Stat label="Peak RSS" value={gb(rssPeak)} />}
                {comfyVersion && <Stat label="ComfyUI" value={comfyVersion} />}
                {torchVersion && <Stat label="Torch" value={torchVersion} />}
                {pythonVersion && <Stat label="Python" value={pythonVersion.split(' ')[0]} />}
                {env?.cuda && <Stat label="CUDA" value={env.cuda} />}
                {env?.driver_version && <Stat label="Driver" value={env.driver_version} />}
                {backends && <Stat label="Backends" value={backends} />}
            </div>

            {driftNotes.length > 0 && (
                <div className="mt-3 rounded-lg bg-amber-500/[0.08] px-3 py-2 text-xs text-amber-500">
                    <span className="font-semibold">Schema drift</span> — the workflow was adapted
                    to this commit&apos;s node schema:
                    <ul className="mt-1 list-disc pl-5">
                        {driftNotes.map((n) => (
                            <li key={n} className="font-mono">
                                {n}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {(result.verdict === 'execution_error' || result.verdict === 'infra_error') && (
                <p className="mt-3 rounded-lg bg-red-500/[0.08] px-3 py-2 text-sm text-red-400">
                    Worker status: <span className="font-mono">{result.worker_status}</span>
                    {result.error && <span> — {result.error}</span>}
                </p>
            )}

            {result.verdict === 'no_baseline' && (
                <p className="mt-3 text-sm text-ash-500 dark:text-smoke-800">
                    No blessed golden baseline for this workflow yet. Generate and bless one via the
                    worker repo&apos;s Golden baselines workflow.
                </p>
            )}

            <div className="mt-4">
                <MetricTable
                    vsGolden={result.vs_golden}
                    vsPrevious={result.vs_previous}
                    thresholds={result.thresholds_used}
                    noiseFloor={noiseFloor}
                />
            </div>

            {state.verdict === 'fail' && (
                <ReblessCallout workflowId={result.workflow_id} commit={commit} lane={lane} />
            )}

            {pngs.length > 0 && (
                <div className="mt-4">
                    <SectionTitle>Output</SectionTitle>
                    <div className="mt-2 flex flex-wrap gap-3">
                        {pngs.slice(0, 4).map((o) => (
                            <figure key={o.filename} className="w-40">
                                <a
                                    href={outputUrl(branch, commit, result.workflow_id, o.filename, lane)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={o.sha256 ? `sha256 ${o.sha256}` : o.filename}
                                >
                                    <Image
                                        src={outputUrl(branch, commit, result.workflow_id, o.filename, lane)}
                                        alt={o.filename}
                                        width={160}
                                        height={160}
                                        className="h-40 w-40 rounded-lg border border-smoke-300 dark:border-charcoal-400/60 object-cover transition-transform hover:scale-105"
                                    />
                                </a>
                                {o.sha256 && (
                                    <figcaption className="mt-1 truncate font-mono text-[10px] text-ash-500 dark:text-smoke-800">
                                        sha256 {o.sha256.slice(0, 16)}…
                                    </figcaption>
                                )}
                            </figure>
                        ))}
                    </div>
                </div>
            )}

            {(showGoldenFigures || showPrevFigures) && (
                <div className="mt-4">
                    <SectionTitle>Diffs</SectionTitle>
                    <div className="mt-2 flex flex-wrap gap-4">
                        {showGoldenFigures && (
                            <>
                                <Figure
                                    src={figureUrl(branch, commit, result.workflow_id, 'side_by_side_golden.png', lane)}
                                    caption="Golden vs this commit"
                                />
                                <Figure
                                    src={figureUrl(branch, commit, result.workflow_id, 'diff_heatmap_golden.png', lane)}
                                    caption="Abs-diff heatmap vs golden (worst frame)"
                                />
                            </>
                        )}
                        {showPrevFigures && (
                            <>
                                <Figure
                                    src={figureUrl(branch, commit, result.workflow_id, 'side_by_side_prev.png', lane)}
                                    caption="Previous run vs this commit"
                                />
                                <Figure
                                    src={figureUrl(branch, commit, result.workflow_id, 'diff_heatmap_prev.png', lane)}
                                    caption="Abs-diff heatmap vs previous (worst frame)"
                                />
                            </>
                        )}
                    </div>
                </div>
            )}
        </Surface>
    )
}

export default function RegressionCommitPage() {
    const router = useRouter()
    const branch = typeof router.query.branch === 'string' ? router.query.branch : undefined
    const commit = typeof router.query.commit === 'string' ? router.query.commit : undefined
    const laneParam = typeof router.query.lane === 'string' ? router.query.lane : undefined
    const lanesQuery = useLanes()
    const lane = resolveLane(lanesQuery.data, laneParam)
    // Wait for lanes.json so the summary is fetched from the right lane tree the first time.
    const ready = router.isReady && !lanesQuery.isPending
    const summaryQuery = useRegressionSummary(ready ? branch : undefined, commit, lane)
    const summary = summaryQuery.data
    const { data: head } = useIndexHead(ready ? branch : undefined, lane.id)

    if (!branch || !commit || !ready || summaryQuery.isPending) {
        return (
            <div className="flex justify-center items-center py-24">
                <Spinner size="xl" />
            </div>
        )
    }

    if (!summary) {
        return (
            <div className="pt-8">
                <Surface className="flex flex-col items-center justify-center gap-2 py-24 text-center">
                    <span className="text-lg font-semibold">No regression data</span>
                    <span className="text-sm text-ash-500 dark:text-smoke-800">
                        No GPU regression run has been published for{' '}
                        <span className="font-mono">{commit.slice(0, 12)}</span> on{' '}
                        <span className="font-mono">{branch}</span>
                        {lane.info && <> ({lane.info.label})</>}.
                    </span>
                    <Link
                        href={`/regression?lane=${lane.id}`}
                        className="mt-2 text-sm text-electric hover:underline"
                    >
                        Back to regression history
                    </Link>
                </Surface>
            </div>
        )
    }

    const entry = head?.entries.find((e) => e.c === commit)
    const goldens = lane.info?.goldens
    const workflows = Object.values(summary.workflows).sort((a, b) =>
        a.workflow_id.localeCompare(b.workflow_id)
    )
    const states: Record<string, DisplayState> = {}
    for (const wf of workflows) {
        states[wf.workflow_id] = workflowState(
            wf,
            entry?.w[wf.workflow_id],
            goldens?.[wf.workflow_id]?.sha
        )
    }
    const overall = overallState(summary, states)
    const meta: CommitMeta | null =
        summary.commit_meta ??
        (entry?.m
            ? { subject: entry.m.s, author: entry.m.a, committed_ts: entry.m.ct, parents: [], pr: entry.m.pr }
            : null)

    return (
        <div className="pt-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-charcoal-800 dark:text-white">
                        GPU Regression
                        <RegressionBadge verdict={overall.verdict} inherited={overall.inherited} />
                    </h1>
                    <p className="mt-1 text-sm text-ash-500 dark:text-smoke-800">
                        Fixed-seed output comparison on{' '}
                        <span className="font-mono">{branch}</span> ·{' '}
                        {new Date(summary.run_ts * 1000).toLocaleString()}
                        {lane.info && <> · {lane.info.label}</>}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <LaneTabs
                        lanes={lanesQuery.data}
                        value={lane.id}
                        hrefFor={(id) => `/regression/${branch}/${commit}?lane=${id}`}
                    />
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        {meta && <CommitMetaChip meta={meta} />}
                        <a
                            href={`${COMFY_REPO}/commit/${commit}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full border border-smoke-300 dark:border-charcoal-400/60 bg-smoke-200/60 dark:bg-charcoal-700/60 px-3 py-1.5 font-mono text-sm text-charcoal-800 dark:text-smoke-200 hover:border-electric/50"
                        >
                            {commit.slice(0, 12)}
                            <FiExternalLink className="h-3.5 w-3.5" />
                        </a>
                    </div>
                </div>
            </div>

            <RegressionSummaryHeader
                branch={branch}
                commit={commit}
                lane={lane}
                summary={summary}
                states={states}
                head={head}
            />

            <div className="flex flex-col gap-5">
                {workflows.map((wf) => (
                    <WorkflowCard
                        key={wf.workflow_id}
                        branch={branch}
                        commit={commit}
                        lane={lane}
                        result={wf}
                        state={states[wf.workflow_id]}
                        summaryEnv={summary.env}
                    />
                ))}
            </div>
        </div>
    )
}
