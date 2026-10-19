import Image from 'next/image'
import React from 'react'
import { CiDot, CiDotLegend, ciDotKind } from '../Dot'
import { FetchError } from '../FetchError'
import { Pager } from '../Pager'
import { WorkflowStatusButton } from '../StatusButton'
import { Surface } from '../Surface'
import { SectionHead, SectionMissing, SectionSkeleton } from './SectionState'
import { GROUP_LABEL, columnGroups, mergeCiEntries, overallMeta, visibleColumns } from '../../src/frontend/ci'
import type { useFrontendCi } from '../../src/frontend/client'
import { avatarUrl, frontendCommitUrl, prUrl, runUrl, useFrontendCiShards } from '../../src/frontend/client'
import { nextMonth } from '../../src/frontend/perf'
import type { CiCell, CiColumn, CiEntry, CiFirstBad } from '../../src/frontend/types'
import { formatDuration } from '../../utils/format'
import { dateUtc, formatRelative } from '../../utils/time'

const PAGE_SIZE = 25
const TITLE = 'CI on main'
const FILE = 'frontend/ci/main.json'

const shaChip =
    'rounded bg-smoke-200 dark:bg-charcoal-700 px-1.5 py-0.5 font-mono text-xs text-sapphire-700 dark:text-plum-300'
const dim = 'text-ash-500 dark:text-smoke-800'
const loadBtn =
    'inline-flex h-9 items-center rounded-lg border border-smoke-300 dark:border-charcoal-400/60 px-3 text-sm font-medium text-charcoal-800 dark:text-smoke-200 transition hover:border-electric/50 dark:hover:text-electric disabled:cursor-not-allowed disabled:opacity-40'

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** "success · 4.2m · attempt 2": what the cell's dot stands for. */
const cellFacts = (cell: CiCell) =>
    [
        cell.c ?? (cell.s ? cell.s.replace(/_/g, ' ') : 'queued'),
        cell.d != null ? formatDuration(cell.d) : null,
        cell.a != null && cell.a > 1 ? `attempt ${cell.a}` : null,
    ]
        .filter(Boolean)
        .join(' · ')

/** One workflow on one commit: a dot linking to the run, with a small attempt number after a re-run. */
const Cell: React.FC<{ col: CiColumn; cell: CiCell | undefined }> = ({ col, cell }) => {
    if (!cell) {
        return (
            <td className="px-1 py-3 text-center">
                <CiDot kind="missing" label={`${col.name} · no run for this commit`} />
            </td>
        )
    }
    const href = runUrl(cell.id)
    const rerun = cell.a != null && cell.a > 1
    const inner = (
        <span className="relative inline-flex">
            <CiDot kind={ciDotKind(cell.c)} label={`${col.name} · ${cellFacts(cell)}`} />
            {rerun && (
                <span
                    aria-hidden
                    className="absolute -right-1.5 -top-1 text-[8px] font-bold leading-none text-ash-500 dark:text-smoke-700"
                >
                    {cell.a}
                </span>
            )}
        </span>
    )
    return (
        <td className="px-1 py-3 text-center">
            {href ? (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded hover:ring-2 hover:ring-electric/50"
                >
                    {inner}
                </a>
            ) : (
                inner
            )}
        </td>
    )
}

