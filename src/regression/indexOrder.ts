// The order the worker publishes a lane's run index in, and how much of it the head holds.
// Heads and monthly shards list entries newest first by commit time (run time when the
// commit time is unknown), ties by sha, so re-testing an older commit never moves it in
// the history. A head keeps only the newest entries of that order while `count` stays the
// lane's total, so a commit missing from a long lane's head may still have run.
import type { IndexEntry, IndexHead, IndexWorkflowCell } from './types'
import { monthKey } from '../../utils/time'

/**
 * The lane's latest run among entries in index order. A run that named its workflows
 * (`named`) is a re-test or a first look, not the lane's run of its commit: the latest run
 * is the newest without the mark, as the worker's `latest` is.
 */
export const latestFullRun = (entries: IndexEntry[]): IndexEntry | undefined =>
    entries.find((e) => e.named !== true)

/**
 * Where a workflow stands now: its cell in the lane's latest run, or in a run of named
 * workflows after it, whichever is newer. On a lane without a full run it is the
 * workflow's newest cell.
 */
export function currentCell(entries: IndexEntry[], wf: string): IndexWorkflowCell | undefined {
    for (const e of entries) {
        if (e.w[wf]) return e.w[wf]
        if (e.named !== true) return undefined
    }
    return undefined
}

// A run of named workflows that could not test a workflow says nothing about it.
const saysNothing = (e: IndexEntry, wf: string): boolean => e.named === true && e.w[wf]?.v === 'infra_error'

/**
 * Where a workflow stands for the count of open failures: currentCell, read past the runs
 * of named workflows that could not test it. Such a result closes no failing chain, so it
 * must not take the workflow out of the count either. The latest full run still counts as
 * it reads, tested or not.
 */
export function standingCell(entries: IndexEntry[], wf: string): IndexWorkflowCell | undefined {
    for (const e of entries) {
        if (e.w[wf] && !saysNothing(e, wf)) return e.w[wf]
        if (e.named !== true) return undefined
    }
    return undefined
}

/** A workflow's newest result that says something: the fallback when its chain is open. */
export const newestTelling = (entries: IndexEntry[], wf: string): IndexWorkflowCell | undefined =>
    entries.find((e) => e.w[wf] && !saysNothing(e, wf))?.w[wf]

/** The worker's sort time for an entry: commit time when known, else run time. */
export const entryTime = (e: IndexEntry): number => e.m?.ct || e.t

/** Newest first by sort time, then by sha descending: index_builder's sort_key, reversed. */
export function byIndexOrder(a: IndexEntry, b: IndexEntry): number {
    return entryTime(b) - entryTime(a) || (a.c < b.c ? 1 : a.c > b.c ? -1 : 0)
}

/**
 * Head entries plus any loaded monthly shards, one per commit, in index order. The worker
 * keeps a single entry per commit per lane and moves its run time forward on a re-test, so
 * when a cached head and a fresh shard disagree about a commit, the later run wins.
 */
export function mergeIndexEntries(head: IndexEntry[], shards: IndexEntry[]): IndexEntry[] {
    const byCommit = new Map<string, IndexEntry>()
    for (const e of [...head, ...shards]) {
        const kept = byCommit.get(e.c)
        if (!kept || e.t > kept.t) byCommit.set(e.c, e)
    }
    return [...byCommit.values()].sort(byIndexOrder)
}

/**
 * Where a head that lists fewer runs than the lane has stops: the sort time of its oldest
 * entry. A commit at or before it that the head leaves out may still have run on the lane;
 * only the monthly shards can say. Null when the head lists every run.
 */
export function headWindowStart(head: IndexHead | null | undefined): number | null {
    if (!head || head.entries.length === 0 || head.count <= head.entries.length) return null
    return Math.min(...head.entries.map(entryTime))
}

/**
 * Whether a commit at `ts` that `head` does not list may still have run on the lane: the
 * head stops short of the lane's history, the commit is no newer than where it stops, and
 * the lane has runs in the commit's month. An unknown time may have run. `start` is
 * headWindowStart(head), for callers that already have it.
 */
export function headMayOmit(
    head: IndexHead | null | undefined,
    ts: number | null | undefined,
    start: number | null = headWindowStart(head)
): boolean {
    if (!head || start == null) return false
    if (ts == null) return true
    return ts <= start && head.shards.includes(monthKey(ts))
}

/**
 * The monthly shards that hold a commit at `ts` and its neighbours on the lane: its own
 * month when the lane has runs in it, and the nearest newer and older months that do.
 */
export function shardsAround(head: IndexHead, ts: number): string[] {
    const month = monthKey(ts)
    const months = [...head.shards].sort()
    const newer = months.find((m) => m > month)
    const older = [...months].reverse().find((m) => m < month)
    return [newer, months.includes(month) ? month : undefined, older].filter((m): m is string => !!m)
}
