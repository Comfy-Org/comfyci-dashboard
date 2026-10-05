import Link from 'next/link'
import React from 'react'
import { FirstBadLine } from './FirstBadLine'
import { RegressionBadge } from './RegressionBadge'
import type { DisplayState } from './RegressionBadge'
import { Surface, SectionTitle } from './Surface'
import { useGoldenCurrent } from '../src/regression/client'
import type { LaneRef } from '../src/regression/client'
import type {
    ComparisonMetrics,
    FirstBad,
    GoldenCurrent,
    IndexHead,
    RegressionSummary,
    Thresholds,
    WorkflowRegressionResult,
} from '../src/regression/types'
import { shortDate } from '../utils/time'

const extLink = 'hover:text-electric hover:underline'

// "MSE 3.44 > 2.0" style clauses, one per metric, flagged when the threshold is crossed.
function metricClauses(m: ComparisonMetrics, t: Thresholds | null): { text: string; bad: boolean }[] {
    const out: { text: string; bad: boolean }[] = []
    if (m.mean_mse != null) {
        const bad = t != null && m.mean_mse > t.max_mean_mse
        out.push({ text: `MSE ${m.mean_mse.toFixed(2)}${t ? ` ${bad ? '>' : '≤'} ${t.max_mean_mse}` : ''}`, bad })
    }
    if (m.mean_psnr_db != null) {
        const bad = t != null && m.mean_psnr_db < t.min_mean_psnr_db
        out.push({ text: `PSNR ${m.mean_psnr_db.toFixed(1)} dB${t ? ` ${bad ? '<' : '≥'} ${t.min_mean_psnr_db}` : ''}`, bad })
    }
    if (m.mean_pct_pixels_changed != null) {
        const bad = t != null && m.mean_pct_pixels_changed > t.max_pct_pixels_changed
        out.push({
            text: `${m.mean_pct_pixels_changed.toFixed(1)}% px${t ? ` ${bad ? '>' : '≤'} ${t.max_pct_pixels_changed}%` : ''}`,
            bad,
        })
    }
    return out
}

// One line for a workflow that drifted or did not execute, plus where its chain started.
function FailingWorkflow({
    branch,
    lane,
    result,
    state,
    firstBad,
    firstBadSubject,
}: {
    branch: string
    lane: LaneRef
    result: WorkflowRegressionResult
    state: DisplayState
    firstBad?: FirstBad
    firstBadSubject?: string
}) {
    const { data: golden } = useGoldenCurrent(result.workflow_id, lane)
    const href = (sha: string) => `/regression/${branch}/${sha}?lane=${lane.id}`
    const vg = result.vs_golden
    const vp = result.vs_previous
    const clauses = vg && !vg.error ? metricClauses(vg, result.thresholds_used) : []
    // current.json describes the golden blessed now, which after a re-bless is not the one
    // this run was compared against: its details only attach to a matching tag.
    const shownTag = result.golden_tag ?? golden?.tag
    const sameGolden = golden != null && golden.tag === shownTag
    const blessedClause = (g: GoldenCurrent) =>
        `blessed ${shortDate(g.blessed_ts)} by ${g.blessed_by}${g.reason ? `, ${g.reason}` : ''}`

    return (
        <div className="flex flex-col gap-1 border-t border-smoke-200 dark:border-charcoal-400/40 pt-3">
            <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold text-charcoal-800 dark:text-smoke-100">
                    {result.workflow_id}
                </span>
                <RegressionBadge verdict={state.verdict} inherited={state.inherited} />
            </div>
            {result.verdict === 'execution_error' ? (
                <p className="text-sm text-charcoal-800 dark:text-smoke-200">
                    Worker status: <span className="font-mono">{result.worker_status}</span>
                    {result.error && <span className="text-red-400"> — {result.error}</span>}
                </p>
            ) : (
                <p className="text-sm text-charcoal-800 dark:text-smoke-200">
                    vs golden {shownTag ?? '—'}
                    {golden && sameGolden && (
                        <span className="text-ash-500 dark:text-smoke-800"> ({blessedClause(golden)})</span>
                    )}
                    :{' '}
                    {vg?.error ? (
                        <span className="text-red-400">{vg.error}</span>
                    ) : clauses.length ? (
                        clauses.map((c, i) => (
                            <span key={c.text}>
                                {i > 0 && ', '}
                                <span className={c.bad ? 'font-semibold text-red-400' : ''}>{c.text}</span>
                            </span>
                        ))
                    ) : (
                        'no comparison'
                    )}
                    {vp && !vp.error && result.previous_commit && (
                        <>
                            ; outputs {vp.identical ? 'unchanged' : 'changed'} vs previous run{' '}
                            <Link href={href(result.previous_commit)} className={`font-mono ${extLink}`}>
                                {result.previous_commit.slice(0, 7)}
                            </Link>
                            {!vp.identical && vp.mean_mse != null && ` (MSE ${vp.mean_mse.toFixed(2)})`}
                        </>
                    )}
                    {golden && !sameGolden && (
                        <span className="text-ash-500 dark:text-smoke-800">
                            ; the current golden is {golden.tag} ({blessedClause(golden)})
                        </span>
                    )}
                </p>
            )}
            {firstBad && (
                <p className="text-sm text-charcoal-800 dark:text-smoke-200">
                    <span className="text-ash-500 dark:text-smoke-800">Failing since</span>{' '}
                    <FirstBadLine
                        fb={firstBad}
                        branch={branch}
                        laneId={lane.id}
                        subject={firstBadSubject}
                    />
                </p>
            )}
        </div>
    )
}

