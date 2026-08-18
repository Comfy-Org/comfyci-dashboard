// Read-only client for regression results in GCS. These are static JSON blobs
// (not api.comfy.org endpoints), fetched directly from the public bucket.
import { useQuery } from '@tanstack/react-query'
import type { LatestPointer, RegressionSummary, RunRecord } from './types'

export const REGRESSION_BASE =
    process.env.NEXT_PUBLIC_GCS_REGRESSION_BASE ||
    'https://storage.googleapis.com/comfy-ci-results/regression'

async function fetchJsonOrNull<T>(url: string): Promise<T | null> {
    const res = await fetch(url, { cache: 'no-store' })
    if (res.status === 404 || res.status === 403) return null
    if (!res.ok) throw new Error(`${res.status} fetching ${url}`)
    return (await res.json()) as T
}

export const useLatestPointer = (branch: string) =>
    useQuery({
        queryKey: ['regression-latest', branch],
        queryFn: () =>
            fetchJsonOrNull<LatestPointer>(`${REGRESSION_BASE}/latest/${branch}.json`),
        enabled: !!branch,
    })

export const useRegressionSummary = (branch?: string, commit?: string) =>
    useQuery({
        queryKey: ['regression-summary', branch, commit],
        queryFn: () =>
            fetchJsonOrNull<RegressionSummary>(
                `${REGRESSION_BASE}/runs/${branch}/${commit}/summary.json`
            ),
        enabled: !!branch && !!commit,
    })

export const useRunRecord = (branch?: string, commit?: string, workflowId?: string) =>
    useQuery({
        queryKey: ['regression-run', branch, commit, workflowId],
        queryFn: () =>
            fetchJsonOrNull<RunRecord>(
                `${REGRESSION_BASE}/runs/${branch}/${commit}/${workflowId}/run.json`
            ),
        enabled: !!branch && !!commit && !!workflowId,
    })

export const outputUrl = (
    branch: string,
    commit: string,
    workflowId: string,
    filename: string
) => `${REGRESSION_BASE}/runs/${branch}/${commit}/${workflowId}/outputs/${filename}`

export const figureUrl = (
    branch: string,
    commit: string,
    workflowId: string,
    figure: string
) => `${REGRESSION_BASE}/runs/${branch}/${commit}/${workflowId}/figures/${figure}`
