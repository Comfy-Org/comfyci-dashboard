// Custom-node packs on the GPU regression. The core regression's pack workflows install
// a few packs (Impact-Pack, KJNodes, Manager, VideoHelperSuite, ...) at the commits the
// frontend's custom-node gate pins, and the worker records how each pack imported in the
// workflow's index cell (`cn`). Nothing here is hardcoded: a pack workflow is any
// workflow whose cell in a lane's newest run carries `cn`, and a pack lane is any lane
// in lanes.json whose newest run has one.
import type {
    IndexEntry,
    IndexHead,
    IndexWorkflowCell,
    LaneInfo,
    LanesIndex,
    PackImportStatus,
    RegressionVerdict,
} from '../regression/types'
import { isCommitSha } from '../regression/validate'

/** The worker's pack registry: one fixed public file, never a URL built from data. */
export const PACK_REGISTRY_URL =
    'https://raw.githubusercontent.com/Comfy-Org/comfyci-runpod-worker/main/manifest/custom_nodes.json'

// ── The registry: manifest/custom_nodes.json ──

export interface PackRegistryEntry {
    /** "https://github.com/<owner>/<repo>". */
    repo: string
    /** The 40-hex commit the pack is installed at. */
    sha: string
    /** Human name and version, e.g. "KJNodes 1.4.7". */
    label: string
    kind: 'git' | 'pip'
}

export interface PackRegistry {
    schema_version?: number
    packs: Record<string, PackRegistryEntry>
}

/** What the page shows for a pack's pin; null when the registry does not know the pack. */
export interface PackPin {
    label: string | null
    /** Link to the pinned commit on GitHub, only when repo and sha both pass validation. */
    href: string | null
    sha: string | null
}

// Owner and repo: one path segment each, plain characters, neither starting with a dot.
const PACK_REPO = /^https:\/\/github\.com\/[A-Za-z0-9_-][A-Za-z0-9_.-]*\/[A-Za-z0-9_-][A-Za-z0-9_.-]*$/

export const isPackRepo = (value: unknown): value is string => typeof value === 'string' && PACK_REPO.test(value)

const own = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key)

/** Link to a pack's pinned commit, or null when the registry entry fails validation. */
export const packPinUrl = (entry: Partial<PackRegistryEntry> | null | undefined): string | null =>
    entry && isPackRepo(entry.repo) && isCommitSha(entry.sha) ? `${entry.repo}/commit/${entry.sha}` : null

/** The registry's pin for a pack name: label as published, link only after validation. */
export function packPin(registry: PackRegistry | null | undefined, name: string): PackPin | null {
    const packs = registry?.packs
    if (!packs || typeof packs !== 'object' || !own(packs, name)) return null
    const entry = packs[name]
    if (!entry || typeof entry !== 'object') return null
    return {
        label: typeof entry.label === 'string' && entry.label ? entry.label : null,
        href: packPinUrl(entry),
        sha: isCommitSha(entry.sha) ? entry.sha : null,
    }
}

// ── Pack workflows in a lane index ──

export const PACK_STATUSES: PackImportStatus[] = ['ok', 'failed', 'missing']

export const isPackStatus = (value: unknown): value is PackImportStatus =>
    typeof value === 'string' && (PACK_STATUSES as string[]).includes(value)

/** One pack a workflow installs and how its import went in that run. */
export interface PackRef {
    name: string
    status: PackImportStatus
}

export interface PackWorkflow {
    wf: string
    /** The workflow's cell in the lane's newest run. */
    cell: IndexWorkflowCell
    /** The packs it installs, in the order the worker wrote them. */
    packs: PackRef[]
}

/** A lane whose newest run has at least one pack workflow. */
export interface PackLane {
    id: string
    branch: string
    info: LaneInfo
    head: IndexHead
    newest: IndexEntry
    workflows: PackWorkflow[]
}

/** The packs of one cell in key order; empty for a cell without `cn`. A status the page does not know reads as missing. */
export function cellPacks(cell: IndexWorkflowCell): PackRef[] {
    const cn = cell.cn
    if (!cn || typeof cn !== 'object') return []
    return Object.keys(cn).map((name) => ({ name, status: isPackStatus(cn[name]) ? cn[name] : 'missing' }))
}

