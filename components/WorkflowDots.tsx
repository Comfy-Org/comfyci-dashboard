import React from 'react'
import { badgeMeta, displayVerdict } from './RegressionBadge'
import type { DisplayState } from './RegressionBadge'
import type { IndexEntry, IndexWorkflowCell, LaneInfo } from '../src/regression/types'
import { formatGb } from '../utils/format'

/** One workflow slot in a run: the index cell and its display state, or neither when it did not run. */
export interface CellState {
    wf: string
    /** 1-based slot number in the lane's fixed order, shared by the dots, the strip and the legend. */
    index: number
    cell: IndexWorkflowCell | null
    state: DisplayState | null
}

/** Display state of a raw index cell against its lane golden. */
export const cellState = (cell: IndexWorkflowCell, wf: string, goldens?: LaneInfo['goldens']) =>
    displayVerdict(cell.v, cell.sha, goldens?.[wf]?.sha, cell.d)

/** The run's cells in the lane's fixed order; a workflow absent from the run yields nulls. */
export function cellStates(
    entry: IndexEntry,
    workflows: string[],
    goldens?: LaneInfo['goldens']
): CellState[] {
    return workflows.map((wf, i) => {
        const cell = entry.w[wf]
        if (!cell) return { wf, index: i + 1, cell: null, state: null }
        return { wf, index: i + 1, cell, state: cellState(cell, wf, goldens) }
    })
}

/**
 * A cell that moved away from the golden in some way: failing, re-blessed, unable to
 * run, or passing but not bit-identical (mse > 0 within thresholds). Infra errors and
 * missing baselines are not drift: nothing was compared.
 */
export const driftedCell = (cell: IndexWorkflowCell, state: DisplayState) =>
    state.verdict === 'fail' ||
    state.verdict === 'accepted' ||
    state.verdict === 'execution_error' ||
    (cell.mse != null && cell.mse > 0)

/** A cell that was compared against a golden, or failed trying; infra and no-baseline cells were not. */
export const scoredCell = (state: DisplayState) =>
    state.verdict !== 'infra_error' && state.verdict !== 'no_baseline'

/**
 * The drift or execution failure began at this run. Reads the raw verdicts on purpose:
 * after a re-bless every old failure displays as accepted, but its origin commit is
 * still the one whose output first differed from the run before it.
 */
export const driftStartedHere = (cell: IndexWorkflowCell) =>
    cell.v === 'execution_error' || (cell.v === 'fail' && cell.d !== 'inherited')

export type DotKind =
    | 'pass'
    | 'fail'
    | 'inherited'
    | 'accepted'
    | 'execution_error'
    | 'infra_error'
    | 'no_baseline'
    | 'missing'

export function dotKind(state: DisplayState | null): DotKind {
    if (!state) return 'missing'
    if (state.verdict === 'fail') return state.inherited ? 'inherited' : 'fail'
    return state.verdict
}

// Shape first, colour second, so a row still reads in greyscale: filled circle, filled
// square, hollow square, diamond, "!" square, triangle, "?" ring, dash. Every pair of
// kinds differs by shape, fill or glyph; the colours are the ones the badges already use.
// Amber steps down one shade on white so the small shapes keep their contrast.
const DOT: Record<DotKind, { shape: string; glyph?: string }> = {
    pass: { shape: 'h-2.5 w-2.5 rounded-full bg-emerald-500' },
    fail: { shape: 'h-2.5 w-2.5 rounded-[2px] bg-red-500' },
    inherited: { shape: 'h-2.5 w-2.5 rounded-[2px] border-2 border-red-500/70' },
    accepted: { shape: 'h-2 w-2 rotate-45 rounded-[1px] bg-amber-500 dark:bg-amber-400' },
    execution_error: {
        shape: 'h-3.5 w-3.5 rounded-[3px] bg-red-500 text-[9px] font-bold leading-none text-white',
        glyph: '!',
    },
    infra_error: {
        shape: 'h-3 w-3 bg-amber-500 dark:bg-amber-400 [clip-path:polygon(50%_0%,100%_100%,0%_100%)]',
    },
    no_baseline: {
        shape: 'h-3.5 w-3.5 rounded-full border border-ash-500/70 dark:border-smoke-700/70 text-[9px] font-bold leading-none text-ash-500 dark:text-smoke-700',
        glyph: '?',
    },
    missing: { shape: 'h-[1.5px] w-2 rounded-full bg-ash-500/50 dark:bg-smoke-800/60' },
}

