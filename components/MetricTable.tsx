import type { ReactNode } from 'react'
import {
    comparisonKind,
    fileCountsDiffer,
    firstDiffAt,
    imageThresholds,
    minTextSimilarity,
    nothingCompared,
    similarityBasisNote,
    similarityPct,
} from '../src/regression/comparison'
import type { ComparisonKind } from '../src/regression/comparison'
import type { ComparisonMetrics, TextThresholds, Thresholds } from '../src/regression/types'

interface MetricTableProps {
    vsGolden: ComparisonMetrics | null
    vsPrevious: ComparisonMetrics | null
    thresholds: Thresholds | TextThresholds | null
    /** The golden's re-run compared with itself: how much drift the setup produces on its own. */
    noiseFloor?: ComparisonMetrics | null
}

// One table speaks one language: image metrics, text facts, or just same or different for
// a kind of output this page does not know.
const COLUMNS: Record<ComparisonKind, string[]> = {
    image: ['Mean MSE', 'PSNR (dB)', '% Pixels Changed', 'Max Abs Diff', 'Frames'],
    text: ['Result', 'Similarity', 'First difference'],
    other: ['Result'],
}

const IDENTICAL: Record<ComparisonKind, string> = {
    image: 'Outputs are bit-identical',
    text: 'Text is identical',
    other: 'Outputs are identical',
}

const fmt = (v: number | null | undefined, digits = 2) =>
    v === null || v === undefined ? '—' : v.toFixed(digits)

const bad = 'font-semibold text-red-400'

function ImageCells({ metrics, thresholds }: { metrics: ComparisonMetrics; thresholds: Thresholds | null }) {
    const mseBad = thresholds != null && (metrics.mean_mse ?? 0) > thresholds.max_mean_mse
    const psnrBad =
        thresholds != null &&
        metrics.mean_psnr_db != null &&
        metrics.mean_psnr_db < thresholds.min_mean_psnr_db
    const pctBad =
        thresholds != null &&
        (metrics.mean_pct_pixels_changed ?? 0) > thresholds.max_pct_pixels_changed
    return (
        <>
            <td className={`px-4 py-2 font-mono tabular-nums ${mseBad ? bad : ''}`}>
                {fmt(metrics.mean_mse, 4)}
            </td>
            <td className={`px-4 py-2 font-mono tabular-nums ${psnrBad ? bad : ''}`}>
                {fmt(metrics.mean_psnr_db)}
                {metrics.min_psnr_db != null && (
                    <span className="text-ash-500 dark:text-smoke-800">
                        {' '}
                        (min {fmt(metrics.min_psnr_db)})
                    </span>
                )}
            </td>
            <td className={`px-4 py-2 font-mono tabular-nums ${pctBad ? bad : ''}`}>
                {fmt(metrics.mean_pct_pixels_changed, 3)}
            </td>
            <td className="px-4 py-2 font-mono tabular-nums">{metrics.max_abs_diff ?? '—'}</td>
            <td className="px-4 py-2 font-mono tabular-nums">
                {metrics.frames_compared ?? '—'}
                {metrics.frame_count_ref !== metrics.frame_count_cand && (
                    <span className="text-red-400">
                        {' '}
                        ({metrics.frame_count_ref} vs {metrics.frame_count_cand})
                    </span>
                )}
            </td>
        </>
    )
}

// Text, or a kind this page does not know. `floor` is the similarity a text has to reach;
// null means it has to match exactly, so "Different" is itself the failure. How an
// unknown kind is judged is not known here, so nothing of it is flagged.
function PlainCells({
    metrics,
    kind,
    judged,
    floor,
}: {
    metrics: ComparisonMetrics
    kind: ComparisonKind
    judged: boolean
    floor: number | null
}) {
    // Published JSON is not shape-checked: only a number is formatted as one.
    // With no pair of files there is nothing to be similar: the worker's 0 is not shown.
    const similarity =
        typeof metrics.similarity === 'number' && !nothingCompared(metrics) ? metrics.similarity : null
    const exact = kind === 'text' && judged && floor == null
    const below = judged && floor != null && similarity != null && similarity < floor
    // A judged text result with no pair of files failed, whatever limit applies.
    const unmatched = kind === 'text' && judged && nothingCompared(metrics)
    return (
        <>
            <td className={`px-4 py-2 ${exact && metrics.identical === false ? bad : ''}`}>
                {metrics.identical === false ? 'Different' : '—'}
                {fileCountsDiffer(metrics) && (
                    <span className="font-normal text-red-400">
                        {' '}
                        ({metrics.file_count_ref} vs {metrics.file_count_cand} files)
                    </span>
                )}
            </td>
            {kind === 'text' && (
                <>
                    {unmatched ? (
                        <td className={`px-4 py-2 ${bad}`}>No matching text files</td>
                    ) : (
                        <td className={`px-4 py-2 font-mono tabular-nums ${below ? bad : ''}`}>
                            {similarity == null ? '—' : similarityPct(similarity, false)}
                            {similarity != null && (
                                <span className="font-sans text-xs">{similarityBasisNote(metrics)}</span>
                            )}
                        </td>
                    )}
                    <td className="px-4 py-2 font-mono tabular-nums">
                        {firstDiffAt(metrics.first_diff) ?? '—'}
                    </td>
                </>
            )}
        </>
    )
}

