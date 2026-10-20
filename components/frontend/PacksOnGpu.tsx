import Link from 'next/link'
import React from 'react'
import { FetchError } from '../FetchError'
import { RegressionBadge } from '../RegressionBadge'
import { Surface } from '../Surface'
import { WorkflowDot, cellState, dotKind, dotText } from '../WorkflowDots'
import type { DotKind } from '../WorkflowDots'
import { SectionHead, SectionSkeleton } from './SectionState'
import type { PackLanesState } from '../../src/frontend/client'
import { usePackRegistry } from '../../src/frontend/client'
import {
    laneCaption,
    lanePageHref,
    packNames,
    packPin,
    packStatusCounts,
    packTone,
} from '../../src/frontend/packs'
import type { PackLane, PackRef, PackRegistry, PackTone, PackWorkflow } from '../../src/frontend/packs'
import type { IndexEntry, PackImportStatus } from '../../src/regression/types'
import { commitPageHref } from '../../src/regression/validate'
import { formatGb } from '../../utils/format'
import { dateUtc, formatRelative } from '../../utils/time'

const TITLE = 'Custom-node packs on GPU'
/** Runs shown per workflow, oldest to newest. */
const RUNS = 12
const dim = 'text-ash-500 dark:text-smoke-800'
const th = 'px-3 py-2 font-semibold'
const td = 'px-3 py-2.5 align-top'
const shaLink = 'font-mono hover:underline'
const GREEN = 'text-emerald-600 dark:text-emerald-400'
const RED = 'text-red-600 dark:text-red-400'

// Green, red, grey: the worker's three import outcomes, with a dot so the row reads in greyscale.
const STATUS: Record<PackImportStatus, { text: string; title: string; cls: string; dot: string }> = {
    ok: { text: 'ok', title: 'ComfyUI imported the pack at startup', cls: GREEN, dot: 'bg-emerald-500' },
    failed: { text: 'failed', title: 'ComfyUI failed to import the pack', cls: RED, dot: 'bg-red-500' },
    missing: {
        text: 'missing',
        title: 'The pack was not found in the ComfyUI startup log',
        cls: 'text-ash-500 dark:text-smoke-700',
        dot: 'bg-ash-500/50 dark:bg-smoke-800/60',
    },
}

// Status line per tone; the KPI card colours its value by the same tone.
const TONE: Record<PackTone, { box: string; dot: string }> = {
    red: { box: 'border-red-500/30 bg-red-500/[0.06] text-red-600 dark:text-red-400', dot: 'bg-red-500' },
    amber: { box: 'border-amber-500/30 bg-amber-400/[0.06] text-amber-700 dark:text-amber-300', dot: 'bg-amber-400' },
    green: {
        box: 'border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-400',
        dot: 'bg-emerald-500',
    },
}

const LEGEND_ORDER: DotKind[] = [
    'pass',
    'fail',
    'inherited',
    'accepted',
    'execution_error',
    'infra_error',
    'no_baseline',
    'missing',
]

/** The runs shown per workflow: the lane's newest RUNS entries, oldest to newest. */
const shownRuns = (lane: PackLane) => lane.head.entries.slice(0, RUNS).reverse()

/** Dot kind of one workflow in one run; missing when the workflow did not run at that commit. */
const runKind = (lane: PackLane, wf: string, entry: IndexEntry): DotKind => {
    const cell = entry.w[wf]
    return dotKind(cell ? cellState(cell, wf, lane.info.goldens) : null)
}

/** The dot kinds the section shows, for a legend of only those. */
function presentKinds(lanes: PackLane[]): DotKind[] {
    const seen = new Set<DotKind>()
    for (const lane of lanes) {
        const runs = shownRuns(lane)
        for (const pw of lane.workflows) for (const entry of runs) seen.add(runKind(lane, pw.wf, entry))
    }
    return LEGEND_ORDER.filter((kind) => seen.has(kind))
}

/** Hover text of one run dot: workflow, commit, date, verdict, numbers, and any pack that did not import. */
function dotLabel(wf: string, entry: IndexEntry, kind: DotKind): string {
    const cell = entry.w[wf]
    const head = `${wf} · ${entry.c.slice(0, 7)} · ${dateUtc(entry.t)}`
    if (!cell) return `${head} · not run at this commit`
    const facts: string[] = [dotText(kind)]
    if (cell.exec != null) facts.push(`${cell.exec.toFixed(1)}s`)
    if (cell.vram != null) facts.push(formatGb(cell.vram))
    if (cell.g) facts.push(`golden ${cell.g}`)
    const cn = cell.cn ?? {}
    const off = Object.keys(cn).filter((name) => cn[name] !== 'ok')
    if (off.length) facts.push(off.map((name) => `${name} ${cn[name]}`).join(', '))
    return `${head} · ${facts.join(' · ')}`
}