/** Legend wording per kind; verdict texts come from the badge metadata so they never diverge. */
export function dotText(kind: DotKind): string {
    if (kind === 'missing') return 'not run'
    if (kind === 'inherited') return badgeMeta('fail', true).text
    return badgeMeta(kind).text
}

/**
 * Accessible name and hover text for one slot: "#n id · verdict" first, then the
 * verdict's explanation, then the numbers (MSE, exec, peak VRAM, golden tag).
 */
export function slotText(c: CellState): { label: string; title: string } {
    const head = `#${c.index} ${c.wf}`
    if (!c.cell || !c.state) {
        const label = `${head} · not run at this commit`
        return { label, title: label }
    }
    const meta = badgeMeta(c.state.verdict, c.state.inherited)
    const facts: string[] = []
    if (c.cell.mse != null && c.cell.mse > 0) facts.push(`MSE ${c.cell.mse.toFixed(4)}`)
    if (c.cell.exec != null) facts.push(`${c.cell.exec.toFixed(1)}s`)
    if (c.cell.vram != null) facts.push(formatGb(c.cell.vram))
    if (c.cell.g) facts.push(`golden ${c.cell.g}`)
    const first = `${head} · ${meta.text}`
    const label = facts.length ? `${first} · ${facts.join(' · ')}` : first
    const title = [first, meta.title, facts.join(' · ')].filter(Boolean).join('\n')
    return { label, title }
}

/**
 * One workflow slot. A plain span, not a button or Tooltip: 25 rows x 25 slots would
 * otherwise mount hundreds of floating tooltips and tab stops. With `label` it is an
 * image with that accessible name; without, it is decorative and the text sits beside it.
 */
export const WorkflowDot: React.FC<{ kind: DotKind; label?: string; title?: string }> = ({
    kind,
    label,
    title,
}) => {
    const d = DOT[kind]
    return (
        <span
            role={label ? 'img' : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : true}
            title={title ?? label}
            className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center"
        >
            <span className={`inline-flex items-center justify-center ${d.shape}`}>{d.glyph}</span>
        </span>
    )
}

const GROUP = 5

/**
 * The run's slots in lane order, in groups of five that wrap as units, so slot
 * columns stay aligned from row to row and "group 3, dot 2" means the same workflow
 * on every line. 25 workflows fit one line on a laptop; the cell never widens the table.
 */
export const WorkflowDots: React.FC<{ cells: CellState[] }> = ({ cells }) => {
    const groups: CellState[][] = []
    for (let i = 0; i < cells.length; i += GROUP) groups.push(cells.slice(i, i + GROUP))
    return (
        <ul className="flex max-w-[28rem] flex-wrap gap-x-2 gap-y-1.5" aria-label={`${cells.length} workflows`}>
            {groups.map((group) => (
                <li key={group[0].wf} className="inline-flex gap-[3px]">
                    {group.map((c) => {
                        const { label, title } = slotText(c)
                        return <WorkflowDot key={c.wf} kind={dotKind(c.state)} label={label} title={title} />
                    })}
                </li>
            ))}
        </ul>
    )
}

const LEGEND: DotKind[] = [
    'pass',
    'fail',
    'inherited',
    'accepted',
    'execution_error',
    'infra_error',
    'no_baseline',
    'missing',
]

/** Shape key for the dots, rendered under the history table. */
export const DotLegend: React.FC = () => (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ash-500 dark:text-smoke-800">
        {LEGEND.map((kind) => (
            <li key={kind} className="flex items-center gap-1.5">
                <WorkflowDot kind={kind} />
                {dotText(kind)}
            </li>
        ))}
    </ul>
)
