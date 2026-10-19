// The daily custom-nodes gate: a matrix of shards x proof rows per run. Row "0" is the
// real gate (the suite on every shard, where a failed, skipped or flaky test fails the
// job). Rows 1, 2, 3, 9 and 15 are detection proofs: the suite runs with a planted break
// and the job passes only when exactly that break was caught, so a green proof says the
// suite can still detect a break, not that a pack works.
import { dateUtc } from '../../utils/time'
import type { CiConclusion, GateRun, GateStreak } from './types'

export const CLEAN_ROW = '0'

/** The seven clean shards in matrix order. */
export const CLEAN_SHARDS = ['core:1/2', 'core:2/2', '1/5', '2/5', '3/5', '4/5', '5/5']

/** The proof rows in matrix order; each runs on one shard per scheduled run. */
export const PROOF_ROWS = ['1', '2', '3', '9', '15']

export interface GateCell {
    row: string
    shard: string
    /** Conclusion; null while running, undefined when the job is absent from the run. */
    c: CiConclusion | null | undefined
    /** Name of the failed step, when the publisher recorded one. */
    step: string | null
}

const own = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key)

export function gateCell(run: GateRun, row: string, shard: string): GateCell {
    const cells = own(run.rows, row) ? run.rows[row] : undefined
    const c = cells && own(cells, shard) ? cells[shard] : undefined
    const step = (run.fs && own(run.fs, row) && own(run.fs[row], shard) ? run.fs[row][shard] : null) ?? null
    return { row, shard, c, step }
}

/** Clean shards in gate order, then any other shard seen in row 0 of a loaded run. */
export function cleanShards(runs: GateRun[]): string[] {
    const seen = new Set<string>()
    for (const r of runs) for (const s of Object.keys(r.rows[CLEAN_ROW] ?? {})) seen.add(s)
    const extra = Array.from(seen)
        .filter((s) => !CLEAN_SHARDS.includes(s))
        .sort()
    return [...CLEAN_SHARDS, ...extra]
}

/** Proof rows in gate order, then any other non-zero row seen in a loaded run. */
export function proofRows(runs: GateRun[]): string[] {
    const seen = new Set<string>()
    for (const r of runs) for (const row of Object.keys(r.rows)) if (row !== CLEAN_ROW) seen.add(row)
    const extra = Array.from(seen)
        .filter((row) => !PROOF_ROWS.includes(row))
        .sort((a, b) => Number(a) - Number(b))
    return [...PROOF_ROWS, ...extra]
}

/** The proof jobs of one row in a run (normally one shard); empty on a dispatch run. */
export const proofCells = (run: GateRun, row: string): GateCell[] =>
    Object.keys(own(run.rows, row) ? run.rows[row] : {}).map((shard) => gateCell(run, row, shard))

/** A conclusion that fails a clean shard outright. */
export const isRed = (c: CiConclusion | null | undefined) =>
    c === 'failure' || c === 'timed_out' || c === 'startup_failure'

export function cleanCounts(run: GateRun) {
    const cs = Object.values(run.rows[CLEAN_ROW] ?? {})
    return {
        pass: cs.filter((c) => c === 'success').length,
        fail: cs.filter((c) => c != null && c !== 'success').length,
        pending: cs.filter((c) => c == null).length,
        total: cs.length,
    }
}

/** Proof jobs across every proof row: held means the planted break was caught. */
export function proofCounts(run: GateRun) {
    let held = 0
    let total = 0
    for (const row of Object.keys(run.rows)) {
        if (row === CLEAN_ROW) continue
        for (const c of Object.values(run.rows[row])) {
            total += 1
            if (c === 'success') held += 1
        }
    }
    return { held, total }
}

/** "failing since 10 Sep 2026 (39+ days)"; a capped streak reaches the stored window, so it may be longer. */
export function streakPhrase(streak: GateStreak): string {
    const plural = streak.days === 1 && !streak.capped ? 'day' : 'days'
    const days = `${streak.days}${streak.capped ? '+' : ''} ${plural}`
    const verb = streak.state === 'fail' ? 'failing' : 'passing'
    return `${verb} since ${dateUtc(streak.since)} (${days})`
}

/** "Clean shards failing since 10 Sep 2026 (39+ days)". */
export const streakSentence = (streak: GateStreak | null | undefined): string =>
    streak ? `Clean shards ${streakPhrase(streak)}` : 'No scheduled runs recorded yet'