/** The last RUNS runs of one workflow as dots, oldest to newest, each linking to its commit page. */
function RunDots({ lane, wf }: { lane: PackLane; wf: string }) {
    const runs = shownRuns(lane)
    return (
        <ul className="inline-flex gap-[3px]" aria-label={`last ${runs.length} runs, oldest to newest`}>
            {runs.map((entry) => {
                const kind = runKind(lane, wf, entry)
                return (
                    <li key={`${entry.c}:${entry.t}`}>
                        <Link
                            href={commitPageHref(lane.branch, entry.c, lane.id)}
                            className="inline-flex rounded hover:ring-2 hover:ring-electric/50"
                        >
                            <WorkflowDot kind={kind} label={dotLabel(wf, entry, kind)} />
                        </Link>
                    </li>
                )
            })}
        </ul>
    )
}

/** One pack of a workflow: its import status, then the registry's label and pinned commit when known. */
const Pack: React.FC<{ pack: PackRef; registry: PackRegistry | null | undefined }> = ({ pack, registry }) => {
    const style = STATUS[pack.status]
    const pin = packPin(registry, pack.name)
    const title = [
        `${pack.name} · ${style.text}`,
        style.title,
        pin?.label ? pin.label : null,
        pin?.sha ? `pinned at ${pin.sha}` : null,
    ]
        .filter(Boolean)
        .join('\n')
    return (
        <li className="flex items-center gap-x-1.5 whitespace-nowrap text-[11px]" title={title}>
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
            <span className={`font-mono font-semibold ${style.cls}`}>{pack.name}</span>
            <span className={style.cls}>{style.text}</span>
            {pin && (pin.label || pin.href) && (
                <span className={dim}>
                    {pin.label && <>· {pin.label}</>}
                    {pin.href && pin.sha && (
                        <>
                            {' · '}
                            <a href={pin.href} target="_blank" rel="noopener noreferrer" className={shaLink}>
                                {pin.sha.slice(0, 7)}
                            </a>
                        </>
                    )}
                </span>
            )}
        </li>
    )
}

function Row({
    lane,
    pw,
    registry,
}: {
    lane: PackLane
    pw: PackWorkflow
    registry: PackRegistry | null | undefined
}) {
    const state = cellState(pw.cell, pw.wf, lane.info.goldens)
    const tag = pw.cell.g ?? lane.info.goldens?.[pw.wf]?.tag ?? null
    const red = state.verdict === 'fail' || state.verdict === 'execution_error'
    return (
        <tr className={`transition-colors hover:bg-smoke-200/60 dark:hover:bg-charcoal-700/40 ${red ? 'bg-red-500/[0.06] dark:bg-red-500/[0.08]' : ''}`}>
            <td className={td}>
                <Link
                    href={commitPageHref(lane.branch, lane.newest.c, lane.id)}
                    className="break-all font-mono text-xs font-semibold text-charcoal-800 dark:text-smoke-100 hover:underline"
                    title={`${pw.wf} at ${lane.newest.c.slice(0, 7)}: open the commit page`}
                >
                    {pw.wf}
                </Link>
            </td>
            <td className={`${td} whitespace-nowrap`}>
                <RegressionBadge verdict={state.verdict} inherited={state.inherited} />
            </td>
            <td className={`${td} whitespace-nowrap`}>
                <RunDots lane={lane} wf={pw.wf} />
            </td>
            <td className={`${td} whitespace-nowrap font-mono text-xs tabular-nums ${dim}`}>
                {pw.cell.exec != null ? `${pw.cell.exec.toFixed(1)}s` : '—'}
            </td>
            <td className={`${td} whitespace-nowrap font-mono text-xs ${dim}`}>{tag ?? '—'}</td>
            <td className={td}>
                <ul className="flex flex-col gap-1">
                    {pw.packs.map((pack) => (
                        <Pack key={pack.name} pack={pack} registry={registry} />
                    ))}
                </ul>
            </td>
        </tr>
    )
}