/** Verdict counts plus one explanatory line per failing or errored workflow, above the cards. */
export const RegressionSummaryHeader: React.FC<{
    branch: string
    commit: string
    lane: LaneRef
    summary: RegressionSummary
    states: Record<string, DisplayState>
    head?: IndexHead | null
}> = ({ branch, commit, lane, summary, states, head }) => {
    const results = Object.values(summary.workflows).sort((a, b) =>
        a.workflow_id.localeCompare(b.workflow_id)
    )
    const count = (pred: (r: WorkflowRegressionResult) => boolean) => results.filter(pred).length
    const pass = count((r) => r.verdict === 'pass')
    const fail = count((r) => r.verdict === 'fail')
    const errored = count((r) => r.verdict === 'execution_error')
    const accepted = count((r) => states[r.workflow_id]?.verdict === 'accepted')
    // Execution errors are the most actionable non-drift failure, so they get a line too.
    const explained = results.filter((r) => r.verdict === 'fail' || r.verdict === 'execution_error')
    const subjectOf = (fb: FirstBad) =>
        head?.entries.find((e) => e.c === fb.commit)?.m?.s ??
        (fb.commit === commit ? summary.commit_meta?.subject : undefined)

    return (
        <Surface className="mb-5 p-5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <SectionTitle>Summary</SectionTitle>
                <span className="text-sm text-charcoal-800 dark:text-smoke-200">
                    <span className="font-semibold text-emerald-500">{pass}</span> pass ·{' '}
                    <span className={`font-semibold ${fail ? 'text-red-400' : ''}`}>{fail}</span> fail ·{' '}
                    {errored > 0 && (
                        <>
                            <span className="font-semibold text-red-400">{errored}</span> execution{' '}
                            {errored === 1 ? 'error' : 'errors'} ·{' '}
                        </>
                    )}
                    <span className="font-semibold">{results.length - pass - fail - errored}</span> other
                    {accepted > 0 && (
                        <span className="text-ash-500 dark:text-smoke-800">
                            {' '}
                            ({accepted} accepted drift)
                        </span>
                    )}
                </span>
            </div>
            {explained.length > 0 && (
                <div className="mt-3 flex flex-col gap-3">
                    {explained.map((r) => {
                        const fb = head?.first_bad?.[r.workflow_id]
                        return (
                            <FailingWorkflow
                                key={r.workflow_id}
                                branch={branch}
                                lane={lane}
                                result={r}
                                state={states[r.workflow_id] ?? { verdict: r.verdict, inherited: false }}
                                firstBad={fb}
                                firstBadSubject={fb ? subjectOf(fb) : undefined}
                            />
                        )
                    })}
                </div>
            )}
        </Surface>
    )
}
