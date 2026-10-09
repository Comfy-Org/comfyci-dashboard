// Shape checks for the values that end up in result URLs, page links and the copyable
// re-bless commands. Route params come straight from the address bar and the published
// JSON is only as trustworthy as the worker that wrote it, so a value that fails its
// check is never fetched, linked or put in a command.

/** A full, lowercase 40-character git commit SHA: runs are keyed by nothing shorter. */
export const isCommitSha = (value: unknown): value is string =>
    typeof value === 'string' && /^[0-9a-f]{40}$/.test(value)

/** A pull request number: a positive integer, never a string that could extend a link's path. */
export const isPrNumber = (value: unknown): value is number =>
    typeof value === 'number' && Number.isSafeInteger(value) && value > 0

/**
 * A git branch name in a conservative charset. Like git, no '/'-separated part may be
 * empty or start with '.', so '..', '//', and a leading or trailing '/' are all refused,
 * and a leading '-' cannot be read as an option.
 */
export function isBranchName(value: unknown): value is string {
    if (typeof value !== 'string' || !/^[A-Za-z0-9._/-]{1,100}$/.test(value)) return false
    if (value.startsWith('-') || value.includes('..')) return false
    return value.split('/').every((part) => part !== '' && !part.startsWith('.'))
}

/** A regression workflow id: the worker names them after their workflow file stems. */
export const isWorkflowId = (value: unknown): value is string =>
    typeof value === 'string' && /^[a-z0-9_]{1,100}$/.test(value)

/** A lane id such as py312-torch2.11.0-cu128. */
export const isLaneId = (value: unknown): value is string =>
    typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(value)

/** One plain path segment (a golden tag, a shard month, an output file name): never '.' or '..'. */
export const isPathSegment = (value: unknown): value is string =>
    typeof value === 'string' && /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/.test(value)

/**
 * Single-quotes a value for a POSIX shell command shown to be copied: nothing inside
 * single quotes is expanded, and an embedded quote is closed, escaped and reopened.
 */
export const shellQuote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`

/** Link to a commit's regression page, each segment encoded so it stays one path segment. */
export const commitPageHref = (branch: string, commit: string, laneId: string) =>
    `/regression/${encodeURIComponent(branch)}/${encodeURIComponent(commit)}?lane=${encodeURIComponent(laneId)}`
