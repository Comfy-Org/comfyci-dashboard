/** Relative age of a unix-seconds timestamp, e.g. "just now", "12m ago", "3h ago", "2d ago". */
export function formatRelative(unixSeconds: number, nowMs = Date.now()): string {
    const diff = Math.max(0, Math.round(nowMs / 1000 - unixSeconds))
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
}

/** Age in hours of a unix-seconds timestamp. */
export const hoursSince = (unixSeconds: number, nowMs = Date.now()) =>
    (nowMs / 1000 - unixSeconds) / 3600

/** UTC month key ("YYYY-MM") of a unix-seconds timestamp; the worker shards its index by month. */
export const monthKey = (unixSeconds: number) =>
    new Date(unixSeconds * 1000).toISOString().slice(0, 7)

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Day, month and year in UTC with fixed English month names, e.g. "10 Sep 2026". */
export function dateUtc(unixSeconds: number, withYear = true): string {
    const d = new Date(unixSeconds * 1000)
    const dayMonth = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
    return withYear ? `${dayMonth} ${d.getUTCFullYear()}` : dayMonth
}

/** Short absolute date, e.g. "Sep 23, 2026". */
export const shortDate = (unixSeconds: number) =>
    new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
