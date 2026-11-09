import { Spinner } from 'flowbite-react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React from 'react'
import { FetchError } from '../../components/FetchError'
import { ClearableLabel } from '../../components/Labels/ClearableLabel'
import { Pager } from '../../components/Pager'
import { RegressionBadge, badgeMeta, changedHere, overallDisplay } from '../../components/RegressionBadge'
import type { DisplayState } from '../../components/RegressionBadge'
import { Surface } from '../../components/Surface'
import { DotLegend, WorkflowDots, cellState, cellStates } from '../../components/WorkflowDots'
import type { CellState } from '../../components/WorkflowDots'
import { COMFY_REPO, useIndexHeads, useLanes } from '../../src/regression/client'
import { DEFAULT_BRANCH, useBranchParam } from '../../src/regression/branchParam'
import { laneTag, orderedLaneIds } from '../../src/regression/lanes'
import type { IndexEntry, IndexHead, LaneInfo } from '../../src/regression/types'
import { commitPageHref, isBranchName, isPrNumber } from '../../src/regression/validate'
import { orderWorkflows } from '../../src/regression/workflows'
import { formatRelative } from '../../utils/time'

const PAGE_SIZE = 30
const dim = 'text-ash-500 dark:text-smoke-800'
const quiet = 'text-[11px] text-ash-500/70 dark:text-smoke-800/70'

/** One lane's column: its registry entry, its index head on the branch, and its slot order. */
interface LaneColumn {
    id: string
    info: LaneInfo
    /** "primary", "retired" or "legacy", else "lane". */
    tag: string
    status: 'loading' | 'error' | 'none' | 'ok'
    head: IndexHead | null
    workflows: string[]
}

/** One lane's run of a commit: the entry, its overall badge and its dots. */
interface LaneRun {
    entry: IndexEntry
    overall: DisplayState
    cells: CellState[]
}

/** A workflow that passes on some lanes and fails on others at the same commit. */
interface Disagreement {
    wf: string
    green: string[]
    red: string[]
}

interface Row {
    c: string
    m: IndexEntry['m']
    /** Commit time when any lane knows it, else the newest run time across lanes. */
    ts: number
    committed: boolean
    runs: Map<string, LaneRun>
    red: boolean
    changed: boolean
    disagreements: Disagreement[]
}

type Filter = 'all' | 'red' | 'disagree'

const FILTERS: { id: Filter; label: string; title: string }[] = [
    { id: 'all', label: 'All commits', title: 'Every commit any lane tested' },
    { id: 'red', label: 'Any lane red', title: 'At least one lane has a regression or an execution error' },
    { id: 'disagree', label: 'Lanes disagree', title: 'A workflow passes on one lane and fails on another' },
]

/** Green for a pass or accepted drift, red for a regression or execution error, else neither. */
function tone(state: DisplayState): 'green' | 'red' | null {
    if (state.verdict === 'pass' || state.verdict === 'accepted') return 'green'
    if (state.verdict === 'fail' || state.verdict === 'execution_error') return 'red'
    return null
}

/** Overall badge for one lane's run, by the same rule as the history table's Overall column. */
function laneRun(entry: IndexEntry, col: LaneColumn): LaneRun {
    const goldens = col.info.goldens
    const states = Object.keys(entry.w).map((wf) => cellState(entry.w[wf], wf, goldens))
    return {
        entry,
        overall: overallDisplay(entry.o, states, entry.infra),
        cells: cellStates(entry, col.workflows, goldens),
    }
}

/**
 * Workflows two or more lanes ran at this commit with one passing and another failing.
 * Compared per workflow so a workflow only one lane runs (the pack workflows, say) never
 * reads as the lanes disagreeing.
 */
function disagreementsOf(runs: Map<string, LaneRun>, columns: LaneColumn[]): Disagreement[] {
    const byWf = new Map<string, Disagreement>()
    for (const col of columns) {
        const run = runs.get(col.id)
        if (!run) continue
        for (const wf of Object.keys(run.entry.w)) {
            const t = tone(cellState(run.entry.w[wf], wf, col.info.goldens))
            if (!t) continue
            const d = byWf.get(wf) ?? { wf, green: [], red: [] }
            d[t].push(col.id)
            byWf.set(wf, d)
        }
    }
    return Array.from(byWf.values()).filter((d) => d.green.length > 0 && d.red.length > 0)
}

