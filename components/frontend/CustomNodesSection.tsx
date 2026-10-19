import React from 'react'
import { CiDot, CiDotLegend, ciDotKind, proofDotKind } from '../Dot'
import { FetchError } from '../FetchError'
import { Surface } from '../Surface'
import { SectionHead, SectionMissing, SectionSkeleton } from './SectionState'
import type { useFrontendGate } from '../../src/frontend/client'
import { coreCommitUrl, runUrl } from '../../src/frontend/client'
import {
    CLEAN_ROW,
    cleanCounts,
    cleanShards,
    gateCell,
    proofCells,
    proofCounts,
    proofRows,
    streakSentence,
} from '../../src/frontend/gate'
import type { GateCell } from '../../src/frontend/gate'
import type { GateRun } from '../../src/frontend/types'
import { formatDuration } from '../../utils/format'
import { dateUtc, formatRelative } from '../../utils/time'

const TITLE = 'Custom-nodes gate'
const FILE = 'frontend/ci/custom-nodes.json'
const dim = 'text-ash-500 dark:text-smoke-800'
// The row label column stays put while the run columns scroll; it needs an opaque background.
const rowHead =
    'sticky left-0 z-10 whitespace-nowrap bg-white dark:bg-ink-800 px-3 py-1 text-left font-mono text-[11px] font-semibold text-charcoal-800 dark:text-smoke-100'

const utcTime = (t: number) => new Date(t * 1000).toISOString().slice(11, 16)

/** Hover text of a run's column header: when, how it was triggered, verdict, pin. */
function runTitle(run: GateRun): string {
    return [
        `run ${run.id} · ${dateUtc(run.t)} ${utcTime(run.t)} UTC`,
        run.ev === 'schedule' ? 'scheduled run' : 'dispatched run',
        run.c ?? (run.s ? run.s.replace(/_/g, ' ') : 'queued'),
        run.d != null ? formatDuration(run.d) : null,
        `verdict job: ${run.final ?? 'not completed'}`,
        run.jobs ? `${run.jobs[1]} of ${run.jobs[0]} jobs failed` : 'jobs not fetched yet',
        run.pin ? `core pin ${run.pin}` : 'core pin unknown',
        run.rs === 'dispatch' ? 'tested ref: dispatch input (not recorded yet)' : null,
        run.a != null && run.a > 1 ? `attempt ${run.a}` : null,
    ]
        .filter(Boolean)
        .join('\n')
}

/** Accessible name and hover text of one job dot. */
function cellTitle(run: GateRun, cell: GateCell, proof: boolean): string {
    const what = proof ? `proof row ${cell.row} on ${cell.shard}` : cell.shard
    const state =
        cell.c === undefined
            ? 'no job in this run'
            : cell.c === null
            ? 'not completed'
            : proof
            ? cell.c === 'success'
                ? 'break caught'
                : `break missed (${cell.c})`
            : cell.c
    return [
        `${what} · ${dateUtc(run.t)}`,
        state,
        cell.step ? `failed step: ${cell.step}` : null,
        run.pin ? `core pin ${run.pin}` : null,
    ]
        .filter(Boolean)
        .join('\n')
}

const Linked: React.FC<{ run: GateRun; children: React.ReactNode }> = ({ run, children }) => {
    const href = runUrl(run.id)
    return href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex rounded hover:ring-2 hover:ring-electric/50">
            {children}
        </a>
    ) : (
        <>{children}</>
    )
}

/** Column headers: one per run, newest first, the date vertical, dispatch runs in plum. */
const RunHeaders: React.FC<{ runs: GateRun[] }> = ({ runs }) => (
    <tr>
        <th className={rowHead}>
            <span className="sr-only">Row</span>
        </th>
        {runs.map((run) => {
            const href = runUrl(run.id)
            const dispatch = run.ev === 'workflow_dispatch'
            const text = `${dispatch ? 'D ' : ''}${dateUtc(run.t, false)}`
            const inner = (
                <span className="inline-block rotate-180 whitespace-nowrap text-[10px] font-medium [writing-mode:vertical-rl]">
                    {text}
                </span>
            )
            return (
                <th
                    key={run.id}
                    scope="col"
                    title={runTitle(run)}
                    className={`px-0.5 pb-1 text-center align-bottom ${
                        dispatch ? 'text-plum-600 dark:text-plum-300' : dim
                    }`}
                >
                    {href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-electric hover:underline">
                            {inner}
                        </a>
                    ) : (
                        inner
                    )}
                </th>
            )
        })}
    </tr>
)

/**
 * The daily gate: the custom-node suite on every shard against the pinned ComfyUI core,
 * one column per run, plus the detection proofs in their own grid. The streak sentence
 * above the grid is the headline, so a long red streak reads as one fact, not a wall.
 */
