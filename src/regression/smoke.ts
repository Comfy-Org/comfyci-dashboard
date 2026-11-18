// How a published smoke result is read. A smoke-level workflow is not compared with a
// golden: the worker checks that it finished and that each output file is usable, and
// publishes what it found. Published JSON is not shape-checked, so everything here takes
// what has the expected type and leaves the rest out. File names, problem sentences and
// notes come from the worker's run: they are plain strings to show as text, nothing more.
import type { SmokeFile, SmokeProblem, SmokeResult } from './types'

const isRecord = (v: unknown): v is Record<string, unknown> =>
    v != null && typeof v === 'object' && !Array.isArray(v)

const listOf = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** The files, problems and notes of a smoke result; empty lists for one that has none. */
export function readSmoke(smoke: unknown): SmokeResult {
    const s = isRecord(smoke) ? smoke : {}
    return {
        files: listOf(s.files).filter(
            (f): f is SmokeFile => isRecord(f) && typeof f.name === 'string'
        ),
        problems: listOf(s.problems).filter(
            (p): p is SmokeProblem => isRecord(p) && typeof p.text === 'string'
        ),
        notes: listOf(s.notes).filter((n): n is string => typeof n === 'string'),
    }
}

/** The file a problem is about, or null for a problem with no file (one that is missing). */
export const problemFile = (p: SmokeProblem): string | null =>
    typeof p.file === 'string' && p.file !== '' ? p.file : null

/** A problem as one sentence: "<file>: <what is wrong>", or the sentence alone. */
export function problemText(p: SmokeProblem): string {
    const file = problemFile(p)
    return file == null ? p.text : `${file}: ${p.text}`
}

/**
 * The names of the files that are not on the results branch: the worker did not send
 * them, or the run kept them in its artifact (a large output that does not repeat).
 * There is nothing to show or link for such a file.
 */
export const heldBack = (smoke: SmokeResult): Set<string> =>
    new Set(smoke.files.filter((f) => f.sent === false || f.published === false).map((f) => f.name))

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

// A number as written, without the zeros a fixed format would add: 2 for 2.0, 1.3743.
const plain = (n: number) => String(Number(n.toFixed(4)))

/**
 * What the check of one file measured, as the cell of a table: "256x256 px · brightness
 * spread 49.23 · 0.7% of the pixels have one brightness". A file of an extension that is
 * not checked says so, and a file the worker did not send was checked by its size only.
 * Only numbers are formatted: a fact of another type is left out.
 */
export function smokeFacts(f: SmokeFile): string {
    const sent = f.sent !== false
    if (typeof f.type !== 'string') return sent ? 'not checked' : 'not sent, not checked'
    if (!sent) return 'not sent, checked by size only'
    const facts: string[] = []
    if (isNumber(f.width) && isNumber(f.height)) facts.push(`${f.width}x${f.height} px`)
    if (isNumber(f.std)) facts.push(`brightness spread ${f.std.toFixed(2)}`)
    if (isNumber(f.flat_share)) {
        facts.push(`${(f.flat_share * 100).toFixed(1)}% of the pixels have one brightness`)
    }
    if (isNumber(f.chars)) facts.push(plural(f.chars, 'non-blank character'))
    if (isNumber(f.words)) facts.push(plural(f.words, 'word'))
    if (isNumber(f.frames)) facts.push(plural(f.frames, 'frame'))
    if (isNumber(f.seconds)) facts.push(`${f.seconds.toFixed(1)} s`)
    if (isNumber(f.sample_rate)) facts.push(`${f.sample_rate} Hz`)
    if (isNumber(f.channels)) facts.push(plural(f.channels, 'channel'))
    if (isNumber(f.bits)) facts.push(`${f.bits} bit`)
    if (isNumber(f.bytes_per_second)) facts.push(`${f.bytes_per_second} bytes/s`)
    if (isNumber(f.bytes_per_frame_mp)) {
        facts.push(`${f.bytes_per_frame_mp} bytes per frame and megapixel`)
    }
    if (isNumber(f.vertices)) facts.push(plural(f.vertices, 'vertex', 'vertices'))
    if (isNumber(f.faces)) facts.push(plural(f.faces, 'face'))
    if (Array.isArray(f.extent) && f.extent.length > 0 && f.extent.every(isNumber)) {
        facts.push(`bounding box ${f.extent.map(plain).join(' x ')}`)
    }
    return facts.join(' · ') || 'nothing measured'
}
