// Shapes published by comfyci-runpod-worker's frontend_index.py under frontend/ on the
// results branch: compact keys, every timestamp an epoch second in UTC, schema_version 1.
// Each file mirrors one source in Comfy-Org/ComfyUI_frontend: the perf-data branch,
// the CI workflows on main, and the daily custom-nodes gate.

// ── CI on main: frontend/ci/main.json and frontend/ci/main/<YYYY-MM>.json ──

/** A completed run's conclusion as GitHub reports it; null while the run is not completed. */
export type CiConclusion =
    | 'success'
    | 'failure'
    | 'cancelled'
    | 'skipped'
    | 'timed_out'
    | 'action_required'
    | 'neutral'
    | 'stale'
    | 'startup_failure'

/** A commit's overall state across its core columns, computed by the publisher. */
export type CiOverall = 'success' | 'failure' | 'pending' | 'cancelled'

export type CiGroup = 'core' | 'website' | 'billing' | 'validation' | 'other'

/** One cell: the latest attempt of a workflow on a commit. */
export interface CiCell {
    /** GitHub Actions run id. */
    id: number
    /** Conclusion of the latest attempt; null until it completes. */
    c: CiConclusion | null
    /** Run status (queued, in_progress, ...) while `c` is null. */
    s?: string
    /** run_started_at. */
    t: number
    /** Duration in seconds, once completed. */
    d?: number
    /** Attempt number when it was re-run (absent on the first attempt). */
    a?: number
}

/**
 * Compact commit metadata: subject and author from the commit, PR number, committed
 * timestamp, and the PR's title, author login and avatar URL once the PR lookup ran.
 */
export interface CiMeta {
    /** Commit subject; null when the head_commit message was empty. */
    s: string | null
    a: string | null
    pr?: number | null
    ct?: number | null
    pt?: string | null
    pa?: string | null
    av?: string | null
}

export interface CiEntry {
    /** Full commit SHA on main. */
    c: string
    /** head_commit timestamp. */
    ct: number
    o: CiOverall
    m: CiMeta | null
    /** Set while `m` is provisional (taken from head_commit, PR lookup still pending). */
    mi?: true
    /** Cells keyed by column id. A column missing from `w` has no run for this commit. */
    w: Record<string, CiCell>
}

/** Column registry entry: one or more workflow paths that share a column. */
export interface CiColumn {
    id: string
    /** Short header text. */
    label: string
    /** Workflow file paths, e.g. ".github/workflows/ci-tests-unit.yaml"; lint has two. */
    paths: string[]
    /** Display name of the workflow, e.g. "CI: Tests Unit". */
    name: string
    group: CiGroup
}

/** Start of the open failing chain of a column, computed by the publisher. */
export interface CiFirstBad {
    /** Full SHA of the first failing commit. */
    commit: string
    ct: number
    /** The last indexed commit on which the column succeeded before the chain; null when none. */
    prev_good: string | null
    pr: number | null
    /** Author of the first failing commit. */
    author: string | null
    /** Consecutive failing commits in the chain. */
    runs: number
}

export interface CiHead {
    schema_version: number
    repo: string
    branch: string
    updated_ts: number
    count: number
    /** Entries per monthly shard, keyed "YYYY-MM". */
    shards: Record<string, number>
    columns: CiColumn[]
    /** The newest commit; null while the index is empty. */
    latest: { c: string; ct: number; o: CiOverall } | null
    first_bad: Record<string, CiFirstBad>
    coverage: { from_ts: number; partial: boolean }
    /** Newest first, at most 300. */
    entries: CiEntry[]
}

export interface CiShard {
    schema_version: number
    repo: string
    branch: string
    shard: string
    /** The whole month, newest first. */
    entries: CiEntry[]
}

// ── Perf baselines: frontend/perf/head.json and frontend/perf/<YYYY-MM>.json ──

/**
 * One char per metric: r regression, i improvement, n neutral, x noisy (CV over 50 %),
 * - insufficient history (fewer than 2 preceding baselines).
 */
export type PerfClass = 'r' | 'i' | 'n' | 'x' | '-'

export interface PerfMetric {
    key: string
    label: string
    /** "ms", "bytes", or "" for a plain count. */
    unit: string
    /** Smallest absolute change that counts (count metrics need 5); null for no gate. */
    min_abs_delta: number | null
}

