import Link from 'next/link'
import React from 'react'
import { RegressionBadge, changedHere, overallDisplay } from './RegressionBadge'
import { Surface } from './Surface'
import { DotLegend, WorkflowDots, cellState, cellStates } from './WorkflowDots'
import { COMFY_REPO } from '../src/regression/client'
import type { IndexEntry, LaneInfo } from '../src/regression/types'
import { commitPageHref, isCommitSha, isPrNumber } from '../src/regression/validate'
import { formatRelative } from '../utils/time'

function HistoryRow({
    branch,
    laneId,
    entry,
    workflows,
    goldens,
}: {
    branch: string
    laneId: string
    entry: IndexEntry
    workflows: string[]
    goldens?: LaneInfo['goldens']
}) {
    const cells = cellStates(entry, workflows, goldens)
    // Overall and the row tint read every cell the run has, not just the lane's slots,
    // so an id outside the fixed order can never soften a run's verdict.
    const states = Object.keys(entry.w).map((wf) => cellState(entry.w[wf], wf, goldens))
    const overall = overallDisplay(entry.o, states, entry.infra)
    const changed = states.some(changedHere)
    const infraIds = Object.keys(entry.w).filter((wf) => entry.w[wf].v === 'infra_error')
    // Expanded under the dots: what needs a human, i.e. open regressions (fresh or
    // inherited) and execution errors, fresh ones first. Accepted drift, infra errors
    // and missing baselines keep to their dot and the Overall cell's note.
    const attention = cells
        .flatMap((c) =>
            c.cell && c.state && (c.state.verdict === 'fail' || c.state.verdict === 'execution_error')
                ? [{ wf: c.wf, cell: c.cell, state: c.state }]
                : []
        )
        .sort((a, b) => Number(changedHere(b.state)) - Number(changedHere(a.state)))
    const commitHref = commitPageHref(branch, entry.c, laneId)
    // Built here rather than taken from the index's range.url: the page should not
    // navigate to whatever string the published JSON carries.
    const compareHref =
        isCommitSha(entry.prev) &&
        isCommitSha(entry.c) &&
        entry.range &&
        entry.range.n != null &&
        entry.range.n > 1
            ? `${COMFY_REPO}/compare/${entry.prev}...${entry.c}`
            : null
    const pr = entry.m && isPrNumber(entry.m.pr) ? entry.m.pr : null

    return (
        <tr
            className={`transition-colors hover:bg-smoke-200/60 dark:hover:bg-charcoal-700/40 ${
                changed ? 'bg-red-500/[0.06] dark:bg-red-500/[0.08]' : ''
            }`}
        >
            <td className="px-5 py-3 align-top">
                <div className="flex flex-wrap items-center gap-2">
                    <Link
                        href={commitHref}
                        className="rounded bg-smoke-200 dark:bg-charcoal-700 px-1.5 py-0.5 font-mono text-xs text-sapphire-700 dark:text-plum-300 hover:underline"
                    >
                        {entry.c.slice(0, 7)}
                    </Link>
                    {compareHref && entry.range && (
                        <a
                            href={compareHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Commits between the previous tested commit and this one"
                            className="text-[11px] text-ash-500 hover:text-electric hover:underline"
                        >
                            +{entry.range.n} commits
                        </a>
                    )}
                    {entry.cv && (
                        <span className="text-[11px] text-ash-500 dark:text-smoke-800">v{entry.cv}</span>
                    )}
                </div>
                {entry.m && (
                    <div
                        className="mt-1 max-w-[26rem] truncate text-xs text-ash-500 dark:text-smoke-800"
                        title={entry.m.s}
                    >
                        {entry.m.s}
                    </div>
                )}
                {entry.m && (entry.m.a || pr != null) && (
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-ash-500/80 dark:text-smoke-800/80">
                        {entry.m.a && <span>{entry.m.a}</span>}
                        {pr != null && (
                            <a
                                href={`${COMFY_REPO}/pull/${pr}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-electric hover:underline"
                            >
                                #{pr}
                            </a>
                        )}
                    </div>
                )}
            </td>
            <td className="whitespace-nowrap px-5 py-3 align-top">
                <div className="text-sm">{formatRelative(entry.t)}</div>
                <div className="text-[11px] text-ash-500 dark:text-smoke-800">
                    {new Date(entry.t * 1000).toLocaleString()}
                </div>
            </td>
            <td className="px-5 py-3 align-top">
                <div className="flex flex-col items-start gap-1">
                    <RegressionBadge verdict={overall.verdict} inherited={overall.inherited} />
                    {entry.infra && overall.verdict !== 'infra_error' && (
                        <span className="max-w-[12rem] truncate text-[11px] text-amber-600 dark:text-amber-500" title={infraIds.join(', ')}>
                            {infraIds.length === 0
                                ? 'infra error in this run'
                                : infraIds.length <= 2
                                ? `infra error: ${infraIds.join(', ')}`
                                : `infra error in ${infraIds.length} workflows`}
                        </span>
                    )}
                </div>
            </td>
            <td className="px-5 py-3 align-top">
                {cells.length > 0 ? (
                    <WorkflowDots cells={cells} />
                ) : (
                    <span className="text-xs text-ash-500/60 dark:text-smoke-800/60">no workflows scored</span>
                )}
                {attention.length > 0 && (
                    <ul className="mt-2 flex max-w-[28rem] flex-col gap-1">
                        {attention.map((a) => (
                            <li key={a.wf} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <RegressionBadge verdict={a.state.verdict} inherited={a.state.inherited} />
                                <Link
                                    href={commitHref}
                                    className="min-w-0 break-all font-mono text-xs font-semibold text-charcoal-800 dark:text-smoke-100 hover:underline"
                                >
                                    {a.wf}
                                </Link>
                                {a.cell.exec != null && (
                                    <span className="font-mono text-[11px] tabular-nums text-ash-500 dark:text-smoke-800">
                                        {a.cell.exec.toFixed(1)}s
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </td>
        </tr>
    )
}

/**
 * Newest-first run history for one branch and lane. Each row carries every workflow
 * of the run as one dot per fixed slot, with open regressions and execution errors
 * spelled out underneath, so the table stays the same width at 2 or 25 workflows.
 */
export const HistoryTable: React.FC<{
    branch: string
    laneId: string
    entries: IndexEntry[]
    workflows: string[]
    goldens?: LaneInfo['goldens']
}> = ({ branch, laneId, entries, workflows, goldens }) => (
    <Surface className="overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="border-b border-smoke-300 dark:border-charcoal-400/60 text-[11px] uppercase tracking-wider text-ash-500 dark:text-smoke-800">
                        <th className="px-5 py-3 font-semibold">Commit</th>
                        <th className="px-5 py-3 font-semibold">Run</th>
                        <th className="px-5 py-3 font-semibold">Overall</th>
                        <th
                            className="px-5 py-3 font-semibold"
                            title="One dot per workflow in lane order (blessed goldens first, then unblessed ids); hover a dot for its verdict, timings and golden. The numbers match the Workflows strip above."
                        >
                            Workflows{' '}
                            <span className="normal-case tracking-normal">({workflows.length})</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-smoke-200 dark:divide-charcoal-400/40">
                    {entries.map((entry) => (
                        <HistoryRow
                            key={`${entry.c}:${entry.t}`}
                            branch={branch}
                            laneId={laneId}
                            entry={entry}
                            workflows={workflows}
                            goldens={goldens}
                        />
                    ))}
                </tbody>
            </table>
        </div>
        <div className="border-t border-smoke-200 dark:border-charcoal-400/40 px-5 py-2">
            <DotLegend />
        </div>
    </Surface>
)
