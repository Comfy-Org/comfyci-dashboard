// Shapes produced by comfyci-runpod-worker's run_regression.py and published
// to GCS under regression/ — see that repo's README for the bucket layout.

export type RegressionVerdict =
    | 'pass'
    | 'fail'
    | 'execution_error'
    | 'infra_error'
    | 'no_baseline'

// Where two texts first differ. `line` and `col` are 1-based; `ref` and `cand` are the two
// lines there (model output: only ever rendered as text), null for a text that has ended.
export interface TextFirstDiff {
    file?: string
    line?: number
    col?: number
    offset?: number
    ref?: string | null
    cand?: string | null
}

export interface ComparisonMetrics {
    // What was compared. Absent on image comparisons, which is every run published before
    // text workflows; "text" carries the text fields below and none of the image ones.
    kind?: string | null
    error?: string
    frames_compared?: number | null
    frame_count_ref?: number | null
    frame_count_cand?: number | null
    identical?: boolean
    mean_mse?: number | null
    mean_psnr_db?: number | null
    min_psnr_db?: number | null
    max_abs_diff?: number | null
    mean_pct_pixels_changed?: number | null
    worst_frame_index?: number | null
    // Text comparisons: 0 to 1, 1 only when identical. Over words, unless the texts were
    // too long for that: `similarity_basis` is then "lines" or "prefix".
    similarity?: number | null
    similarity_basis?: string | null
    // How many text files had a file of the same name on the other side. 0: none was compared.
    files_compared?: number | null
    first_diff?: TextFirstDiff | null
    file_count_ref?: number | null
    file_count_cand?: number | null
}

export interface Thresholds {
    max_mean_mse: number
    min_mean_psnr_db: number
    max_pct_pixels_changed: number
}

// The one limit a text workflow can set. Without it the text must match exactly, and the
// worker publishes thresholds_used: null.
export interface TextThresholds {
    min_text_similarity?: number | null
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

// How a workflow is checked. Absent means reference level: its output is compared with a
// blessed golden. "smoke" means it only has to finish and to write usable files: nothing
// is compared, so such a result has no golden, no metrics and no re-bless.
export type CheckLevel = 'smoke'

// One output file of a smoke-level run. `type` is null for an extension that is not
// checked. `sent` and `published` are written only when false: the worker did not send
// the file, or it is not on the results branch. The rest is what the check measured.
export interface SmokeFile {
    name: string
    type: string | null
    bytes?: number | null
    sha256?: string | null
    sent?: boolean
    published?: boolean
    // image and video
    width?: number
    height?: number
    // image: spread of the brightness, and the share of pixels with the most common one
    std?: number
    flat_share?: number
    // text
    chars?: number
    words?: number
    // audio
    sample_rate?: number
    channels?: number
    bits?: number
    bytes_per_second?: number
    pcm_md5?: string | null
    // audio and video
    seconds?: number
    // mesh: `extent` is the three sides of the bounding box, null when a position is not finite
    vertices?: number
    faces?: number
    extent?: number[] | null
    // video
    frames?: number
    bytes_per_frame_mp?: number
}

// Why a smoke-level run does not pass. `file` is null for a file that is missing.
export interface SmokeProblem {
    file: string | null
    check: string
    text: string
}

export interface SmokeResult {
    files: SmokeFile[]
    problems: SmokeProblem[]
    // Sentences that are not failures, e.g. a file that was checked by its size only.
    notes: string[]
}

export interface WorkflowRegressionResult {
    workflow_id: string
    worker_status: string
    verdict: RegressionVerdict
    vs_golden: ComparisonMetrics | null
    vs_previous: ComparisonMetrics | null
    thresholds_used: Thresholds | TextThresholds | null
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
    // Written only for a workflow that is not an image workflow, e.g. "text".
    output_kind?: string | null
    // Written only for a smoke-level workflow, with what its checks found. A run the
    // harness could not start has the level and no `smoke`.
    level?: CheckLevel
    smoke?: SmokeResult | null
    // Written as 2 on the result of the second job a nightly or weekly run gave the
    // workflow at its end. No page shows it: the card is that job's either way.
    tries?: number
    // The workflow's last pass or failure before this run, when it had one.
    prior_verdict?: string | null
    error?: string
}

// A later run that tested some workflows again at a commit the lane already had a result
// for. Their cells in the summary are that run's.
export interface Retest {
    run_ts?: number
    workflows?: string[]
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
    // Written only in the cases named. `partial`: the run pushed this summary before it
    // had every result, so it did not finish or is still going. `scope`: the run tested
    // only the workflows it named, so this is not the lane's result of the commit.
    // `retests`: later runs that tested workflows again at this commit.
    partial?: { done?: number; of?: number } | null
    scope?: string[]
    retests?: Retest[]
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
    // Absent or null when the worker did not resolve the parents (older builds).
    parents?: string[] | null
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

// How often a lane runs. A retired lane no longer runs at all; its history stays
// published under the same index paths.
export type LaneCadence = 'per-commit' | 'nightly' | 'weekly' | 'retired'

export interface LaneInfo {
    label: string
    python: string
    torch: string
    cuda: string
    gpu: string
    cadence: LaneCadence
    blocking: boolean
    role: 'primary' | 'lane' | 'legacy'
    layout: LaneLayout
    // `latest` is the newest run that did not name its workflows, and null when the lane has
    // none on the branch. `count` is every run, so it can be above 0 beside a null latest.
    branches: Record<string, { latest: LaneLatest | null; count: number; shards: string[] }>
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
// also failing, run. Null otherwise. A smoke-level failure is "inherited" when the
// workflow's last result before it had failed too, else null.
export type DriftKind = 'new_drift' | 'inherited'

// The commits a run covered: how many, and GitHub's compare page for them. `n` is null
// when GitHub did not give the count. `prev` is on a run's range for one workflow (`wr`):
// the commit of the workflow's last pass or failure when the run was made.
export interface CommitRange {
    n: number | null
    url: string | null
    prev?: string | null
}

// How ComfyUI's startup went for one custom-node pack the workflow installs: imported,
// failed to import, or not found in the startup log at all.
export type PackImportStatus = 'ok' | 'failed' | 'missing'

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
    // Output kind, written only when it is not image (e.g. "text"); such a cell has no MSE.
    k?: string
    // Check level, written only for a smoke-level cell; such a cell has no MSE and no golden.
    l?: CheckLevel
    // Import status per custom-node pack, keyed by the pack's custom_nodes directory name.
    // Present only on the cells of workflows that install packs.
    cn?: Record<string, PackImportStatus>
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
    // Written as true, and only then: the run named its workflows at a commit the lane has
    // no full result for. Its cells are those workflows alone, and it is not the lane's
    // run of the commit.
    named?: boolean
    // Per failing workflow, the commits between its own last result and this run. Only
    // runs of nightly and weekly lanes have it: one run of theirs covers many commits.
    wr?: Record<string, CommitRange>
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
    // Set when a smoke-level result opened the chain.
    level?: CheckLevel
    // On a nightly or weekly lane: the commits the chain's first run covered for this
    // workflow. With more than one, `commit` is only the newest of them. After a later run
    // passed inside that range it is the link from `prev_good` to `commit`, and `n` is null.
    range?: CommitRange | null
}

export interface IndexHead {
    schema_version: number
    branch: string
    lane: string
    layout: LaneLayout
    generated_ts: number
    count: number
    shards: string[]
    // The newest run that did not name its workflows: `entries[0]` can be newer.
    latest: LaneLatest | null
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
