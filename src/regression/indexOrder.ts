// The order the worker publishes a lane's run index in, and how much of it the head holds.
// Heads and monthly shards list entries newest first by commit time (run time when the
// commit time is unknown), ties by sha, so re-testing an older commit never moves it in
// the history. A head keeps only the newest entries of that order while `count` stays the
// lane's total, so a commit missing from a long lane's head may still have run.
import type { IndexEntry, IndexHead } from './types'
import { monthKey } from '../../utils/time'

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
