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
    output_sha256?: string | null
    thumbnail?: string | null
    error?: string
}

export interface RegressionSummary {
    schema_version?: number
    branch: string
    commit: string
    run_ts: number
    overall: 'pass' | 'fail'
    // Additive v2 fields; older runs simply lack them.
    has_infra_error?: boolean
    commit_meta?: CommitMeta | null
    tested_range?: TestedRange | null
    lane?: string | null
    env?: RunEnv | null
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
    env?: RunEnv | null
}

// ── Additive v2 metadata on per-run files ──

export interface CommitMeta {
    subject: string
    author: string | null
    committed_ts: number | null
    parents: string[]
    pr: number | null
}

export interface TestedRange {
    prev: string | null
    commits_between: number | null
    compare_url: string
}

export interface RunEnv {
    python?: string | null
    torch?: string | null
    cuda?: string | null
    driver_version?: string | null
    image_sha?: string | null
    runtime_backends?: string[] | Record<string, string | number | boolean> | string | null
}

// ── Golden baseline metadata: golden/<wf>/current.json ──

export interface GoldenCurrent {
    tag: string
    blessed_by: string
    blessed_ts: number
    reason?: string
    supersedes?: string
    source?: string
    output_sha256?: string
}

// ── Published run index: index/lanes.json, index/<branch>/<lane>.json and monthly shards ──

// Layout 1 is the legacy tree (runs/, golden/, latest/ at the base); layout 2 nests
// the same tree under lanes/<lane id>/.
export type LaneLayout = 1 | 2

export interface LaneLatest {
    commit: string
    run_ts: number
    overall: 'pass' | 'fail'
}

export interface LaneInfo {
    label: string
    python: string
    torch: string
    cuda: string
    gpu: string
    cadence: 'per-commit' | 'nightly' | 'weekly'
    blocking: boolean
    role: 'primary' | 'lane' | 'legacy'
    layout: LaneLayout
    branches: Record<string, { latest: LaneLatest; count: number; shards: string[] }>
    goldens: Record<string, { tag: string; sha: string | null }>
}

export interface LanesIndex {
    schema_version: number
    generated_ts: number
    primary: string
    lanes: Record<string, LaneInfo>
}

// new_drift: failed vs golden and the output differs from the previous tested run (the
// change happened at this commit). inherited: failed but bit-identical to the previous,
// also failing, run. Null otherwise.
export type DriftKind = 'new_drift' | 'inherited'

export interface IndexWorkflowCell {
    v: RegressionVerdict
    d: DriftKind | null
    sha: string | null
    mse: number | null
    psnr: number | null
    pct: number | null
    pv: boolean | null
    exec: number | null
    vram: number | null
    g: string | null
    th: string | null
}

export interface IndexEntry {
    c: string
    t: number
    o: 'pass' | 'fail'
    infra: boolean
    cv: string | null
    m: { s: string; a: string | null; pr: number | null; ct: number | null } | null
    prev: string | null
    range: { n: number | null; url: string } | null
    w: Record<string, IndexWorkflowCell>
    s: Record<string, [number, number, number]> | null
}

// Start of the oldest consecutive failing chain per workflow, computed by the worker.
export interface FirstBad {
    commit: string
    prev_good: string | null
    run_ts: number
    pr: number | null
    author: string | null
    golden: string | null
    runs: number
}

export interface IndexHead {
    schema_version: number
    branch: string
    lane: string
    layout: LaneLayout
    generated_ts: number
    count: number
    shards: string[]
    latest: LaneLatest
    first_bad: Record<string, FirstBad>
    entries: IndexEntry[]
}

export interface IndexShard {
    schema_version: number
    branch: string
    lane: string
    shard: string
    entries: IndexEntry[]
}
