// Read-only client for the Frontend tab. The data is static JSON that the worker repo's
// frontend-index workflow publishes under frontend/ on its results branch, next to the
// regression results: no token, no GitHub API calls from the browser. Set
// NEXT_PUBLIC_FRONTEND_BASE to another prefix (e.g. /fixtures/frontend for the checked-in
// samples, or a GCS URL once results move there).
import { useQueries } from '@tanstack/react-query'
import { COMFY_REPO, checked, staticQueryFor, useStaticJsonFor } from '../regression/client'
import { isCommitSha, isPathSegment, isPrNumber } from '../regression/validate'
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