const Row: React.FC<{ entry: CiEntry; columns: CiColumn[] }> = ({ entry, columns }) => {
    const meta = overallMeta(entry.o)
    const m = entry.m
    const pr = m ? prUrl(m.pr) : null
    const av = m ? avatarUrl(m.av) : null
    const author = m?.a ?? m?.pa ?? null
    const commitHref = frontendCommitUrl(entry.c)
    const sha = entry.c.slice(0, 7)
    return (
        <tr
            className={`transition-colors hover:bg-smoke-200/60 dark:hover:bg-charcoal-700/40 ${
                entry.o === 'failure' ? 'bg-red-500/[0.06] dark:bg-red-500/[0.08]' : ''
            }`}
        >
            <td className="px-5 py-3 align-top">
                <div className="flex flex-wrap items-center gap-2">
                    {commitHref ? (
                        <a
                            href={commitHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${shaChip} hover:underline`}
                        >
                            {sha}
                        </a>
                    ) : (
                        <span className={shaChip}>{sha}</span>
                    )}
                    {pr && m && (
                        <a
                            href={pr}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={m.pt ?? undefined}
                            className={`text-[11px] ${dim} hover:text-electric hover:underline`}
                        >
                            #{m.pr}
                        </a>
                    )}
                </div>
                {m?.s && (
                    <div className={`mt-1 max-w-[22rem] truncate text-xs ${dim}`} title={m.s}>
                        {m.s}
                    </div>
                )}
                {author && (
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ash-500/80 dark:text-smoke-800/80">
                        {av && <Image src={av} alt="" width={16} height={16} unoptimized className="h-4 w-4 rounded-full" />}
                        <span>{author}</span>
                    </div>
                )}
            </td>
            <td className="whitespace-nowrap px-5 py-3 align-top">
                <div className="text-sm">{formatRelative(entry.ct)}</div>
                <div className={`text-[11px] ${dim}`}>{new Date(entry.ct * 1000).toLocaleString()}</div>
            </td>
            {/* Centred like the dots to its right, so the verdict sits on the row's dot line. */}
            <td className="px-5 py-3 align-middle">
                <WorkflowStatusButton text={meta.text} status={meta.status} title={meta.title} />
            </td>
            {columns.map((col) => (
                <Cell key={col.id} col={col} cell={entry.w[col.id]} />
            ))}
        </tr>
    )
}

/** Two header rows: the group names, then one vertical label per column with its open chain in the title. */
const Head: React.FC<{ columns: CiColumn[]; firstBad: Record<string, CiFirstBad> }> = ({ columns, firstBad }) => {
    const groups = columnGroups(columns)
    const th = 'px-5 py-3 align-bottom font-semibold'
    return (
        <thead className="text-[11px] uppercase tracking-wider text-ash-500 dark:text-smoke-800">
            <tr>
                <th rowSpan={2} className={`${th} border-b border-smoke-300 dark:border-charcoal-400/60`}>
                    Commit
                </th>
                <th rowSpan={2} className={`${th} border-b border-smoke-300 dark:border-charcoal-400/60`}>
                    Time
                </th>
                <th rowSpan={2} className={`${th} border-b border-smoke-300 dark:border-charcoal-400/60`}>
                    Overall
                </th>
                {groups.map((g, i) => (
                    <th
                        key={`${g.group}-${i}`}
                        colSpan={g.columns.length}
                        className="px-1 pb-1 pt-3 text-center font-semibold"
                    >
                        {GROUP_LABEL[g.group]}
                    </th>
                ))}
            </tr>
            <tr className="border-b border-smoke-300 dark:border-charcoal-400/60">
                {columns.map((col) => {
                    const fb = firstBad[col.id]
                    const title = [
                        col.name,
                        ...(col.paths ?? []),
                        fb ? `red since ${fb.commit.slice(0, 7)} · ${plural(fb.runs, 'commit')} · ${dateUtc(fb.ct)}` : null,
                    ]
                        .filter(Boolean)
                        .join('\n')
                    return (
                        <th
                            key={col.id}
                            scope="col"
                            title={title}
                            className={`px-1 pb-2 text-center align-bottom text-[10px] font-semibold normal-case tracking-normal ${
                                fb ? 'text-red-600 dark:text-red-400' : ''
                            }`}
                        >
                            <span className="inline-block max-h-16 rotate-180 truncate [writing-mode:vertical-rl]">
                                {col.label}
                            </span>
                        </th>
                    )
                })}
            </tr>
        </thead>
    )
}

/** An open failing chain, as the regression page shows its first_bad banners. */
const ChainBanner: React.FC<{ col: CiColumn; fb: CiFirstBad; entries: CiEntry[] }> = ({ col, fb, entries }) => {
    const subject = entries.find((e) => e.c === fb.commit)?.m?.s
    const href = frontendCommitUrl(fb.commit)
    const prevHref = frontendCommitUrl(fb.prev_good)
    const pr = prUrl(fb.pr)
    const sha = fb.commit.slice(0, 7)
    const faint = 'text-red-600/80 dark:text-red-400/80'
    return (
        <div
            role="alert"
            className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-4 py-2.5 text-sm text-red-600 dark:text-red-400"
        >
            <span className="font-semibold">{col.name}</span>
            <span>failing since</span>
            {href ? (
                <a href={href} target="_blank" rel="noopener noreferrer" className="font-mono font-semibold hover:underline">
                    {sha}
                </a>
            ) : (
                <span className="font-mono font-semibold">{sha}</span>
            )}
            {(pr || fb.author) && (
                <span>
                    (
                    {pr && (
                        <a href={pr} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            #{fb.pr}
                        </a>
                    )}
                    {pr && fb.author && ', '}
                    {fb.author})
                </span>
            )}
            {subject && (
                <span className={`inline-block max-w-md truncate align-bottom ${faint}`} title={subject}>
                    — {subject}
                </span>
            )}
            <span className={faint}>
                · {plural(fb.runs, 'commit')} · since {dateUtc(fb.ct)}
            </span>
            {fb.prev_good && (
                <span className={faint}>
                    · last good{' '}
                    {prevHref ? (
                        <a href={prevHref} target="_blank" rel="noopener noreferrer" className="font-mono hover:underline">
                            {fb.prev_good.slice(0, 7)}
                        </a>
                    ) : (
                        <span className="font-mono">{fb.prev_good.slice(0, 7)}</span>
                    )}
                </span>
            )}
        </div>
    )
}

/**
 * Every push to main, newest first, with one dot per CI workflow grouped as the
 * registry groups them. The head carries the newest 300 commits; "Load older" appends a
 * monthly shard. Dots link to their run; a column header carries its open failing chain.
 */
export const CiMainTable: React.FC<{ query: ReturnType<typeof useFrontendCi> }> = ({ query }) => {
    const head = query.data
    const [page, setPage] = React.useState(1)
    const [olderMonths, setOlderMonths] = React.useState<string[]>([])
    const shardQueries = useFrontendCiShards(olderMonths)

    if (query.isPending) return <SectionSkeleton title={TITLE} rows={5} />
    if (query.isError) {
        return (
            <FetchError
                what="the CI index"
                error={query.error}
                busy={query.isFetching}
                onRetry={() => query.refetch()}
            />
        )
    }
    if (!head) return <SectionMissing title={TITLE} file={FILE} />

    const loadingOlder = shardQueries.some((q) => q.isPending)
    const failedShard = shardQueries.find((q) => q.isError)
    const entries = mergeCiEntries(
        head.entries,
        shardQueries.flatMap((q) => q.data?.entries ?? [])
    )
    // The head's registry keeps every column the publisher has ever seen (shards carry
    // entries only); an id a loaded commit has that is not in it still gets a plain column.
    const columns = visibleColumns(head.columns ?? [], entries)
    const oldest = entries[entries.length - 1]
    const next = nextMonth(head, entries.length, oldest?.ct, olderMonths)
    const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
    const pageEntries = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    // A chain stays open until the latest commit's cell for that column is a success.
    const open: Record<string, CiFirstBad> = {}
    for (const [id, fb] of Object.entries(head.first_bad ?? {})) {
        const cell = entries[0]?.w[id]
        if (!cell || cell.c !== 'success') open[id] = fb
    }
    const openColumns = columns.filter((c) => open[c.id])
    const caption = [
        `${plural(head.count, 'commit')} · ${entries.length} loaded`,
        head.coverage ? `from ${dateUtc(head.coverage.from_ts)}${head.coverage.partial ? ' (partial)' : ''}` : null,
        `${columns.length} workflows`,
    ]
        .filter(Boolean)
        .join(' · ')

    return (
        <section className="mb-6">
            <div className="mb-3">
                <SectionHead title={TITLE} caption={caption} />
            </div>
            {openColumns.map((col) => (
                <ChainBanner key={col.id} col={col} fb={open[col.id]} entries={entries} />
            ))}
            {entries.length === 0 ? (
                <Surface className="py-16 text-center text-sm text-ash-500 dark:text-smoke-800">
                    No commits indexed yet.
                </Surface>
            ) : (
                <Surface className="overflow-hidden">
                    <div className="overflow-x-auto scrollbar-thin">
                        <table className="w-full text-left text-sm">
                            <Head columns={columns} firstBad={open} />
                            <tbody className="divide-y divide-smoke-200 dark:divide-charcoal-400/40">
                                {pageEntries.map((entry) => (
                                    <Row key={entry.c} entry={entry} columns={columns} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="border-t border-smoke-200 dark:border-charcoal-400/40 px-5 py-2">
                        <CiDotLegend kinds={['success', 'failure', 'cancelled', 'skipped', 'in_progress', 'missing']} />
                    </div>
                </Surface>
            )}
            {failedShard && (
                <FetchError
                    className="mt-4"
                    what="older commits"
                    error={failedShard.error}
                    busy={failedShard.isFetching}
                    onRetry={() => failedShard.refetch()}
                />
            )}
            {(totalPages > 1 || next) && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
                    <Pager currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                    {next && (
                        <button
                            type="button"
                            disabled={loadingOlder}
                            onClick={() => setOlderMonths((months) => [...months, next])}
                            className={loadBtn}
                        >
                            {loadingOlder ? 'Loading…' : `Load older (${head.count - entries.length} more)`}
                        </button>
                    )}
                </div>
            )}
        </section>
    )
}
