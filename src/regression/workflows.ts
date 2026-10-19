import type { IndexEntry, LaneInfo } from './types'

/** Ids may contain capitals: compare by locale so "Flux" sorts with "flux". */
export const compareWorkflowIds = (a: string, b: string) => a.localeCompare(b)

/**
 * Slot order for a lane, shared by every per-workflow surface on the history page.
 *
 * Blessed workflows come first, in the order lanes.json lists their goldens: the worker
 * merges into that file rather than rebuilding it, so the order is stable across index
 * builds and a newly blessed workflow takes the last slot instead of reshuffling the
 * others. Ids seen in runs but without a golden (no baseline yet, or retired) follow
 * alphabetically. Only ids present in at least one loaded run get a slot, so a golden
 * blessed ahead of its first run does not produce an all-missing column. Without
 * lanes.json (goldens undefined) the order is alphabetical.
 */
export function orderWorkflows(entries: IndexEntry[], goldens?: LaneInfo['goldens']): string[] {
    const seen = new Set<string>()
    for (const e of entries) for (const wf of Object.keys(e.w)) seen.add(wf)
    const blessed = Object.keys(goldens ?? {}).filter((wf) => seen.has(wf))
    const placed = new Set(blessed)
    const rest = Array.from(seen)
        .filter((wf) => !placed.has(wf))
        .sort(compareWorkflowIds)
    return [...blessed, ...rest]
}

/** Position of a workflow in the lane order, for sorting things that are keyed by id. */
export function slotOf(workflows: string[], wf: string): number {
    const i = workflows.indexOf(wf)
    return i === -1 ? Number.MAX_SAFE_INTEGER : i
}
