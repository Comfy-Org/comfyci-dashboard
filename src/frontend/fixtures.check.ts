// Compile-time check that the checked-in fixtures still have the shape types.ts declares.
// public/fixtures/frontend/** is the publisher's own dry-run output (README, "Frontend
// tab"), so a key the publisher renames or drops fails `tsc --noEmit` and `next build`
// here instead of crashing the tab on its first live load. Nothing imports this module;
// it exists only to be type-checked. A JSON import widens every literal to its primitive,
// so the fixtures are compared against the types with their literal unions widened the
// same way: key presence, nullability and the primitive kind of every value are checked,
// the exact union members are not. Every value also admits `undefined`, which JSON cannot
// hold, because an array of objects with differing keys (cells per commit, rows per run)
// is normalized with the missing keys as optional `undefined` members.
import type { CiHead, CiShard, GateHead, PerfHead, PerfShard } from './types'
import ciMain from '../../public/fixtures/frontend/ci/main.json'
import ciShard from '../../public/fixtures/frontend/ci/main/2026-10.json'
import gate from '../../public/fixtures/frontend/ci/custom-nodes.json'
import perfHead from '../../public/fixtures/frontend/perf/head.json'
import perfShard from '../../public/fixtures/frontend/perf/2026-10.json'

/** T with every string, number and boolean literal widened and tuples read as arrays. */
type Wire<T> = T extends string
    ? string
    : T extends number
    ? number
    : T extends boolean
    ? boolean
    : T extends readonly (infer U)[]
    ? Wire<U>[]
    : T extends object
    ? { [K in keyof T]: Wire<T[K]> | undefined }
    : T

export const fixtures: {
    ciMain: Wire<CiHead>
    ciShard: Wire<CiShard>
    gate: Wire<GateHead>
    perfHead: Wire<PerfHead>
    perfShard: Wire<PerfShard>
} = { ciMain, ciShard, gate, perfHead, perfShard }