export const CustomNodesSection: React.FC<{ query: ReturnType<typeof useFrontendGate> }> = ({ query }) => {
    if (query.isPending) return <SectionSkeleton title={TITLE} rows={4} />
    if (query.isError) {
        return (
            <FetchError
                what="the custom-nodes gate"
                error={query.error}
                busy={query.isFetching}
                onRetry={() => query.refetch()}
            />
        )
    }
    const head = query.data
    if (!head) return <SectionMissing title={TITLE} file={FILE} />

    const runs = head.runs
    const shards = cleanShards(runs)
    const rows = proofRows(runs)
    const latest = runs.find((r) => r.ev === 'schedule') ?? runs[0]
    const red = head.streak?.state === 'fail'
    const pinHref = coreCommitUrl(head.pin)
    const caption = `${runs.length} of the last ${head.limit} runs · newest first · ${head.workflow}`
    const legend = ['success', 'failure', 'cancelled', 'skipped', 'in_progress', 'missing'] as const

    return (
        <Surface className="mb-6 p-5">
            <SectionHead title={TITLE} caption={caption} />
            <div
                role={red ? 'alert' : 'status'}
                className={`mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-4 py-2.5 text-sm ${
                    red
                        ? 'border-red-500/30 bg-red-500/[0.06] text-red-600 dark:text-red-400'
                        : 'border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-400'
                }`}
            >
                <span className={`h-2 w-2 shrink-0 rounded-full ${red ? 'bg-red-500' : 'bg-emerald-500'}`} />
                <span className="font-semibold">{streakSentence(head.streak)}</span>
                {latest && (
                    <span className="opacity-80">
                        · latest {latest.ev === 'schedule' ? 'scheduled run' : 'run'} {formatRelative(latest.t)}:
                        clean {cleanCounts(latest).pass}/{cleanCounts(latest).total}, proofs held{' '}
                        {proofCounts(latest).held}/{proofCounts(latest).total}
                        {latest.final ? `, verdict ${latest.final}` : ''}
                        {runUrl(latest.id) && (
                            <>
                                {' · '}
                                <a
                                    href={runUrl(latest.id) ?? undefined}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline"
                                >
                                    run
                                </a>
                            </>
                        )}
                    </span>
                )}
                {head.pin && (
                    <span className="opacity-80">
                        · core pin{' '}
                        {pinHref ? (
                            <a href={pinHref} target="_blank" rel="noopener noreferrer" className="font-mono hover:underline">
                                {head.pin.slice(0, 8)}
                            </a>
                        ) : (
                            <span className="font-mono">{head.pin.slice(0, 8)}</span>
                        )}
                    </span>
                )}
            </div>
            <p className={`mt-2 text-[11px] ${dim}`}>
                Clean shards are the gate: the suite runs on every shard against the pinned core, and a failed,
                skipped or flaky test fails the shard. Hover a dot for the failed step and the pin; the D columns
                are dispatched runs against another ref.
            </p>
            {runs.length === 0 ? (
                <p className={`mt-3 text-sm ${dim}`}>No gate runs recorded yet.</p>
            ) : (
                <>
                    <div className="mt-3 overflow-x-auto scrollbar-thin">
                        <table className="w-max border-separate border-spacing-0 text-sm">
                            <thead>
                                <RunHeaders runs={runs} />
                            </thead>
                            <tbody>
                                {shards.map((shard) => (
                                    <tr key={shard}>
                                        <th scope="row" className={rowHead}>
                                            {shard}
                                        </th>
                                        {runs.map((run) => {
                                            const cell = gateCell(run, CLEAN_ROW, shard)
                                            return (
                                                <td key={run.id} className="px-0.5 py-0.5 text-center">
                                                    <Linked run={run}>
                                                        <CiDot kind={ciDotKind(cell.c)} label={cellTitle(run, cell, false)} />
                                                    </Linked>
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                                <tr className="border-t border-smoke-200 dark:border-charcoal-400/40">
                                    <th scope="row" className={`${rowHead} border-t border-smoke-200 dark:border-charcoal-400/40`}>
                                        verdict job
                                    </th>
                                    {runs.map((run) => (
                                        <td
                                            key={run.id}
                                            className="border-t border-smoke-200 dark:border-charcoal-400/40 px-0.5 py-0.5 text-center"
                                        >
                                            <Linked run={run}>
                                                <CiDot
                                                    kind={ciDotKind(run.final)}
                                                    label={`verdict job · ${dateUtc(run.t)} · ${run.final ?? 'not completed'}`}
                                                />
                                            </Linked>
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-2">
                        <CiDotLegend kinds={[...legend]} />
                    </div>

                    <h3 className="mt-5 text-xs font-semibold text-charcoal-800 dark:text-smoke-100">
                        Detection proofs{' '}
                        <span className={`font-normal ${dim}`}>(green = the planted break was caught)</span>
                    </h3>
                    <p className={`mt-1 text-[11px] ${dim}`}>
                        Each proof row runs the suite with a planted break and passes only when exactly that break
                        was detected: it proves the suite can still catch a regression, not that a pack works.
                        Proof rows run on the daily schedule only, one shard each.
                    </p>
                    <div className="mt-2 overflow-x-auto scrollbar-thin">
                        <table className="w-max border-separate border-spacing-0 text-sm">
                            <thead>
                                <RunHeaders runs={runs} />
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr key={row}>
                                        <th scope="row" className={rowHead}>
                                            row {row}
                                        </th>
                                        {runs.map((run) => {
                                            const cells = proofCells(run, row)
                                            return (
                                                <td key={run.id} className="px-0.5 py-0.5 text-center">
                                                    {cells.length === 0 ? (
                                                        <CiDot
                                                            kind="missing"
                                                            label={`proof row ${row} · ${dateUtc(run.t)} · no job in this run`}
                                                        />
                                                    ) : (
                                                        <Linked run={run}>
                                                            <span className="inline-flex gap-[2px]">
                                                                {cells.map((cell) => (
                                                                    <CiDot
                                                                        key={cell.shard}
                                                                        kind={proofDotKind(cell.c)}
                                                                        label={cellTitle(run, cell, true)}
                                                                    />
                                                                ))}
                                                            </span>
                                                        </Linked>
                                                    )}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-2">
                        <CiDotLegend kinds={['held', 'broken', 'in_progress', 'missing']} />
                    </div>
                </>
            )}
        </Surface>
    )
}