/** The pack workflows of a run: every cell that carries `cn`, in the entry's key order. */
export function packWorkflowsOf(entry: IndexEntry | null | undefined): PackWorkflow[] {
    if (!entry) return []
    return Object.keys(entry.w).flatMap((wf) => {
        const cell = entry.w[wf]
        const packs = cellPacks(cell)
        return packs.length ? [{ wf, cell, packs }] : []
    })
}

/** The newest run of an index head, or null when it has none. */
export const latestRun = (head: IndexHead | null | undefined): IndexEntry | null => head?.entries[0] ?? null

export const DEFAULT_BRANCH = 'master'

/** The branch a lane's index is read on: master when the lane lists it, else its first listed branch. */
export function laneBranch(info: LaneInfo): string {
    const listed = Object.keys(info.branches ?? {})
    return listed.includes(DEFAULT_BRANCH) ? DEFAULT_BRANCH : listed[0] ?? DEFAULT_BRANCH
}

export interface LaneRef {
    id: string
    branch: string
    info: LaneInfo
}

/** Every lane lanes.json lists, in listing order, with the branch to read its index on. */
export function laneRefs(lanes: LanesIndex | null | undefined): LaneRef[] {
    if (!lanes || !lanes.lanes || typeof lanes.lanes !== 'object') return []
    return Object.keys(lanes.lanes).map((id) => ({ id, branch: laneBranch(lanes.lanes[id]), info: lanes.lanes[id] }))
}

/** The lane as a pack lane when its newest run has pack workflows, else null. */
export function packLane(ref: LaneRef, head: IndexHead | null | undefined): PackLane | null {
    if (!head) return null
    const newest = latestRun(head)
    const workflows = packWorkflowsOf(newest)
    if (!newest || workflows.length === 0) return null
    return { id: ref.id, branch: ref.branch, info: ref.info, head, newest, workflows }
}

// ── Rollups ──

/** Packs ok, failed and missing across the pack workflows (one count per pack mention). */
export function packStatusCounts(workflows: PackWorkflow[]): Record<PackImportStatus, number> {
    const counts: Record<PackImportStatus, number> = { ok: 0, failed: 0, missing: 0 }
    for (const w of workflows) for (const p of w.packs) counts[p.status] += 1
    return counts
}

export type PackTone = 'red' | 'amber' | 'green'

/** A workflow's display verdict: the worker's, or the client's accepted drift. */
export interface PackVerdict {
    verdict: RegressionVerdict | 'accepted'
}

/**
 * Headline tone of a set of pack workflows, shared by the KPI card and the section's
 * status line so the two never disagree about one run: red when a workflow regressed or
 * failed to run, or a pack failed to import or went missing; green when every workflow
 * passes; amber otherwise (infra error, no baseline, accepted drift). `states` holds the
 * display state of each workflow in `workflows`.
 */
export function packTone(states: PackVerdict[], workflows: PackWorkflow[]): PackTone {
    const counts = packStatusCounts(workflows)
    const failing = states.some((s) => s.verdict === 'fail' || s.verdict === 'execution_error')
    if (failing || counts.failed > 0 || counts.missing > 0) return 'red'
    return states.every((s) => s.verdict === 'pass') ? 'green' : 'amber'
}

/** Distinct pack names across the workflows, in first-seen order. */
export function packNames(workflows: PackWorkflow[]): string[] {
    const names: string[] = []
    for (const w of workflows) for (const p of w.packs) if (!names.includes(p.name)) names.push(p.name)
    return names
}

/** The newest run among the pack lanes, for the headline. */
export function newestPackRun(lanes: PackLane[]): { lane: PackLane; entry: IndexEntry } | null {
    let best: { lane: PackLane; entry: IndexEntry } | null = null
    for (const lane of lanes) if (!best || lane.newest.t > best.entry.t) best = { lane, entry: lane.newest }
    return best
}

// ── Captions ──

const CADENCE_TEXT: Record<string, string> = {
    'per-commit': 'every core commit',
    nightly: 'nightly',
    weekly: 'weekly',
}

/** "<lane label> · every core commit · <GPU>", the GPU only when the label does not already name it. */
export function laneCaption(info: LaneInfo): string {
    const parts = [info.label, CADENCE_TEXT[info.cadence] ?? 'every core commit']
    if (info.gpu && !info.label.includes(info.gpu)) parts.push(info.gpu)
    return parts.join(' · ')
}

/** The Regression tab on this lane. */
export const lanePageHref = (laneId: string) => `/regression?lane=${encodeURIComponent(laneId)}`
