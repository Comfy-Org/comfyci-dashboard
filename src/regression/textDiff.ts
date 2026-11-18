// Word-level diff of two texts, for the commit page of a text workflow. A word is a run of
// non-blank characters, as in the worker's similarity. Blanks are kept for display and
// never compared. No imports: this file also runs under plain node.

/** A run of one side's text. `changed` marks words the other side does not have. */
export interface DiffSegment {
    text: string
    changed: boolean
}

export interface WordDiff {
    /** The reference in order. Its changed runs are words the candidate lost. */
    ref: DiffSegment[]
    /** The candidate in order. Its changed runs are words the candidate gained. */
    cand: DiffSegment[]
    /**
     * Index of the segment that starts where the two sides first differ. Equal to the
     * number of segments when that side ends there, and -1 when no word differs.
     */
    refFirst: number
    candFirst: number
    /** Words only the reference has. */
    removed: number
    /** Words only the candidate has. */
    added: number
}

/**
 * Size cap. The words the two sides share at the start and at the end are set aside; the
 * rest is aligned with a table of (reference words + 1) by (candidate words + 1) cells.
 * 2,000,000 cells is about 1,400 by 1,400 changed words, a 4 MB table.
 */
export const MAX_DIFF_CELLS = 2_000_000

// A loop, not /[ \t]+$/: that pattern takes quadratic time on a long run of blanks inside a line.
function trimLineEnd(line: string): string {
    let end = line.length
    while (end > 0 && (line[end - 1] === ' ' || line[end - 1] === '\t')) end -= 1
    return line.slice(0, end)
}

/**
 * The text as the worker compares it: no byte order mark, "\n" line ends, no blanks at
 * line ends, no empty lines at the end.
 */
export function normaliseText(text: string): string {
    const lines = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n').map(trimLineEnd)
    while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
    return lines.join('\n')
}

interface Word {
    start: number
    end: number
}

function wordsOf(text: string): Word[] {
    const out: Word[] = []
    const re = /\S+/g
    for (let m = re.exec(text); m !== null; m = re.exec(text)) {
        out.push({ start: m.index, end: m.index + m[0].length })
    }
    return out
}

/** Cuts a text into runs of kept and changed words, with a cut forced before word `breakAt`. */
function segmentsOf(text: string, words: Word[], changed: boolean[], breakAt: number) {
    const segments: DiffSegment[] = []
    let first = -1
    const push = (piece: string, flag: boolean, fresh: boolean) => {
        if (piece === '') return
        const last = segments[segments.length - 1]
        if (last && last.changed === flag && !fresh) last.text += piece
        else segments.push({ text: piece, changed: flag })
    }
    push(text.slice(0, words.length ? words[0].start : text.length), false, false)
    words.forEach((w, i) => {
        if (i === breakAt) first = segments.length
        push(text.slice(w.start, w.end), changed[i], i === breakAt)
        // The blank between two changed words joins their run, so a rewritten phrase is
        // one mark and not one mark per word.
        const next = words[i + 1]
        push(text.slice(w.end, next ? next.start : text.length), !!next && changed[i] && changed[i + 1], false)
    })
    // A side with no word at `breakAt` has ended where the other one goes on.
    return { segments, first: breakAt >= words.length ? segments.length : first }
}

/**
 * Aligns two texts word by word (longest common subsequence). Returns null when the part
 * that differs is over `maxCells`: the caller then shows the two texts without marks.
 */
export function wordDiff(ref: string, cand: string, maxCells = MAX_DIFF_CELLS): WordDiff | null {
    const refWords = wordsOf(ref)
    const candWords = wordsOf(cand)
    const a = refWords.map((w) => ref.slice(w.start, w.end))
    const b = candWords.map((w) => cand.slice(w.start, w.end))

    const shortest = Math.min(a.length, b.length)
    let head = 0
    while (head < shortest && a[head] === b[head]) head += 1
    let tail = 0
    while (tail < shortest - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail += 1

    const n = a.length - head - tail
    const m = b.length - head - tail
    if ((n + 1) * (m + 1) > maxCells) return null

    const refChanged: boolean[] = new Array(a.length).fill(false)
    const candChanged: boolean[] = new Array(b.length).fill(false)
    // lcs[i * width + j] is the longest common subsequence of a[head + i ..] and b[head + j ..].
    const width = m + 1
    const lcs = Math.min(n, m) < 65536 ? new Uint16Array((n + 1) * width) : new Uint32Array((n + 1) * width)
    for (let i = n - 1; i >= 0; i -= 1) {
        for (let j = m - 1; j >= 0; j -= 1) {
            lcs[i * width + j] =
                a[head + i] === b[head + j]
                    ? lcs[(i + 1) * width + j + 1] + 1
                    : Math.max(lcs[(i + 1) * width + j], lcs[i * width + j + 1])
        }
    }
    let i = 0
    let j = 0
    while (i < n || j < m) {
        if (i < n && j < m && a[head + i] === b[head + j]) {
            i += 1
            j += 1
        } else if (j >= m || (i < n && lcs[(i + 1) * width + j] >= lcs[i * width + j + 1])) {
            refChanged[head + i] = true
            i += 1
        } else {
            candChanged[head + j] = true
            j += 1
        }
    }

    const removed = refChanged.filter(Boolean).length
    const added = candChanged.filter(Boolean).length
    // With no word changed there is no first difference, so no cut either.
    const breakAt = removed === 0 && added === 0 ? -1 : head
    const refSide = segmentsOf(ref, refWords, refChanged, breakAt)
    const candSide = segmentsOf(cand, candWords, candChanged, breakAt)
    return {
        ref: refSide.segments,
        cand: candSide.segments,
        refFirst: refSide.first,
        candFirst: candSide.first,
        removed,
        added,
    }
}
