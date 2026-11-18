import Link from 'next/link'
import React from 'react'
import { RegressionBadge } from './RegressionBadge'
import { Surface, SectionTitle } from './Surface'
import { WorkflowDot, cellState, dotKind, driftStartedHere } from './WorkflowDots'
import { currentCell, latestFullRun } from '../src/regression/indexOrder'
import type { FirstBad, IndexEntry, LaneInfo } from '../src/regression/types'
import { commitPageHref } from '../src/regression/validate'
import { formatGb } from '../utils/format'
import { formatRelative } from '../utils/time'

/** Tiles shown before the strip folds; it stays open while a hidden tile needs attention. */
const FOLD_AT = 12

const shaClass = 'font-mono hover:underline'

function Tile({
    wf,
    index,
    branch,
    laneId,
    entries,
    goldens,
    fb,
}: {
    wf: string
    index: number
    branch: string
    laneId: string
    entries: IndexEntry[]
    goldens?: LaneInfo['goldens']
    fb?: FirstBad
}) {
    const cell = currentCell(entries, wf)
    const state = cell ? cellState(cell, wf, goldens) : null
    const runs = entries.filter((e) => e.w[wf])
    // Newest run where this workflow's drift or execution failure began; a drift that
    // was later accepted still has one, and is labelled as such. A smoke check has no
    // drift that begins: the newest run that failed one is named, standing or not.
    const lastDrift = runs.find((e) => {
        const c = e.w[wf]
        return driftStartedHere(c) || (c.l === 'smoke' && c.v === 'fail')
    })
    const lastDriftState = lastDrift ? cellState(lastDrift.w[wf], wf, goldens) : null
    // A smoke-level workflow has no golden and nothing that drifts: its tile names no
    // tag, and its last line counts failed smoke checks.
    const smoke = (cell ?? runs[0]?.w[wf])?.l === 'smoke'
    const facts: string[] = []
    if (cell?.exec != null) facts.push(`${cell.exec.toFixed(1)}s`)
    if (cell?.vram != null) facts.push(formatGb(cell.vram))
    const tag = smoke ? null : cell?.g ?? goldens?.[wf]?.tag
    if (tag) facts.push(`golden ${tag}`)
    const line2 = cell
        ? facts.join(' · ') || '—'
        : `not in the latest run${runs[0] ? ` · last seen ${formatRelative(runs[0].t)}` : ''}`

    // The badge of a failed smoke check is long. In such a tile the id keeps a readable
    // width and the badge drops to a line of its own when the two do not fit.
    const head = smoke ? 'flex flex-wrap items-center gap-x-2 gap-y-1' : 'flex items-center gap-2'
    const idClass = [
        smoke ? 'min-w-[5rem]' : 'min-w-0',
        'flex-1 truncate font-mono text-xs font-semibold text-charcoal-800 dark:text-smoke-100',
    ].join(' ')

    return (
        <li className="min-w-0 rounded-xl border border-smoke-300 dark:border-charcoal-400/60 px-3 py-2">
            <div className={head}>
                <span className="w-5 shrink-0 font-mono text-[11px] tabular-nums text-ash-500 dark:text-smoke-800">
                    #{index}
                </span>
                <WorkflowDot kind={dotKind(state)} />
                <span className={idClass} title={wf}>
                    {wf}
                </span>
                {state && <RegressionBadge state={state} />}
            </div>
            <div
                className="mt-1 truncate font-mono text-[11px] tabular-nums text-ash-500 dark:text-smoke-800"
                title={line2}
            >
                {line2}
            </div>
            <div className="mt-0.5 truncate text-[11px] text-ash-500 dark:text-smoke-800">
                {fb ? (
                    <span className="text-red-600 dark:text-red-400">
                        failing since{' '}
                        <Link href={commitPageHref(branch, fb.commit, laneId)} className={`${shaClass} font-semibold`}>
                            {fb.commit.slice(0, 7)}
                        </Link>
                        {' · '}
                        {fb.runs} {fb.runs === 1 ? 'run' : 'runs'}
                    </span>
                ) : lastDrift ? (
                    <>
                        {lastDriftState?.verdict === 'execution_error'
                            ? 'last execution error'
                            : lastDriftState?.level === 'smoke'
                            ? 'last failed smoke check'
                            : 'last drift'}{' '}
                        {formatRelative(lastDrift.t)} ·{' '}
                        <Link href={commitPageHref(branch, lastDrift.c, laneId)} className={shaClass}>
                            {lastDrift.c.slice(0, 7)}
                        </Link>
                        {lastDriftState?.verdict === 'accepted' && ' · accepted'}
                    </>
                ) : runs.length <= 1 ? (
                    'first run'
                ) : smoke ? (
                    `no failed smoke check in ${runs.length} runs`
                ) : (
                    `no drift in ${runs.length} runs`
                )}
            </div>
        </li>
    )
}

