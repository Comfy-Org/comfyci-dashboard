// Shapes produced by comfyci-runpod-worker's run_regression.py and published
// to GCS under regression/ — see that repo's README for the bucket layout.

export type RegressionVerdict =
    | 'pass'
    | 'fail'
    | 'execution_error'
    | 'infra_error'
    | 'no_baseline'

export interface ComparisonMetrics {
    error?: string
    frames_compared?: number
    frame_count_ref?: number
    frame_count_cand?: number
    identical?: boolean
    mean_mse?: number
    mean_psnr_db?: number | null
    min_psnr_db?: number | null
    max_abs_diff?: number
    mean_pct_pixels_changed?: number
    worst_frame_index?: number
}

export interface Thresholds {
    max_mean_mse: number
    min_mean_psnr_db: number
    max_pct_pixels_changed: number
}

export interface RunTimings {
    checkout_s?: number
    pip_s?: number
    server_start_s?: number
    prompt_exec_s?: number
}

// Workflow adaptations made against the target commit's /object_info schema —
// the automated equivalent of the manual QA reports' "schema drift" section.
export interface ValidationReport {
    ok?: boolean
    missing_nodes?: string[]
    stripped_inputs?: string[]
    filled_defaults?: string[]
    error?: string
}

export interface WorkflowRegressionResult {
    workflow_id: string
    worker_status: string
    verdict: RegressionVerdict
    vs_golden: ComparisonMetrics | null
    vs_previous: ComparisonMetrics | null
    thresholds_used: Thresholds | null
    golden_tag: string | null
    previous_commit: string | null
    gpu_name?: string | null
    timings?: RunTimings | null
    vram_peak_mb?: number | null
    rss_peak_mb?: number | null
    comfy_version?: string | null
    torch_version?: string | null
    python_version?: string | null
    error?: string
}

export interface RegressionSummary {
    branch: string
    commit: string
    run_ts: number
    overall: 'pass' | 'fail'
    workflows: Record<string, WorkflowRegressionResult>
}

export interface LatestPointer {
    commit: string
    run_ts: number
    workflows: string[]
}

export interface RunRecord {
    status?: string
    outputs?: { filename: string; bytes?: number; sha256?: string; truncated?: boolean }[]
    gpu_name?: string
    comfy_version?: string
    torch_version?: string
    python_version?: string
    vram_peak_mb?: number | null
    rss_peak_mb?: number | null
    timings?: RunTimings
    validation?: ValidationReport
}
