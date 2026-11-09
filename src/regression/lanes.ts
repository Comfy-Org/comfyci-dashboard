// How the pages present the lanes lanes.json lists: their order, their standing (primary,
// active, retired) and a one-line caption. Shared by the lane pills on All Results, the
// Waterfall's columns and the commit page's lane switcher, so all three agree.
import type { LaneInfo, LaneLatest, LanesIndex } from './types'

const own = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key)

/** A lane that no longer runs (cadence "retired"): its history stays published and readable. */
export const isRetiredLane = (info: LaneInfo | null | undefined): boolean => info?.cadence === 'retired'

/** Retired, or kept under role "legacy": listed after every active lane. */
const isLegacyLane = (info: LaneInfo | null | undefined): boolean =>
    isRetiredLane(info) || info?.role === 'legacy'

/** Where a lane sits: the primary, an active lane, or a retired or legacy lane kept for its history. */
export type LaneStanding = 'primary' | 'active' | 'legacy'

export function laneStanding(lanes: LanesIndex, id: string): LaneStanding {
    if (id === lanes.primary) return 'primary'
    return own(lanes.lanes, id) && isLegacyLane(lanes.lanes[id]) ? 'legacy' : 'active'
}

const RANK: Record<LaneStanding, number> = { primary: 0, active: 1, legacy: 2 }

/**
 * Lane ids in display order: the primary first, then the other active lanes in the order
 * lanes.json lists them, then retired and legacy lanes (also in listing order).
 */
export function orderedLaneIds(lanes: LanesIndex | null | undefined): string[] {
    if (!lanes || !lanes.lanes || typeof lanes.lanes !== 'object') return []
    // Array sort is stable, so lanes of the same standing keep their lanes.json order.
    return Object.keys(lanes.lanes).sort((a, b) => RANK[laneStanding(lanes, a)] - RANK[laneStanding(lanes, b)])
}

/** The quiet tag beside a lane's label: "primary", "retired" or "legacy"; null for an ordinary lane. */
export function laneTag(lanes: LanesIndex, id: string): 'primary' | 'retired' | 'legacy' | null {
    const standing = laneStanding(lanes, id)
    if (standing === 'primary') return 'primary'
    if (standing === 'active') return null
    return isRetiredLane(lanes.lanes[id]) ? 'retired' : 'legacy'
}

/** How the lane runs, in one line: "per-commit · blocking", or "retired · history only". */
export function laneRunsCaption(info: LaneInfo): string {
    if (isRetiredLane(info)) return 'retired · history only'
    return `${info.cadence} · ${info.blocking ? 'blocking' : 'informational'}`
}

/** The lane's latest run on a branch as lanes.json records it; null when it never ran there. */
export function laneLatest(info: LaneInfo | null | undefined, branch: string): LaneLatest | null {
    const branches = info?.branches
    if (!branches || typeof branches !== 'object' || !own(branches, branch)) return null
    return branches[branch]?.latest ?? null
}
