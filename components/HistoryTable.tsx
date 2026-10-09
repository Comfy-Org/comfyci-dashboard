import Link from 'next/link'
import React from 'react'
import { RegressionBadge, changedHere, displayVerdict, overallDisplay } from './RegressionBadge'
import type { DisplayState } from './RegressionBadge'
import { Surface } from './Surface'
import { COMFY_REPO } from '../src/regression/client'
import type { IndexEntry, IndexWorkflowCell, LaneInfo } from '../src/regression/types'
import { commitPageHref, isCommitSha } from '../src/regression/validate'
import { formatRelative } from '../utils/time'

interface CellState {
    wf: string
    cell: IndexWorkflowCell | null
    state: DisplayState | null
}

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
    const cells: CellState[] = workflows.map((wf) => {
        const cell = entry.w[wf]
        if (!cell) return { wf, cell: null, state: null }
        return { wf, cell, state: displayVerdict(cell.v, cell.sha, goldens?.[wf]?.sha, cell.d) }
    })
    const states = cells.flatMap((c) => (c.state ? [c.state] : []))
    const overall = overallDisplay(entry.o, states, entry.infra)
    const changed = states.some(changedHere)
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
                {entry.m && (entry.m.a || entry.m.pr != null) && (
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-ash-500/80 dark:text-smoke-800/80">
                        {entry.m.a && <span>{entry.m.a}</span>}
                        {entry.m.pr != null && (
                            <a
                                href={`${COMFY_REPO}/pull/${entry.m.pr}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-electric hover:underline"
                            >
                                #{entry.m.pr}
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
                        <span className="text-[11px] text-amber-500">infra error in this run</span>
                    )}
                </div>
            </td>
            {cells.map((c) => (
                <td key={c.wf} className="px-5 py-3 align-top">
                    {c.cell && c.state ? (
                        <div className="flex flex-col items-start gap-1">
                            <RegressionBadge verdict={c.state.verdict} inherited={c.state.inherited} />
                            {c.cell.exec != null && (
                                <span className="font-mono text-[11px] tabular-nums text-ash-500 dark:text-smoke-800">
                                    {c.cell.exec.toFixed(1)}s
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-xs text-ash-500/60 dark:text-smoke-800/60">—</span>
                    )}
                </td>
            ))}
        </tr>
    )
}

/** Newest-first run history for one branch and lane, one column per workflow. */
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
                        {workflows.map((wf) => (
                            <th key={wf} className="px-5 py-3 font-mono font-semibold normal-case tracking-normal">
                                {wf}
                            </th>
                        ))}
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
    </Surface>
)
