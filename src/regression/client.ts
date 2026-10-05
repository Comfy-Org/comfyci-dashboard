// Read-only client for regression results. These are static JSON blobs (not
// api.comfy.org endpoints) fetched from public storage: currently the worker
// repo's `results` branch via raw.githubusercontent.com; set
// NEXT_PUBLIC_REGRESSION_BASE to the GCS URL once results move there
// (e.g. https://storage.googleapis.com/comfy-ci-results/regression).
import { useQueries, useQuery } from '@tanstack/react-query'
import type {
    ComparisonMetrics,
    GoldenCurrent,
    IndexHead,
    IndexShard,
    LaneInfo,
    LaneLayout,
    LanesIndex,
    LatestPointer,
    RegressionSummary,
    RunRecord,
} from './types'

export const REGRESSION_BASE =
    process.env.NEXT_PUBLIC_REGRESSION_BASE ||
    'https://raw.githubusercontent.com/Comfy-Org/comfyci-runpod-worker/results/regression'

export const COMFY_REPO = 'https://github.com/Comfy-Org/ComfyUI'

async function fetchJsonOrNull<T>(url: string): Promise<T | null> {
    const res = await fetch(url, { cache: 'no-store' })
    if (res.status === 404 || res.status === 403) return null
    if (!res.ok) throw new Error(`${res.status} fetching ${url}`)
    return (await res.json()) as T
}

// ── Lanes and path layout ──

/** The lane a page is looking at: its id plus which tree layout its files use. */
export interface LaneRef {
    id: string
    layout: LaneLayout
}

// Until index/lanes.json is published there is a single lane on the legacy layout-1 tree.
export const LEGACY_LANE_ID = 'py312-torch2.11.0-cu128'
export const LEGACY_LANE: LaneRef = { id: LEGACY_LANE_ID, layout: 1 }

/** Base URL of a lane's tree: layout 1 is the legacy root, layout 2 lives under lanes/<id>. */
export const laneBase = (lane?: LaneRef | null) =>
    !lane || lane.layout === 1 ? REGRESSION_BASE : `${REGRESSION_BASE}/lanes/${lane.id}`

/** Branch names are slugged ('/' becomes '__') in layout-2 paths only. */
export const branchSlug = (branch: string) => branch.replace(/\//g, '__')

const pathBranch = (branch: string | undefined, lane?: LaneRef | null) =>
    branch && lane && lane.layout === 2 ? branchSlug(branch) : branch

const runDir = (branch: string | undefined, commit: string | undefined, lane?: LaneRef | null) =>
    `${laneBase(lane)}/runs/${pathBranch(branch, lane)}/${commit}`

/** Pick the lane to show: ?lane= when listed, else the primary, else the first listed, else legacy. */
export function resolveLane(
    lanes: LanesIndex | null | undefined,
    requested?: string
): LaneRef & { info?: LaneInfo } {
    if (lanes) {
        const id =
            (requested && lanes.lanes[requested] ? requested : undefined) ??
            (lanes.lanes[lanes.primary] ? lanes.primary : Object.keys(lanes.lanes)[0])
        if (id) return { id, layout: lanes.lanes[id].layout, info: lanes.lanes[id] }
    }
    return { ...LEGACY_LANE, id: requested || LEGACY_LANE_ID }
}

// ── Hooks ──

// Every file may be absent while the worker catches up: data is `null` then, never an error.
const useStaticJson = <T>(key: string, url: string, enabled: boolean) =>
    useQuery({ queryKey: [key, url], queryFn: () => fetchJsonOrNull<T>(url), enabled })

export const useLanes = () =>
    useStaticJson<LanesIndex>('regression-lanes', `${REGRESSION_BASE}/index/lanes.json`, true)

export const useIndexHead = (branch?: string, lane?: string) =>
    useStaticJson<IndexHead>(
        'regression-index',
        `${REGRESSION_BASE}/index/${branch}/${lane}.json`,
        !!branch && !!lane
    )

const shardQuery = (branch: string, lane: string, month: string) => {
    const url = `${REGRESSION_BASE}/index/${branch}/${lane}/${month}.json`
    return { queryKey: ['regression-index-shard', url], queryFn: () => fetchJsonOrNull<IndexShard>(url) }
}

/** Several monthly shards at once; the History page appends a month per "Load older". */
export const useIndexShards = (branch: string, lane: string, months: string[]) =>
    useQueries({ queries: months.map((m) => shardQuery(branch, lane, m)) })

export const useLatestPointer = (branch?: string, lane?: LaneRef | null) =>
    useStaticJson<LatestPointer>(
        'regression-latest',
        `${laneBase(lane)}/latest/${pathBranch(branch, lane)}.json`,
        !!branch
    )

export const useRegressionSummary = (branch?: string, commit?: string, lane?: LaneRef | null) =>
    useStaticJson<RegressionSummary>(
        'regression-summary',
        `${runDir(branch, commit, lane)}/summary.json`,
        !!branch && !!commit
    )

export const useRunRecord = (
    branch?: string,
    commit?: string,
    workflowId?: string,
    lane?: LaneRef | null
) =>
    useStaticJson<RunRecord>(
        'regression-run',
        `${runDir(branch, commit, lane)}/${workflowId}/run.json`,
        !!branch && !!commit && !!workflowId
    )

export const useGoldenCurrent = (workflowId?: string, lane?: LaneRef | null) =>
    useStaticJson<GoldenCurrent>(
        'regression-golden',
        `${laneBase(lane)}/golden/${workflowId}/current.json`,
        !!workflowId
    )

/** The golden's own re-run noise floor; identical:true means a zero noise floor. */
export const useNoiseFloor = (workflowId?: string, tag?: string, lane?: LaneRef | null) =>
    useStaticJson<ComparisonMetrics>(
        'regression-noise-floor',
        `${laneBase(lane)}/golden/${workflowId}/${tag}/noise_floor.json`,
        !!workflowId && !!tag
    )

export const outputUrl = (
    branch: string,
    commit: string,
    workflowId: string,
    filename: string,
    lane?: LaneRef | null
) => `${runDir(branch, commit, lane)}/${workflowId}/outputs/${filename}`

export const figureUrl = (
    branch: string,
    commit: string,
    workflowId: string,
    figure: string,
    lane?: LaneRef | null
) => `${runDir(branch, commit, lane)}/${workflowId}/figures/${figure}`
