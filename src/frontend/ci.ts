// Helpers for the CI-on-main table: merging shards into the head, the visible column
// set and its groups, and the wording for overall states.
import type { CiColumn, CiEntry, CiGroup, CiOverall } from './types'

export const GROUP_ORDER: CiGroup[] = ['core', 'website', 'billing', 'validation', 'other']

export const GROUP_LABEL: Record<CiGroup, string> = {
    core: 'Core',
    website: 'Website',
    billing: 'Billing',
    validation: 'Validation',
    other: 'Other',
}

const groupOf = (group: string): CiGroup => (GROUP_ORDER as string[]).includes(group) ? (group as CiGroup) : 'other'

/** Head entries plus loaded monthly shards, one per commit, newest first. */
export function mergeCiEntries(head: CiEntry[], shards: CiEntry[]): CiEntry[] {
    const seen = new Set<string>()
    const merged: CiEntry[] = []
    for (const e of [...head, ...shards]) {
        if (seen.has(e.c)) continue
        seen.add(e.c)
        merged.push(e)
    }
    return merged.sort((a, b) => b.ct - a.ct)
}

/**
 * Columns to show: registry columns that at least one loaded commit has a cell for, in
 * group order (core, website, billing, validation, other) and registry order within a
 * group, then any id seen in a commit but missing from the registry under "other". A
 * workflow that stops running keeps its column while a loaded commit still has it.
 */
export function visibleColumns(registry: CiColumn[], entries: CiEntry[]): CiColumn[] {
    const seen = new Set<string>()
    for (const e of entries) for (const id of Object.keys(e.w)) seen.add(id)
    const known = registry.filter((c) => seen.has(c.id)).map((c) => ({ ...c, group: groupOf(c.group) }))
    const knownIds = new Set(registry.map((c) => c.id))
    const extra: CiColumn[] = Array.from(seen)
        .filter((id) => !knownIds.has(id))
        .sort()
        .map((id) => ({ id, label: id, paths: [], name: id, group: 'other' }))
    const all = [...known, ...extra]
    return GROUP_ORDER.flatMap((g) => all.filter((c) => c.group === g))
}

export interface ColumnGroup {
    group: CiGroup
    columns: CiColumn[]
}

/** Consecutive runs of the same group, for the grouped header row. */
export function columnGroups(columns: CiColumn[]): ColumnGroup[] {
    const groups: ColumnGroup[] = []
    for (const col of columns) {
        const last = groups[groups.length - 1]
        if (last && last.group === col.group) last.columns.push(col)
        else groups.push({ group: col.group, columns: [col] })
    }
    return groups
}

/** Badge text, StatusButton colour and hover text per overall state. */
export const OVERALL_META: Record<CiOverall, { text: string; status: string; title: string }> = {
    success: { text: 'Success', status: 'green', title: 'Every core workflow passed' },
    failure: { text: 'Failure', status: 'red', title: 'A core workflow failed, timed out or failed to start' },
    pending: { text: 'In progress', status: 'orange', title: 'A core workflow has not completed yet' },
    cancelled: { text: 'Cancelled', status: 'default', title: 'A core workflow was cancelled and none failed' },
}

export const overallMeta = (o: string) =>
    OVERALL_META[o as CiOverall] ?? { text: o, status: 'default', title: o }
