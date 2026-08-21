import type { ComparisonMetrics, Thresholds } from '../src/regression/types'

interface MetricTableProps {
    vsGolden: ComparisonMetrics | null
    vsPrevious: ComparisonMetrics | null
    thresholds: Thresholds | null
}

const fmt = (v: number | null | undefined, digits = 2) =>
    v === null || v === undefined ? '—' : v.toFixed(digits)

function MetricRow({
    label,
    metrics,
    thresholds,
}: {
    label: string
    metrics: ComparisonMetrics
    thresholds: Thresholds | null
}) {
    if (metrics.error) {
        return (
            <tr className="border-t border-smoke-200 dark:border-charcoal-400/40">
                <td className="px-4 py-2 font-medium">{label}</td>
                <td colSpan={5} className="px-4 py-2 text-red-400">
                    {metrics.error}
                </td>
            </tr>
        )
    }
    if (metrics.identical) {
        return (
            <tr className="border-t border-smoke-200 dark:border-charcoal-400/40">
                <td className="px-4 py-2 font-medium">{label}</td>
                <td colSpan={5} className="px-4 py-2 text-emerald-400 font-medium">
                    Outputs are bit-identical
                </td>
            </tr>
        )
    }
    const mseBad = thresholds != null && (metrics.mean_mse ?? 0) > thresholds.max_mean_mse
    const psnrBad =
        thresholds != null &&
        metrics.mean_psnr_db != null &&
        metrics.mean_psnr_db < thresholds.min_mean_psnr_db
    const pctBad =
        thresholds != null &&
        (metrics.mean_pct_pixels_changed ?? 0) > thresholds.max_pct_pixels_changed
    const bad = 'font-semibold text-red-400'
    return (
        <tr className="border-t border-smoke-200 dark:border-charcoal-400/40">
            <td className="px-4 py-2 font-medium">{label}</td>
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
        </tr>
    )
}

export const MetricTable: React.FC<MetricTableProps> = ({ vsGolden, vsPrevious, thresholds }) => {
    if (!vsGolden && !vsPrevious) return null
    return (
        <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-ash-500 dark:text-smoke-800">
                        <th className="px-4 py-2 font-semibold">Baseline</th>
                        <th className="px-4 py-2 font-semibold">Mean MSE</th>
                        <th className="px-4 py-2 font-semibold">PSNR (dB)</th>
                        <th className="px-4 py-2 font-semibold">% Pixels Changed</th>
                        <th className="px-4 py-2 font-semibold">Max Abs Diff</th>
                        <th className="px-4 py-2 font-semibold">Frames</th>
                    </tr>
                </thead>
                <tbody>
                    {vsGolden && (
                        <MetricRow label="vs Golden" metrics={vsGolden} thresholds={thresholds} />
                    )}
                    {vsPrevious && (
                        <MetricRow label="vs Previous" metrics={vsPrevious} thresholds={null} />
                    )}
                </tbody>
            </table>
            {thresholds && (
                <p className="px-4 pb-2 pt-1 text-[11px] text-ash-500 dark:text-smoke-800">
                    Thresholds (vs golden): MSE ≤ {thresholds.max_mean_mse} · PSNR ≥{' '}
                    {thresholds.min_mean_psnr_db} dB · pixels changed ≤{' '}
                    {thresholds.max_pct_pixels_changed}%
                </p>
            )}
        </div>
    )
}