/** Every commit any lane's head holds, one row each, newest first by commit time. */
function mergeRows(columns: LaneColumn[]): Row[] {
    const rows = new Map<string, { c: string; m: IndexEntry['m']; runTs: number; runs: Map<string, LaneRun> }>()
    for (const col of columns) {
        for (const entry of col.head?.entries ?? []) {
            const row = rows.get(entry.c) ?? { c: entry.c, m: null, runTs: entry.t, runs: new Map() }
            rows.set(entry.c, row)
            row.m = row.m ?? entry.m
            row.runTs = Math.max(row.runTs, entry.t)
            // The index upserts one entry per commit; should a head repeat one, the newest run wins.
            const seen = row.runs.get(col.id)
            if (!seen || entry.t > seen.entry.t) row.runs.set(col.id, laneRun(entry, col))
        }
    }
    return Array.from(rows.values())
        .map((r) => {
            const overalls = Array.from(r.runs.values()).map((run) => run.overall)
            const ct = r.m?.ct
            return {
                c: r.c,
                m: r.m,
                ts: ct ?? r.runTs,
                committed: ct != null,
                runs: r.runs,
                red: overalls.some((s) => tone(s) === 'red'),
                changed: overalls.some(changedHere),
                disagreements: disagreementsOf(r.runs, columns),
            }
        })
        .sort((a, b) => b.ts - a.ts)
}

function labelOf(columns: LaneColumn[], id: string): string {
    return columns.find((c) => c.id === id)?.info.label ?? id
}

function DisagreeMarker({ row, columns }: { row: Row; columns: LaneColumn[] }) {
    const lanes = (ids: string[]) => ids.map((id) => labelOf(columns, id)).join(', ')
    const title = [
        'Lanes disagree at this commit:',
        ...row.disagreements.map((d) => `${d.wf}: passes on ${lanes(d.green)}; fails on ${lanes(d.red)}`),
    ].join('\n')
    return (
        <span
            title={title}
            aria-label={title}
            className="inline-flex items-center rounded border border-amber-500/40 px-1 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400"
        >
            lanes differ
        </span>
    )
}

