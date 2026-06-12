/** Format a duration in seconds into a compact human string (e.g. "45s", "1.5m", "1h 3m"). */
export function formatDuration(seconds: number): string {
    if (!isFinite(seconds) || seconds <= 0) return '—'
    if (seconds < 60) return `${Math.round(seconds)}s`
    const mins = seconds / 60
    if (mins < 60) return `${mins.toFixed(1)}m`
    const hrs = Math.floor(mins / 60)
    const rem = Math.round(mins % 60)
    return `${hrs}h ${rem}m`
}