function MetricRow({
    label,
    metrics,
    kind,
    thresholds,
    judged,
}: {
    label: ReactNode
    metrics: ComparisonMetrics
    kind: ComparisonKind
    thresholds: Thresholds | TextThresholds | null
    /** False for the previous run: it is shown for context, no limit applies to it. */
    judged: boolean
}) {
    const span = COLUMNS[kind].length
    if (metrics.error) {
        return (
            <tr className="border-t border-smoke-200 dark:border-charcoal-400/40">
                <td className="px-4 py-2 font-medium">{label}</td>
                <td colSpan={span} className="px-4 py-2 text-red-400">
                    {metrics.error}
                </td>
            </tr>
        )
    }
    if (metrics.identical) {
        return (
            <tr className="border-t border-smoke-200 dark:border-charcoal-400/40">
                <td className="px-4 py-2 font-medium">{label}</td>
                <td colSpan={span} className="px-4 py-2 text-emerald-400 font-medium">
                    {IDENTICAL[kind]}
                </td>
            </tr>
        )
    }
    return (
        <tr className="border-t border-smoke-200 dark:border-charcoal-400/40">
            <td className="px-4 py-2 font-medium">{label}</td>
            {kind === 'image' ? (
                <ImageCells metrics={metrics} thresholds={judged ? imageThresholds(thresholds) : null} />
            ) : (
                <PlainCells
                    metrics={metrics}
                    kind={kind}
                    judged={judged}
                    floor={minTextSimilarity(thresholds)}
                />
            )}
        </tr>
    )
}

export const MetricTable: React.FC<MetricTableProps> = ({
    vsGolden,
    vsPrevious,
    thresholds,
    noiseFloor,
}) => {
    if (!vsGolden && !vsPrevious) return null
    // A comparison without a kind is of images, so every run published before text
    // workflows gets the image columns it always had.
    const kind = comparisonKind(vsGolden ?? vsPrevious)
    const limits = kind === 'image' ? imageThresholds(thresholds) : null
    const floor = kind === 'text' ? minTextSimilarity(thresholds) : null
    return (
        <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-ash-500 dark:text-smoke-800">
                        <th className="px-4 py-2 font-semibold">Baseline</th>
                        {COLUMNS[kind].map((name) => (
                            <th key={name} className="px-4 py-2 font-semibold">
                                {name}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {vsGolden && (
                        <MetricRow label="vs Golden" metrics={vsGolden} kind={kind} thresholds={thresholds} judged />
                    )}
                    {vsPrevious && (
                        <MetricRow
                            label="vs Previous"
                            metrics={vsPrevious}
                            kind={kind}
                            thresholds={thresholds}
                            judged={false}
                        />
                    )}
                    {noiseFloor && (
                        <MetricRow
                            label={
                                <>
                                    Noise floor{' '}
                                    <span className="font-normal text-ash-500 dark:text-smoke-800">
                                        (golden re-run)
                                    </span>
                                </>
                            }
                            metrics={noiseFloor}
                            kind={kind}
                            thresholds={thresholds}
                            judged
                        />
                    )}
                </tbody>
            </table>
            {limits && (
                <p className="px-4 pb-2 pt-1 text-[11px] text-ash-500 dark:text-smoke-800">
                    Thresholds (vs golden): MSE ≤ {limits.max_mean_mse} · PSNR ≥{' '}
                    {limits.min_mean_psnr_db} dB · pixels changed ≤{' '}
                    {limits.max_pct_pixels_changed}%
                </p>
            )}
            {floor != null && (
                <p className="px-4 pb-2 pt-1 text-[11px] text-ash-500 dark:text-smoke-800">
                    Threshold (vs golden): similarity ≥ {similarityPct(floor, true)}
                </p>
            )}
        </div>
    )
}
