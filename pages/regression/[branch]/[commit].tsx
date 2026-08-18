import { Spinner } from 'flowbite-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React from 'react'
import { FiExternalLink } from 'react-icons/fi'
import { MetricTable } from '../../../components/MetricTable'
import { RegressionBadge } from '../../../components/RegressionBadge'
import { Surface, SectionTitle } from '../../../components/Surface'
import {
    figureUrl,
    outputUrl,
    useRegressionSummary,
    useRunRecord,
} from '../../../src/regression/client'
import type { WorkflowRegressionResult } from '../../../src/regression/types'

const COMFY_REPO = 'https://github.com/Comfy-Org/ComfyUI'

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

function WorkflowCard({
    branch,
    commit,
    result,
}: {
    branch: string
    commit: string
    result: WorkflowRegressionResult
}) {
    const { data: run } = useRunRecord(branch, commit, result.workflow_id)
    const pngs = (run?.outputs ?? []).filter(
        (o) => o.filename.endsWith('.png') && !o.truncated
    )
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
                    <RegressionBadge verdict={result.verdict} />
                </div>
                <div className="text-xs text-ash-500 dark:text-smoke-800">
                    {result.gpu_name && <span>{result.gpu_name} · </span>}
                    {result.timings?.prompt_exec_s != null && (
                        <span>exec {result.timings.prompt_exec_s.toFixed(1)}s · </span>
                    )}
                    {result.golden_tag && <span>golden: {result.golden_tag} · </span>}
                    {result.previous_commit && (
                        <span>
                            prev:{' '}
                            <Link
                                href={`/regression/${branch}/${result.previous_commit}`}
                                className="font-mono hover:text-electric hover:underline"
                            >
                                {result.previous_commit.slice(0, 7)}
                            </Link>
                        </span>
                    )}
                </div>
            </div>

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
                />
            </div>

            {pngs.length > 0 && (
                <div className="mt-4">
                    <SectionTitle>Output</SectionTitle>
                    <div className="mt-2 flex flex-wrap gap-3">
                        {pngs.slice(0, 4).map((o) => (
                            <a
                                key={o.filename}
                                href={outputUrl(branch, commit, result.workflow_id, o.filename)}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Image
                                    src={outputUrl(branch, commit, result.workflow_id, o.filename)}
                                    alt={o.filename}
                                    width={160}
                                    height={160}
                                    className="h-40 w-40 rounded-lg border border-smoke-300 dark:border-charcoal-400/60 object-cover transition-transform hover:scale-105"
                                />
                            </a>
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
                                    src={figureUrl(branch, commit, result.workflow_id, 'side_by_side_golden.png')}
                                    caption="Golden vs this commit"
                                />
                                <Figure
                                    src={figureUrl(branch, commit, result.workflow_id, 'diff_heatmap_golden.png')}
                                    caption="Abs-diff heatmap vs golden (worst frame)"
                                />
                            </>
                        )}
                        {showPrevFigures && (
                            <>
                                <Figure
                                    src={figureUrl(branch, commit, result.workflow_id, 'side_by_side_prev.png')}
                                    caption="Previous run vs this commit"
                                />
                                <Figure
                                    src={figureUrl(branch, commit, result.workflow_id, 'diff_heatmap_prev.png')}
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
    const { data: summary, isLoading } = useRegressionSummary(branch, commit)

    if (!branch || !commit || isLoading) {
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
                        <span className="font-mono">{branch}</span>.
                    </span>
                    <Link href="/regression" className="mt-2 text-sm text-electric hover:underline">
                        Back to regression overview
                    </Link>
                </Surface>
            </div>
        )
    }

    const workflows = Object.values(summary.workflows).sort((a, b) =>
        a.workflow_id.localeCompare(b.workflow_id)
    )

    return (
        <div className="pt-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-charcoal-800 dark:text-white">
                        GPU Regression
                        <RegressionBadge verdict={summary.overall === 'pass' ? 'pass' : 'fail'} />
                    </h1>
                    <p className="mt-1 text-sm text-ash-500 dark:text-smoke-800">
                        Fixed-seed output comparison on{' '}
                        <span className="font-mono">{branch}</span> ·{' '}
                        {new Date(summary.run_ts * 1000).toLocaleString()}
                    </p>
                </div>
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

            <div className="flex flex-col gap-5">
                {workflows.map((wf) => (
                    <WorkflowCard key={wf.workflow_id} branch={branch} commit={commit} result={wf} />
                ))}
            </div>
        </div>
    )
}