function CommitCell({ branch, row, columns }: { branch: string; row: Row; columns: LaneColumn[] }) {
    // The primary lane's commit page, or the first lane (in column order) that ran the commit.
    const laneId = columns.find((col) => row.runs.has(col.id))?.id
    const pr = row.m && isPrNumber(row.m.pr) ? row.m.pr : null
    const when = new Date(row.ts * 1000).toLocaleString()
    return (
        <td className="px-4 py-3 align-top">
            <div className="flex flex-wrap items-center gap-2">
                {laneId ? (
                    <Link
                        href={commitPageHref(branch, row.c, laneId)}
                        className="rounded bg-smoke-200 dark:bg-charcoal-700 px-1.5 py-0.5 font-mono text-xs text-sapphire-700 dark:text-plum-300 hover:underline"
                    >
                        {row.c.slice(0, 7)}
                    </Link>
                ) : (
                    <span className="font-mono text-xs">{row.c.slice(0, 7)}</span>
                )}
                {pr != null && (
                    <a
                        href={`${COMFY_REPO}/pull/${pr}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-ash-500 hover:text-electric hover:underline"
                    >
                        #{pr}
                    </a>
                )}
                {row.disagreements.length > 0 && <DisagreeMarker row={row} columns={columns} />}
            </div>
            {row.m?.s && (
                <div className={`mt-1 max-w-[16rem] truncate text-xs sm:max-w-[22rem] ${dim}`} title={row.m.s}>
                    {row.m.s}
                </div>
            )}
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-ash-500/80 dark:text-smoke-800/80">
                {row.m?.a && <span>{row.m.a}</span>}
                <span title={`${row.committed ? 'committed' : 'tested'} ${when}`}>{formatRelative(row.ts)}</span>
            </div>
        </td>
    )
}

function LaneCell({ branch, row, col }: { branch: string; row: Row; col: LaneColumn }) {
    if (col.status === 'loading') {
        return <span className={`${quiet} animate-pulse`}>loading…</span>
    }
    if (col.status === 'error') {
        return (
            <span className={quiet} title="This lane's run index could not be loaded">
                —
            </span>
        )
    }
    const run = row.runs.get(col.id)
    if (!run) return <span className={quiet}>not run</span>
    const verdict = badgeMeta(run.overall.verdict, run.overall.inherited).text
    return (
        <Link
            href={commitPageHref(branch, row.c, col.id)}
            aria-label={`${col.info.label} at ${row.c.slice(0, 7)}: ${verdict}. Open the commit page`}
            className="-m-1.5 flex w-max flex-col items-start gap-1.5 rounded-lg p-1.5 transition-colors hover:bg-smoke-200/70 hover:ring-1 hover:ring-electric/40 dark:hover:bg-charcoal-700/50"
        >
            <RegressionBadge verdict={run.overall.verdict} inherited={run.overall.inherited} plain />
            {run.cells.length > 0 && <WorkflowDots cells={run.cells} compact />}
        </Link>
    )
}

function LaneHeader({ col, branch }: { col: LaneColumn; branch: string }) {
    const note =
        col.status === 'none' ? `no runs on ${branch}` : col.status === 'error' ? 'index not loaded' : null
    return (
        <th className="px-4 py-3 align-bottom font-semibold">
            <div className="flex max-w-[12rem] flex-col gap-0.5">
                <span className="normal-case tracking-normal text-xs text-charcoal-800 dark:text-smoke-100">
                    {col.info.label}
                </span>
                <span className="text-[10px]">
                    {col.tag}
                    {col.workflows.length > 0 && (
                        <span className="normal-case tracking-normal"> · {col.workflows.length} workflows</span>
                    )}
                </span>
                {note && <span className="normal-case tracking-normal text-[10px] font-normal">{note}</span>}
            </div>
        </th>
    )
}

function FilterBar({
    value,
    counts,
    onChange,
}: {
    value: Filter
    counts: Record<Filter, number>
    onChange: (f: Filter) => void
}) {
    return (
        <div
            role="group"
            aria-label="Show commits"
            className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-2xl border border-smoke-300 dark:border-charcoal-400/60 bg-smoke-200/60 dark:bg-charcoal-700/60 p-1"
        >
            {FILTERS.map((f) => {
                const active = f.id === value
                return (
                    <button
                        key={f.id}
                        type="button"
                        aria-pressed={active}
                        title={f.title}
                        onClick={() => onChange(f.id)}
                        className={[
                            'whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                            active
                                ? 'bg-electric text-ink-900 shadow-sm'
                                : 'text-ash-500 dark:text-smoke-700 hover:text-charcoal-800 dark:hover:text-white',
                        ].join(' ')}
                    >
                        {f.label} <span className="tabular-nums opacity-70">{counts[f.id]}</span>
                    </button>
                )
            })}
        </div>
    )
}

export default function WaterfallPage() {
    const router = useRouter()
    const [branch, setBranch] = useBranchParam()
    const [filter, setFilter] = React.useState<Filter>('all')
    // Paging restarts whenever the branch or the filter changes.
    const view = `${branch}:${filter}`
    const [paging, setPaging] = React.useState({ view: '', page: 1 })

    const lanesQuery = useLanes()
    const lanes = lanesQuery.data
    const validBranch = isBranchName(branch)
    const ids = router.isReady && validBranch ? orderedLaneIds(lanes) : []
    const heads = useIndexHeads(ids.map((id) => ({ branch, lane: id })))

    const columns: LaneColumn[] = lanes
        ? ids.map((id, i) => {
              const q = heads[i]
              const head = q?.data ?? null
              const info = lanes.lanes[id]
              return {
                  id,
                  info,
                  tag: laneTag(lanes, id) ?? 'lane',
                  status: !q || q.isPending ? 'loading' : q.isError ? 'error' : head ? 'ok' : 'none',
                  head,
                  workflows: head ? orderWorkflows(head.entries, info.goldens) : [],
              }
          })
        : []
    const rows = mergeRows(columns)
    const counts: Record<Filter, number> = {
        all: rows.length,
        red: rows.filter((r) => r.red).length,
        disagree: rows.filter((r) => r.disagreements.length > 0).length,
    }
    const shown =
        filter === 'red'
            ? rows.filter((r) => r.red)
            : filter === 'disagree'
            ? rows.filter((r) => r.disagreements.length > 0)
            : rows
    const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
    const page = Math.min(paging.view === view ? paging.page : 1, totalPages)
    const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    const perLane = Math.max(0, ...columns.map((c) => c.head?.entries.length ?? 0))
    const failed = columns.flatMap((col, i) => (col.status === 'error' ? [{ col, query: heads[i] }] : []))
    const allLoading = columns.length > 0 && columns.every((c) => c.status === 'loading')
    const anyLoading = columns.some((c) => c.status === 'loading')
    const historyHref = branch === DEFAULT_BRANCH ? '/' : { pathname: '/', query: { branch } }

    let body: React.ReactNode
    if (!router.isReady || lanesQuery.isPending || allLoading) {
        body = (
            <div className="flex justify-center items-center py-24">
                <Spinner size="xl" />
            </div>
        )
    } else if (lanesQuery.isError) {
        body = (
            <FetchError
                what="the lane index"
                error={lanesQuery.error}
                busy={lanesQuery.isFetching}
                onRetry={() => lanesQuery.refetch()}
            />
        )
    } else if (!validBranch) {
        body = (
            <Surface className="flex flex-col items-center justify-center gap-2 py-24 text-center">
                <span className="text-lg font-semibold">Not a valid branch</span>
                <span className={`text-sm ${dim}`}>
                    {'Branch names may use letters, digits, ".", "_", "-" and "/".'}
                </span>
            </Surface>
        )
    } else if (rows.length === 0 && !anyLoading) {
        body = (
            <>
                {failed.map(({ col, query }) => (
                    <FetchError
                        key={col.id}
                        what={`the run index of ${col.info.label}`}
                        error={query.error}
                        busy={query.isFetching}
                        onRetry={() => query.refetch()}
                    />
                ))}
                <Surface className="flex flex-col items-center justify-center gap-2 py-24 text-center">
                    <span className="text-lg font-semibold">No runs on this branch</span>
                    <span className={`text-sm ${dim}`}>
                        {columns.length === 0 ? (
                            'No lanes are published yet.'
                        ) : (
                            <>
                                No lane has published a run for <span className="font-mono">{branch}</span>.
                            </>
                        )}
                    </span>
                </Surface>
            </>
        )
    } else {
        body = (
            <>
                {failed.map(({ col, query }) => (
                    <FetchError
                        key={col.id}
                        what={`the run index of ${col.info.label}`}
                        error={query.error}
                        busy={query.isFetching}
                        onRetry={() => query.refetch()}
                    />
                ))}
                <div className="mb-4">
                    <FilterBar
                        value={filter}
                        counts={counts}
                        onChange={(f) => {
                            setFilter(f)
                            setPaging({ view: `${branch}:${f}`, page: 1 })
                        }}
                    />
                </div>
                <Surface className="overflow-hidden">
                    {/* w-max: the table keeps its columns and scrolls inside the card on a phone. */}
                    <div className="overflow-x-auto scrollbar-thin">
                        <table className="w-max min-w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-smoke-300 dark:border-charcoal-400/60 text-[11px] uppercase tracking-wider text-ash-500 dark:text-smoke-800">
                                    <th className="px-4 py-3 align-bottom font-semibold">Commit</th>
                                    {columns.map((col) => (
                                        <LaneHeader key={col.id} col={col} branch={branch} />
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-smoke-200 dark:divide-charcoal-400/40">
                                {pageRows.length === 0 && (
                                    <tr>
                                        <td colSpan={columns.length + 1} className={`px-4 py-10 text-center text-sm ${dim}`}>
                                            {filter === 'red'
                                                ? 'No lane is red on any commit shown.'
                                                : 'The lanes agree on every commit shown.'}
                                        </td>
                                    </tr>
                                )}
                                {pageRows.map((row) => (
                                    <tr
                                        key={row.c}
                                        className={`transition-colors hover:bg-smoke-200/60 dark:hover:bg-charcoal-700/40 ${
                                            row.changed ? 'bg-red-500/[0.06] dark:bg-red-500/[0.08]' : ''
                                        }`}
                                    >
                                        <CommitCell branch={branch} row={row} columns={columns} />
                                        {columns.map((col) => (
                                            <td key={col.id} className="px-4 py-3 align-top">
                                                <LaneCell branch={branch} row={row} col={col} />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex flex-col gap-1.5 border-t border-smoke-200 dark:border-charcoal-400/40 px-5 py-2">
                        <DotLegend />
                        <span className={`text-[11px] ${dim}`}>
                            <span className="font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                                lanes differ
                            </span>{' '}
                            a workflow passes on one lane and fails on another at that commit; hover it for which.
                        </span>
                    </div>
                </Surface>
                <div className="mt-6 flex justify-center">
                    <Pager
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={(p) => setPaging({ view, page: p })}
                    />
                </div>
                <p className={`mt-2 text-center text-[11px] ${dim}`}>
                    Showing up to the newest {perLane} commits from each lane{"'"}s index head ({rows.length} in
                    all).{' '}
                    <Link href={historyHref} className="font-medium text-sapphire-700 dark:text-electric hover:underline">
                        Older history is on All Results →
                    </Link>
                </p>
            </>
        )
    }

    return (
        <div className="pt-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-charcoal-800 dark:text-white">
                        Waterfall
                    </h1>
                    <p className={`mt-1 text-sm ${dim}`}>
                        Every tested commit across lanes. A cell is that lane{"'"}s verdict for the commit; click it
                        for the commit page.
                    </p>
                </div>
                <ClearableLabel
                    id="waterfall-branch"
                    label="Branch"
                    value={branch}
                    onChange={setBranch}
                    onClear={() => setBranch(DEFAULT_BRANCH)}
                />
            </div>
            {body}
        </div>
    )
}
