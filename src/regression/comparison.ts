// How a published comparison is read. A comparison without `kind` is an image comparison:
// that is every run published before text workflows, and it keeps the code path it had.
import type { ComparisonMetrics, TextFirstDiff, TextThresholds, Thresholds } from './types'

export type ComparisonKind = 'image' | 'text' | 'other'

const hasImageMetrics = (m: ComparisonMetrics) =>
    m.mean_mse != null || m.mean_psnr_db != null || m.mean_pct_pixels_changed != null

/**
 * 'text' for a text comparison; 'image' for one with no kind, or with image metrics under
 * any kind; 'other' for a kind this dashboard does not know that carries no image metrics.
 */
export function comparisonKind(m: ComparisonMetrics | null | undefined): ComparisonKind {
    if (m == null || m.kind == null || m.kind === 'image') return 'image'
    if (m.kind === 'text') return 'text'
    return hasImageMetrics(m) ? 'image' : 'other'
}

// Published JSON is not shape-checked, and `in` throws on a number or a string: both
// readers below look for a key only in an object.
type AnyThresholds = Thresholds | TextThresholds | null | undefined

/** The limits of an image comparison. A text workflow's limit is never read as one. */
export const imageThresholds = (t: AnyThresholds): Thresholds | null =>
    t != null && typeof t === 'object' && 'max_mean_mse' in t ? t : null

/** The similarity a text has to reach to pass; null when it has to match exactly. */
export const minTextSimilarity = (t: AnyThresholds): number | null =>
    t != null && typeof t === 'object' && 'min_text_similarity' in t && typeof t.min_text_similarity === 'number'
        ? t.min_text_similarity
        : null

/** A 0 to 1 similarity as a percentage. A text that differs never reads as 100.0%. */
export function similarityPct(similarity: number, identical: boolean): string {
    const pct = (similarity * 100).toFixed(1)
    return !identical && pct === '100.0' ? '>99.9%' : `${pct}%`
}

/** "line 3, col 14": where two texts first differ, as far as it was published. */
export function firstDiffAt(d: TextFirstDiff | null | undefined): string | null {
    if (d?.line == null) return null
    return d.col == null ? `line ${d.line}` : `line ${d.line}, col ${d.col}`
}

/** True when both file counts are published and they are not the same. */
export const fileCountsDiffer = (m: ComparisonMetrics) =>
    m.file_count_ref != null && m.file_count_cand != null && m.file_count_ref !== m.file_count_cand
