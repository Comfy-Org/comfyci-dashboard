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
import { isBranchName, isCommitSha, isLaneId, isPathSegment, isWorkflowId } from './validate'

export const REGRESSION_BASE =
    process.env.NEXT_PUBLIC_REGRESSION_BASE ||
    'https://raw.githubusercontent.com/Comfy-Org/comfyci-runpod-worker/results/regression'

export const COMFY_REPO = 'https://github.com/Comfy-Org/ComfyUI'

// ── Path validation ──
// Route params and published JSON both feed result paths. Each segment is checked
// against its own shape below, and the whole path once more before it is joined to the
// base, so nothing can add '..', a query string, a fragment or another host to a request.

const RESULT_PATH = /^[A-Za-z0-9_-][A-Za-z0-9._-]*(?:\/[A-Za-z0-9_-][A-Za-z0-9._-]*)*$/

/** Absolute URL of a file under the results base; throws for a path of anything but plain segments. */
function resultUrl(path: string): string {
    if (!RESULT_PATH.test(path)) throw new Error('Refusing to fetch an invalid results path')
    return `${REGRESSION_BASE}/${path}`
}

/** Hands back `value` when it passes `ok`, else throws so no URL is built from it. */
function checked(kind: string, value: string | null | undefined, ok: (v: string) => boolean): string {
    if (value == null || !ok(value)) throw new Error(`Refusing to fetch results for an invalid ${kind}`)
    return value
}

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

/** Path of a file in a lane's tree: layout 1 is the legacy root, layout 2 lives under lanes/<id>. */
const lanePath = (lane: LaneRef | null | undefined, rest: string) =>
    !lane || lane.layout === 1 ? rest : `lanes/${checked('lane', lane.id, isLaneId)}/${rest}`

/** Branch names are slugged ('/' becomes '__') in layout-2 paths only. */
export const branchSlug = (branch: string) => branch.replace(/\//g, '__')

const pathBranch = (branch: string | undefined, lane?: LaneRef | null) => {
    const name = checked('branch', branch, isBranchName)
    return lane && lane.layout === 2 ? branchSlug(name) : name
}

const runDir = (branch: string | undefined, commit: string | undefined, lane?: LaneRef | null) =>
    lanePath(lane, `runs/${pathBranch(branch, lane)}/${checked('commit', commit, isCommitSha)}`)

const workflowDir = (
    branch: string | undefined,
    commit: string | undefined,
    workflowId: string | undefined,
    lane?: LaneRef | null
) => `${runDir(branch, commit, lane)}/${checked('workflow', workflowId, isWorkflowId)}`

const goldenDir = (workflowId: string | undefined, lane?: LaneRef | null) =>
    lanePath(lane, `golden/${checked('workflow', workflowId, isWorkflowId)}`)

const indexPath = (branch: string | undefined, lane: string | undefined) =>
    `index/${checked('branch', branch, isBranchName)}/${checked('lane', lane, isLaneId)}`

// Only lanes lanes.json itself lists count: `lanes.lanes.constructor` is not a lane.
const isListed = (lanes: LanesIndex, id: string) =>
    Object.prototype.hasOwnProperty.call(lanes.lanes, id)

/**
 * Pick the lane to show: ?lane= when listed, else the primary, else the first listed,
 * else legacy. A requested id that names no published lane is handed back as `missing`
 * so the page can say which lane it shows instead of silently substituting one.
 */
export function resolveLane(
    lanes: LanesIndex | null | undefined,
    requested?: string
): LaneRef & { info?: LaneInfo; missing?: string } {
    if (lanes) {
        const id =
            (requested && isListed(lanes, requested) ? requested : undefined) ??
            (isListed(lanes, lanes.primary) ? lanes.primary : Object.keys(lanes.lanes)[0])
        if (id) {
            return {
                id,
                layout: lanes.lanes[id].layout,
                info: lanes.lanes[id],
                missing: requested && requested !== id ? requested : undefined,
            }
        }
    }
    return { ...LEGACY_LANE, missing: requested && requested !== LEGACY_LANE_ID ? requested : undefined }
}

// ── Hooks ──

// Every file may be absent while the worker catches up: data is `null` then, never an error.
// The URL is built up front for the query key; when it fails validation the query rejects
// with that error instead of sending a request (and nothing throws during render).
function staticQuery<T>(key: string, buildPath: () => string) {
    let url: string | null = null
    let invalid: unknown = null
    try {
        url = resultUrl(buildPath())
    } catch (e) {
        invalid = e
    }
    return {
        queryKey: [key, url ?? String(invalid)],
        queryFn: () => (url != null ? fetchJsonOrNull<T>(url) : Promise.reject(invalid)),
    }
}

const useStaticJson = <T>(key: string, buildPath: () => string, enabled: boolean) =>
    useQuery({ ...staticQuery<T>(key, buildPath), enabled })

export const useLanes = () => useStaticJson<LanesIndex>('regression-lanes', () => 'index/lanes.json', true)

export const useIndexHead = (branch?: string, lane?: string) =>
    useStaticJson<IndexHead>('regression-index', () => `${indexPath(branch, lane)}.json`, !!branch && !!lane)

const shardQuery = (branch: string, lane: string, month: string) =>
    staticQuery<IndexShard>(
        'regression-index-shard',
        () => `${indexPath(branch, lane)}/${checked('month', month, isPathSegment)}.json`
    )

/** Several monthly shards at once; the History page appends a month per "Load older". */
export const useIndexShards = (branch: string, lane: string, months: string[]) =>
    useQueries({ queries: months.map((m) => shardQuery(branch, lane, m)) })

export const useLatestPointer = (branch?: string, lane?: LaneRef | null) =>
    useStaticJson<LatestPointer>(
        'regression-latest',
        () => lanePath(lane, `latest/${pathBranch(branch, lane)}.json`),
        !!branch
    )

export const useRegressionSummary = (branch?: string, commit?: string, lane?: LaneRef | null) =>
    useStaticJson<RegressionSummary>(
        'regression-summary',
        () => `${runDir(branch, commit, lane)}/summary.json`,
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
        () => `${workflowDir(branch, commit, workflowId, lane)}/run.json`,
        !!branch && !!commit && !!workflowId
    )

export const useGoldenCurrent = (workflowId?: string, lane?: LaneRef | null) =>
    useStaticJson<GoldenCurrent>(
        'regression-golden',
        () => `${goldenDir(workflowId, lane)}/current.json`,
        !!workflowId
    )

/** The golden's own re-run noise floor; identical:true means a zero noise floor. */
export const useNoiseFloor = (workflowId?: string, tag?: string, lane?: LaneRef | null) =>
    useStaticJson<ComparisonMetrics>(
        'regression-noise-floor',
        () => `${goldenDir(workflowId, lane)}/${checked('golden tag', tag, isPathSegment)}/noise_floor.json`,
        !!workflowId && !!tag
    )

/** Throws for a value that fails validation: callers check what they pass first. */
export const outputUrl = (
    branch: string,
    commit: string,
    workflowId: string,
    filename: string,
    lane?: LaneRef | null
) =>
    resultUrl(
        `${workflowDir(branch, commit, workflowId, lane)}/outputs/${checked('file name', filename, isPathSegment)}`
    )

/** Throws for a value that fails validation: callers check what they pass first. */
export const figureUrl = (
    branch: string,
    commit: string,
    workflowId: string,
    figure: string,
    lane?: LaneRef | null
) => resultUrl(`${workflowDir(branch, commit, workflowId, lane)}/figures/${checked('figure', figure, isPathSegment)}`)