/** One lane: a headline for its newest run, then one row per pack workflow. */
function LaneBlock({
    lane,
    registry,
    showCaption,
}: {
    lane: PackLane
    registry: PackRegistry | null | undefined
    showCaption: boolean
}) {
    const states = lane.workflows.map((pw) => cellState(pw.cell, pw.wf, lane.info.goldens))
    const passing = states.filter((s) => s.verdict === 'pass').length
    const counts = packStatusCounts(lane.workflows)
    const names = packNames(lane.workflows)
    const tone = packTone(states, lane.workflows)
    const packsText = [
        `${counts.ok} of ${names.length} packs ok`,
        counts.failed ? `${counts.failed} failed` : null,
        counts.missing ? `${counts.missing} missing` : null,
    ]
        .filter(Boolean)
        .join(', ')

    return (
        <div className="mt-3">
            {showCaption && <p className={`text-[11px] ${dim}`}>{laneCaption(lane.info)}</p>}
            <div
                role={tone === 'red' ? 'alert' : 'status'}
                className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-4 py-2.5 text-sm ${TONE[tone].box}`}
            >
                <span className={`h-2 w-2 shrink-0 rounded-full ${TONE[tone].dot}`} />
                <span className="font-semibold">
                    {passing} of {states.length} pack workflows passing
                </span>
                <span className="opacity-80">
                    · {packsText} · core{' '}
                    <Link href={commitPageHref(lane.branch, lane.newest.c, lane.id)} className={shaLink}>
                        {lane.newest.c.slice(0, 7)}
                    </Link>{' '}
                    {formatRelative(lane.newest.t)}
                    {lane.newest.m?.s ? ` · ${lane.newest.m.s}` : ''}
                </span>
            </div>
            {/* w-max: the table takes its content width and scrolls, like the gate tables, instead of
                squeezing the Packs column until every pack wraps over several lines on a phone. */}
            <div className="mt-3 overflow-x-auto scrollbar-thin">
                <table className="w-max min-w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-smoke-300 dark:border-charcoal-400/60 text-[11px] uppercase tracking-wider text-ash-500 dark:text-smoke-800">
                            <th className={th}>Workflow</th>
                            <th className={th}>Latest</th>
                            <th className={th} title="One dot per core commit, oldest to newest; hover for the verdict, click for the commit page">
                                Last {Math.min(RUNS, lane.head.entries.length)} runs
                            </th>
                            <th className={th}>Exec</th>
                            <th className={th}>Golden</th>
                            <th className={th}>Packs</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-smoke-200 dark:divide-charcoal-400/40">
                        {lane.workflows.map((pw) => (
                            <Row key={pw.wf} lane={lane} pw={pw} registry={registry} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

/**
 * The custom-node packs the core GPU regression runs on real GPUs, for the people they
 * are for: one row per pack workflow of every lane whose newest run has one, with the
 * last runs as dots, the latest verdict, and each pack's import status and pinned commit.
 */
export const PacksOnGpu: React.FC<{ packs: PackLanesState }> = ({ packs }) => {
    const registry = usePackRegistry()

    if (packs.pending) return <SectionSkeleton title={TITLE} rows={4} />
    const { lanes, failure } = packs
    if (failure && lanes.length === 0) {
        return <FetchError what={failure.what} error={failure.error} busy={failure.busy} onRetry={failure.retry} />
    }
    if (lanes.length === 0) {
        return (
            <Surface className="mb-6 p-5">
                <SectionHead title={TITLE} />
                <p className={`mt-2 text-sm ${dim}`}>No GPU pack runs published yet.</p>
            </Surface>
        )
    }

    const caption = lanes.length === 1 ? laneCaption(lanes[0].info) : `${lanes.length} lanes`
    const legend = presentKinds(lanes)

    return (
        <Surface className="mb-6 p-5">
            <SectionHead title={TITLE} caption={caption} />
            {lanes.map((lane) => (
                <LaneBlock key={lane.id} lane={lane} registry={registry.data} showCaption={lanes.length > 1} />
            ))}
            {legend.length > 0 && (
                <ul className={`mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] ${dim}`}>
                    {legend.map((kind) => (
                        <li key={kind} className="flex items-center gap-1.5">
                            <WorkflowDot kind={kind} />
                            {dotText(kind)}
                        </li>
                    ))}
                </ul>
            )}
            <p className={`mt-3 text-[11px] ${dim}`}>
                The core GPU regression installs these packs at the commits the frontend{"'"}s custom-node gate pins
                and bit-compares the outputs against goldens on every core commit; a pack that fails to import turns
                its workflow red even when the workflow uses none of its nodes.
                {registry.isError && ' Pack pins could not be loaded from the registry.'}
            </p>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium">
                {lanes.map((lane) => (
                    <Link
                        key={lane.id}
                        href={lanePageHref(lane.id)}
                        className="text-sapphire-700 dark:text-electric hover:underline"
                    >
                        All lanes and workflows on the Regression tab
                        {lanes.length > 1 ? ` (${lane.info.label})` : ''} →
                    </Link>
                ))}
            </p>
        </Surface>
    )
}
