// Read-only client for the Frontend tab. The data is static JSON that the worker repo's
// frontend-index workflow publishes under frontend/ on its results branch, next to the
// regression results: no token, no GitHub API calls from the browser. Set
// NEXT_PUBLIC_FRONTEND_BASE to another prefix (e.g. /fixtures/frontend for the checked-in
// samples, or a GCS URL once results move there).
import { useQueries, useQuery } from '@tanstack/react-query'
import {
    COMFY_REPO,
    checked,
    fetchJsonOrNull,
    staticQueryFor,
    useIndexHeads,
    useLanes,
    useStaticJsonFor,
} from '../regression/client'
import { isCommitSha, isPathSegment, isPrNumber } from '../regression/validate'
import { PACK_REGISTRY_URL, laneRefs, packLane } from './packs'
import type { PackLane, PackRegistry } from './packs'
import type { CiHead, CiShard, GateHead, PerfHead, PerfShard } from './types'

export const FRONTEND_BASE =
    process.env.NEXT_PUBLIC_FRONTEND_BASE ||
    'https://raw.githubusercontent.com/Comfy-Org/comfyci-runpod-worker/results/frontend'

export const FRONTEND_REPO = 'https://github.com/Comfy-Org/ComfyUI_frontend'

// ── Hooks ──
// Every file may be absent until the publisher has run: data is `null` then, never an error.

const monthPath = (dir: string, month: string) => `${dir}/${checked('month', month, isPathSegment)}.json`

export const useFrontendCi = () =>
    useStaticJsonFor<CiHead>(FRONTEND_BASE, 'frontend-ci', () => 'ci/main.json', true)

/** Several monthly CI shards at once; the table appends a month per "Load older". */
export const useFrontendCiShards = (months: string[]) =>
    useQueries({
        queries: months.map((m) =>
            staticQueryFor<CiShard>(FRONTEND_BASE, 'frontend-ci-shard', () => monthPath('ci/main', m))
        ),
    })

export const useFrontendPerf = () =>
    useStaticJsonFor<PerfHead>(FRONTEND_BASE, 'frontend-perf', () => 'perf/head.json', true)

export const useFrontendPerfShards = (months: string[]) =>
    useQueries({
        queries: months.map((m) =>
            staticQueryFor<PerfShard>(FRONTEND_BASE, 'frontend-perf-shard', () => monthPath('perf', m))
        ),
    })

export const useFrontendGate = () =>
    useStaticJsonFor<GateHead>(FRONTEND_BASE, 'frontend-gate', () => 'ci/custom-nodes.json', true)

// ── Custom-node packs on the GPU regression ──
// These read the regression lane index, not the frontend/ files, so the packs card and
// section stay up even while the frontend publisher is behind.

/** The worker's pack registry (the commit each pack is installed at); null when the file is absent. */
export const usePackRegistry = () =>
    useQuery({
        queryKey: ['pack-registry', PACK_REGISTRY_URL],
        queryFn: () => fetchJsonOrNull<PackRegistry>(PACK_REGISTRY_URL),
        staleTime: 5 * 60_000,
    })

/** A fetch that failed, with what it was for and a retry, for the shared error renderer. */
export interface FetchFailure {
    what: string
    error: unknown
    busy: boolean
    retry: () => void
}

export interface PackLanesState {
    /** True until lanes.json and every listed lane's index head have been fetched. */
    pending: boolean
    /** The first fetch that failed, or null. Lanes that did load are still in `lanes`. */
    failure: FetchFailure | null
    /** Lanes whose newest run has at least one pack workflow, in lanes.json order. */
    lanes: PackLane[]
}

/**
 * Every lane whose newest run has pack workflows, from lanes.json and each lane's index
 * head on its branch. Pending until every head is known, so a lane cannot flicker in.
 */
export function usePackLanes(): PackLanesState {
    const lanesQuery = useLanes()
    const refs = laneRefs(lanesQuery.data)
    const heads = useIndexHeads(refs.map((r) => ({ branch: r.branch, lane: r.id })))
    const pending = lanesQuery.isPending || heads.some((q) => q.isPending)
    const lanes = refs.flatMap((ref, i) => {
        const lane = packLane(ref, heads[i]?.data)
        return lane ? [lane] : []
    })
    let failure: FetchFailure | null = null
    if (lanesQuery.isError) {
        failure = {
            what: 'the lane index',
            error: lanesQuery.error,
            busy: lanesQuery.isFetching,
            retry: () => {
                lanesQuery.refetch()
            },
        }
    } else {
        const i = heads.findIndex((q) => q.isError)
        if (i !== -1) {
            const failed = heads[i]
            failure = {
                what: `the run index of ${refs[i].info.label}`,
                error: failed.error,
                busy: failed.isFetching,
                retry: () => {
                    failed.refetch()
                },
            }
        }
    }
    return { pending, failure, lanes }
}

// ── Links ──
// The published JSON is only as trustworthy as the publisher, so every value that goes
// into a URL is checked first; a builder hands back null for a value that fails, and the
// caller shows plain text instead of a link.

/** A lowercase hex sha of 7 to 40 characters: the core pin is stored as the workflow file spells it. */
export const isShortSha = (value: unknown): value is string =>
    typeof value === 'string' && /^[0-9a-f]{7,40}$/.test(value)

/** A GitHub Actions run id: a positive safe integer. */
export const isRunId = (value: unknown): value is number =>
    typeof value === 'number' && Number.isSafeInteger(value) && value > 0

export const frontendCommitUrl = (sha: unknown): string | null =>
    isCommitSha(sha) ? `${FRONTEND_REPO}/commit/${sha}` : null

export const runUrl = (id: unknown): string | null =>
    isRunId(id) ? `${FRONTEND_REPO}/actions/runs/${id}` : null

export const coreCommitUrl = (sha: unknown): string | null =>
    isShortSha(sha) ? `${COMFY_REPO}/commit/${sha}` : null

export const prUrl = (n: unknown): string | null => (isPrNumber(n) ? `${FRONTEND_REPO}/pull/${n}` : null)

/** An avatar URL only when it is on GitHub's avatar host, so the page never loads an image from elsewhere. */
export const avatarUrl = (url: unknown): string | null =>
    typeof url === 'string' && /^https:\/\/avatars\.githubusercontent\.com\/[A-Za-z0-9/_.?=&-]{1,200}$/.test(url)
        ? url
        : null
