import { Spinner } from 'flowbite-react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React from 'react'
import { ClearableLabel } from '../../components/Labels/ClearableLabel'
import { RegressionBadge } from '../../components/RegressionBadge'
import { Surface, SectionTitle } from '../../components/Surface'
import { useLatestPointer, useRegressionSummary } from '../../src/regression/client'

const DEFAULT_BRANCH = 'master'

export default function RegressionIndexPage() {
    const router = useRouter()
    const [branch, setBranch] = React.useState(DEFAULT_BRANCH)
    const [commitLookup, setCommitLookup] = React.useState('')

    React.useEffect(() => {
        const b = router.query.branch
        if (typeof b === 'string' && b) setBranch(b)
    }, [router.query.branch])

    const { data: latest, isLoading: loadingLatest } = useLatestPointer(branch)
    const { data: summary, isLoading: loadingSummary } = useRegressionSummary(
        branch,
        latest?.commit
    )

    const workflows = summary
        ? Object.values(summary.workflows).sort((a, b) =>
              a.workflow_id.localeCompare(b.workflow_id)
          )
        : []

    return (
        <div className="pt-8">
            <div className="mb-6">
                <h1 className="text-2xl font-extrabold tracking-tight text-charcoal-800 dark:text-white">
                    GPU Regression
                </h1>
                <p className="mt-1 text-sm text-ash-500 dark:text-smoke-800">
                    Curated fixed-seed workflows run on serverless GPUs for every push, compared
                    against golden baselines and the previous run.
                </p>
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
                    <Link
                        href={commitLookup ? `/regression/${branch}/${commitLookup.trim()}` : '#'}
                        aria-disabled={!commitLookup}
                        className={`rounded-lg border border-smoke-300 dark:border-charcoal-400/60 px-3 py-1.5 text-sm font-medium ${
                            commitLookup
                                ? 'text-charcoal-800 dark:text-smoke-200 hover:border-electric/50 hover:text-electric'
                                : 'pointer-events-none text-ash-500/50'
                        }`}
                    >
                        Open commit
                    </Link>
                </div>
            </Surface>

            {loadingLatest || (latest && loadingSummary) ? (
                <div className="flex justify-center items-center py-24">
                    <Spinner size="xl" />
                </div>
            ) : !latest ? (
                <Surface className="flex flex-col items-center justify-center gap-2 py-24 text-center">
                    <span className="text-lg font-semibold">No regression runs yet</span>
                    <span className="text-sm text-ash-500 dark:text-smoke-800">
                        No runs have been published for branch{' '}
                        <span className="font-mono">{branch}</span>.
                    </span>
                </Surface>
            ) : (
                <Surface className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <SectionTitle>Latest run on {branch}</SectionTitle>
                            <div className="mt-2 flex items-center gap-3">
                                <Link
                                    href={`/regression/${branch}/${latest.commit}`}
                                    className="font-mono text-lg font-bold text-sapphire-700 dark:text-electric hover:underline"
                                >
                                    {latest.commit.slice(0, 12)}
                                </Link>
                                {summary && (
                                    <RegressionBadge
                                        verdict={summary.overall === 'pass' ? 'pass' : 'fail'}
                                    />
                                )}
                            </div>
                            <p className="mt-1 text-xs text-ash-500 dark:text-smoke-800">
                                {new Date(latest.run_ts * 1000).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {workflows.length > 0 && (
                        <div className="mt-5 flex flex-wrap gap-4">
                            {workflows.map((wf) => (
                                <Link
                                    key={wf.workflow_id}
                                    href={`/regression/${branch}/${latest.commit}`}
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
            )}
        </div>
    )
}