/**
 * Latest state of every workflow in the lane's fixed order: verdict, exec, peak VRAM and
 * golden tag from the newest run, plus where its last drift started or the open failing
 * chain. The "#n" matches the dot titles in the table, so the strip doubles as the key
 * to slot positions. Reads the loaded runs only; no per-workflow fetches.
 */
export const WorkflowStrip: React.FC<{
    branch: string
    laneId: string
    entries: IndexEntry[]
    workflows: string[]
    goldens?: LaneInfo['goldens']
    /** Open first_bad chains, already filtered by the page's banner rule. */
    firstBad: Record<string, FirstBad>
    /** The lane has smoke-level results only: no goldens to order by. */
    smokeOnly?: boolean
    /** When the lane's latest full run ran, also when it is older than the loaded runs. */
    lastRunTs?: number | null
}> = ({ branch, laneId, entries, workflows, goldens, firstBad, smokeOnly = false, lastRunTs = null }) => {
    const [showAll, setShowAll] = React.useState(false)
    if (entries.length === 0 || workflows.length === 0) return null

    // The latest run is the newest that did not name its workflows. A run of named
    // workflows after it gives those workflows a newer result, and each tile shows that one.
    const latest = latestFullRun(entries)
    const states = workflows.map((wf) => {
        const cell = currentCell(entries, wf)
        return cell ? cellState(cell, wf, goldens) : null
    })
    const notRun = states.filter((s) => s === null).length
    const passing = states.filter((s) => s?.verdict === 'pass').length
    const failing = states.filter((s) => s?.verdict === 'fail' || s?.verdict === 'execution_error').length
    const other = workflows.length - notRun - passing - failing
    const inLatest = latest ? workflows.filter((wf) => latest.w[wf]).length : 0
    // A full run older than every loaded run is still the lane's latest: the tiles cannot
    // count its workflows, and the caption says when it ran.
    const lastTs = latest?.t ?? lastRunTs
    const caption = [
        latest
            ? `${inLatest} of ${workflows.length} in the latest run`
            : lastTs != null
            ? 'latest full run'
            : 'no full run yet',
        lastTs != null ? formatRelative(lastTs) : null,
        `${passing} pass`,
        failing ? `${failing} failing` : null,
        other ? `${other} other` : null,
        notRun ? `${notRun} not run` : null,
    ]
        .filter(Boolean)
        .join(' · ')

    // Fold long strips, but never hide a tile that is not a plain pass.
    const hiddenNeedsAttention = states.slice(FOLD_AT).some((s) => s === null || s.verdict !== 'pass')
    const open = showAll || hiddenNeedsAttention || workflows.length <= FOLD_AT
    const visible = open ? workflows : workflows.slice(0, FOLD_AT)

    return (
        <Surface className="mb-6 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <SectionTitle>Workflows</SectionTitle>
                <span
                    className="text-[11px] text-ash-500 dark:text-smoke-800"
                    title={
                        smokeOnly
                            ? 'Lane order: sorted by id'
                            : 'Lane order: blessed goldens first, then unblessed ids'
                    }
                >
                    {caption}
                </span>
            </div>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(17rem,1fr))]">
                {visible.map((wf, i) => (
                    <Tile
                        key={wf}
                        wf={wf}
                        index={i + 1}
                        branch={branch}
                        laneId={laneId}
                        entries={entries}
                        goldens={goldens}
                        fb={firstBad[wf]}
                    />
                ))}
            </ul>
            {workflows.length > FOLD_AT && !hiddenNeedsAttention && (
                <button
                    type="button"
                    onClick={() => setShowAll((v) => !v)}
                    className="mt-3 inline-flex h-8 items-center rounded-lg border border-smoke-300 dark:border-charcoal-400/60 px-3 text-xs font-medium text-charcoal-800 dark:text-smoke-200 transition hover:border-electric/50 dark:hover:text-electric"
                >
                    {showAll ? 'Show fewer' : `Show all ${workflows.length} workflows`}
                </button>
            )}
        </Surface>
    )
}
