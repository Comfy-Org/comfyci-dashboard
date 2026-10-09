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

/**
 * A regression workflow id such as flux_dev_t2i. Ids are the keys of the worker's
 * manifest, which does not restrict them, so capitals, dots and dashes (as in template
 * names like video_wan2_2_14B_t2v) are accepted; a leading '.' or '-' or any '/' is not.
 */
export const isWorkflowId = (value: unknown): value is string =>
    typeof value === 'string' && /^[A-Za-z0-9_][A-Za-z0-9._-]{0,99}$/.test(value)

/** A lane id such as py312-torch2.11.0-cu128. */
export const isLaneId = (value: unknown): value is string =>
    typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(value)

/** One plain path segment (a golden tag, a shard month, an output file name): never '.' or '..'. */
export const isPathSegment = (value: unknown): value is string =>
    typeof value === 'string' && /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/.test(value)

/**
 * Quotes a value for a shell command shown to be copied. A value of only letters, digits
 * and "._/-" means the same to every shell and is left bare, so the command also pastes
 * into cmd.exe (which would keep single quotes as part of the value). Anything else is
 * single-quoted for a POSIX shell: nothing inside is expanded, and an embedded quote is
 * closed, escaped and reopened.
 */
export const shellQuote = (value: string) =>
    /^[A-Za-z0-9._/-]+$/.test(value) ? value : `'${value.replace(/'/g, `'\\''`)}'`

/** Link to a commit's regression page, each segment encoded so it stays one path segment. */
export const commitPageHref = (branch: string, commit: string, laneId: string) =>
    `/regression/${encodeURIComponent(branch)}/${encodeURIComponent(commit)}?lane=${encodeURIComponent(laneId)}`