/** [current median, history mean, history sample stddev, history n, z or null, class]. */
export type PerfCmp = [number | null, number | null, number | null, number, number | null, PerfClass]

export interface PerfLatest {
    id: string
    /** Full commit SHA from the baseline's gitSha; null when the file had none. */
    c: string | null
    t: number
    /** Preceding baselines in the comparison window. */
    n_hist: number
    /** Per scenario, one tuple per metric in `metrics` order. */
    cmp: Record<string, PerfCmp[]>
}

export interface PerfEntry {
    /** Baseline file stem, "<YYYYMMDDTHHMMSSZ>-<sha8>". */
    id: string
    /** Full commit SHA from the baseline's gitSha; null when the file had none. */
    c: string | null
    t: number
    /** Samples per scenario (3 unless listed in `nx`). */
    n: number
    nx?: Record<string, number>
    /** Per scenario, one mean per metric in `metrics` order; null when the metric is absent. */
    s: Record<string, (number | null)[]>
    /** Per scenario, one class char per metric, computed against the preceding window. */
    cls: Record<string, string>
}

export interface PerfHead {
    schema_version: number
    repo: string
    /** The branch the baselines are read from ("perf-data"). */
    branch: string
    updated_ts: number
    metrics: PerfMetric[]
    targets: { p5_fps: number }
    /** Preceding baselines compared against. */
    window: number
    /** The frontend's thresholds: noisy above this CV in percent, regression beyond +-z. */
    rule: { cv_noisy_pct: number; z: number }
    stats: { current: string; history: string; stddev: string; delta_base: string }
    count: number
    shards: Record<string, number>
    scenarios: string[]
    latest: PerfLatest | null
    /** Newest first, at most 100. */
    entries: PerfEntry[]
}

/** A monthly shard carries entries only; the metric registry lives in the head. */
export interface PerfShard {
    schema_version: number
    repo: string
    shard: string
    entries: PerfEntry[]
}

// ── Custom-nodes gate: frontend/ci/custom-nodes.json ──

export type GateEvent = 'schedule' | 'workflow_dispatch'

/** Conclusions of the matrix jobs of one run, keyed by proof row, then by shard. */
export type GateRows = Record<string, Record<string, CiConclusion | null>>

export interface GateRun {
    id: number
    t: number
    ev: GateEvent
    /** Run conclusion; null while it is not completed. */
    c: CiConclusion | null
    /** Duration in seconds; null while the run is not completed. */
    d: number | null
    /** head_sha of the workflow file the run used. */
    sha: string
    /** COMFYUI_PIN read from the workflow file at `sha`; null when it could not be parsed. */
    pin: string | null
    /** The ComfyUI ref the run tested: the pin for scheduled runs, null for a dispatch (phase 2). */
    ref: string | null
    rs: 'pin' | 'dispatch'
    /** Conclusion of the verdict job ("E2E Custom Nodes Test"). */
    final: CiConclusion | null
    rows: GateRows
    /** Name of the failed step per proof row and shard, for non-success jobs only. */
    fs: Record<string, Record<string, string>>
    /**
     * [matrix jobs, failed matrix jobs]; null when the jobs lookup failed, in which case
     * `rows` is empty and the publisher fetches the run again next tick.
     */
    jobs: [number, number] | null
    /** Run status while `c` is null. */
    s?: string
    /** Attempt number when re-run. */
    a?: number
}

export interface GateStreak {
    state: 'pass' | 'fail'
    /** Timestamp of the first run of the current unbroken state. */
    since: number
    days: number
    /** Runs with a decided clean row in the streak. */
    runs: number
    /** True when the streak reaches the oldest stored run, so it may be longer than shown. */
    capped: boolean
}

export interface GateHead {
    schema_version: number
    repo: string
    workflow: string
    updated_ts: number
    /** Run events that are indexed (schedule and workflow_dispatch; PR runs are not). */
    events: GateEvent[]
    /** Name of the verdict job whose conclusion `GateRun.final` carries. */
    verdict_job: string
    limit: number
    /** COMFYUI_PIN at the newest run. */
    pin: string | null
    streak: GateStreak | null
    /** Newest first, at most `limit`. */
    runs: GateRun[]
}
