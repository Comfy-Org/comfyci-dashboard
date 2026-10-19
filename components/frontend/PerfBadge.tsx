import React from 'react'
import { CLASS_META } from '../../src/frontend/perf'
import type { PerfClass } from '../../src/frontend/types'

// Colour per class plus a shape cue in the leading mark (filled, hollow, dashed) so the
// badges still differ in greyscale. Plain spans with a title: no floating tooltips.
const STYLE: Record<PerfClass, { pill: string; mark: string }> = {
    r: {
        pill: 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400',
        mark: 'bg-red-500',
    },
    i: {
        pill: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
        mark: 'bg-emerald-500',
    },
    x: {
        pill: 'border-amber-500/50 bg-amber-400/10 text-amber-700 dark:text-amber-300',
        mark: 'border-2 border-amber-500 dark:border-amber-400',
    },
    n: {
        pill: 'border-smoke-300 dark:border-charcoal-300/60 text-ash-500 dark:text-smoke-700',
        mark: 'border border-ash-500/70 dark:border-smoke-700/70',
    },
    '-': {
        pill: 'border-dashed border-smoke-300 dark:border-charcoal-300/60 text-ash-500/80 dark:text-smoke-800',
        mark: 'border border-dashed border-ash-500/70 dark:border-smoke-700/70',
    },
}

const UNMEASURED = { text: 'Not measured', title: 'The scenario is absent from the latest baseline' }

/** The frontend's verdict on one scenario and metric at the latest baseline. */
export const PerfBadge: React.FC<{ cls: PerfClass | null; title?: string }> = ({ cls, title }) => {
    const meta = cls ? CLASS_META[cls] : UNMEASURED
    const style = STYLE[cls ?? '-']
    return (
        <span
            title={title ?? meta.title}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${style.pill}`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${style.mark}`} />
            {meta.text}
        </span>
    )
}

/** Key to the badges and the point markers, rendered under the perf section. */
export const PerfLegend: React.FC = () => (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ash-500 dark:text-smoke-800">
        {(['r', 'i', 'x', 'n', '-'] as PerfClass[]).map((cls) => (
            <li key={cls} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${STYLE[cls].mark}`} />
                {CLASS_META[cls].text.toLowerCase()}
            </li>
        ))}
    </ul>
)
