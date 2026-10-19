import React from 'react'
import type { CiConclusion } from '../src/frontend/types'

/** A dot's look: Tailwind classes for the shape and an optional one-character glyph inside it. */
export interface DotSpec {
    shape: string
    glyph?: string
}

export type WorkflowDotKind =
    | 'pass'
    | 'fail'
    | 'inherited'
    | 'accepted'
    | 'execution_error'
    | 'infra_error'
    | 'no_baseline'
    | 'missing'

// Shape first, colour second, so a row still reads in greyscale: filled circle, filled
// square, hollow square, diamond, "!" square, triangle, "?" ring, dash. Every pair of
// kinds differs by shape, fill or glyph; the colours are the ones the badges already use.
// Amber steps down one shade on white so the small shapes keep their contrast.
export const DOT_SHAPES: Record<WorkflowDotKind, DotSpec> = {
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

/**
 * States of a GitHub Actions job or run cell. `held` and `broken` are the detection
 * proofs of the custom-nodes gate (the planted break was caught, or was not); they share
 * the pass and fail shapes because they sit in their own labelled grid.
 */
export type CiDotKind =
    | 'success'
    | 'failure'
    | 'cancelled'
    | 'skipped'
    | 'in_progress'
    | 'missing'
    | 'held'
    | 'broken'

// Filled green circle, filled red square, hollow grey circle, dashed grey square, pulsing
// accent circle, thin dash: each kind still differs by shape or motion without colour.
export const CI_DOT: Record<CiDotKind, DotSpec> = {
    success: DOT_SHAPES.pass,
    failure: DOT_SHAPES.fail,
    cancelled: { shape: 'h-2.5 w-2.5 rounded-full border-2 border-ash-500/70 dark:border-smoke-700/70' },
    skipped: {
        shape: 'h-2.5 w-2.5 rounded-[2px] border-2 border-dashed border-ash-500/70 dark:border-smoke-700/70',
    },
    in_progress: { shape: 'h-2.5 w-2.5 animate-pulse rounded-full bg-sapphire-700 dark:bg-electric' },
    missing: DOT_SHAPES.missing,
    held: DOT_SHAPES.pass,
    broken: DOT_SHAPES.fail,
}

export const CI_DOT_TEXT: Record<CiDotKind, string> = {
    success: 'success',
    failure: 'failure',
    cancelled: 'cancelled',
    skipped: 'skipped',
    in_progress: 'in progress',
    missing: 'no run',
    held: 'break caught',
    broken: 'break missed',
}

/**
 * Dot kind for a job or run conclusion: undefined means the job is absent, null that it
 * has not completed. Timed-out and startup failures are failures; neutral, stale,
 * action-required and skipped all read as skipped.
 */
export function ciDotKind(conclusion: CiConclusion | null | undefined): CiDotKind {
    if (conclusion === undefined) return 'missing'
    if (conclusion === null) return 'in_progress'
    switch (conclusion) {
        case 'success':
            return 'success'
        case 'failure':
        case 'timed_out':
        case 'startup_failure':
            return 'failure'
        case 'cancelled':
            return 'cancelled'
        default:
            return 'skipped'
    }
}

/** Dot kind for a detection-proof job: a passing job means the planted break was caught. */
export function proofDotKind(conclusion: CiConclusion | null | undefined): CiDotKind {
    const kind = ciDotKind(conclusion)
    if (kind === 'success') return 'held'
    if (kind === 'failure') return 'broken'
    return kind
}

/**
 * One dot. A plain span, not a button or Tooltip: hundreds of cells would otherwise
 * mount hundreds of floating tooltips and tab stops. With `label` it is an image with
 * that accessible name; without, it is decorative and the text sits beside it.
 */
export const Dot: React.FC<{ spec: DotSpec; label?: string; title?: string }> = ({ spec, label, title }) => (
    <span
        role={label ? 'img' : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        title={title ?? label}
        className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center"
    >
        <span className={`inline-flex items-center justify-center ${spec.shape}`}>{spec.glyph}</span>
    </span>
)

export const CiDot: React.FC<{ kind: CiDotKind; label?: string; title?: string }> = ({ kind, label, title }) => (
    <Dot spec={CI_DOT[kind]} label={label} title={title} />
)

/** Shape key for a grid of CI dots; pass the kinds the grid can show. */
export const CiDotLegend: React.FC<{ kinds: CiDotKind[]; text?: Partial<Record<CiDotKind, string>> }> = ({
    kinds,
    text,
}) => (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ash-500 dark:text-smoke-800">
        {kinds.map((kind) => (
            <li key={kind} className="flex items-center gap-1.5">
                <CiDot kind={kind} />
                {text?.[kind] ?? CI_DOT_TEXT[kind]}
            </li>
        ))}
    </ul>
)
