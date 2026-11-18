import Link from 'next/link'
import React from 'react'
import { COMFY_REPO } from '../src/regression/client'
import type { FirstBad } from '../src/regression/types'
import {
    comfyCompareUrl,
    commitPageHref,
    isCommitSha,
    isPrNumber,
} from '../src/regression/validate'
import { shortDate } from '../utils/time'

/**
 * Where a failing chain started, as the words after "failing since": the first bad
 * commit with its PR and author, that commit's subject, how long the chain has run,
 * the golden it fails against and the last good commit. Rendered as inline fragments
 * so the All Results banner and the commit page's summary can give it their own
 * lead-in and colour. GitHub links are only built from a PR number and a full SHA.
 *
 * Two chains name no PR, author or subject, because their first commit is not known to
 * be the cause. One that never passed on the lane says it is the workflow's first run:
 * a smoke-level chain on any lane, and any chain on a nightly or weekly lane. One whose
 * first run covered more than one commit (a nightly or weekly lane) links the commits
 * after the last good one, and says how many while the published count is of those.
 */
export const FirstBadLine: React.FC<{
    fb: FirstBad
    branch: string
    laneId: string
    /** The lane is nightly or weekly: a run of it covers many commits. */
    longCadence?: boolean
    /** Subject of the first bad commit, when the caller has it from the index. */
    subject?: string
    /** Classes for the details after the commit and its origin. */
    dimClass?: string
}> = ({
    fb,
    branch,
    laneId,
    longCadence = false,
    subject,
    dimClass = 'text-ash-500 dark:text-smoke-800',
}) => {
    const href = (sha: string) => commitPageHref(branch, sha, laneId)
    const pr = isPrNumber(fb.pr) ? fb.pr : null
    const firstRun = !fb.prev_good && (fb.level === 'smoke' || longCadence)
    const range = fb.range != null && typeof fb.range === 'object' ? fb.range : null
    const covered = range != null && typeof range.n === 'number' && range.n > 0 ? range.n : null
    // A range of one commit names its commit, as every chain of a per-commit lane does.
    const batch = !firstRun && range != null && covered !== 1
    // Built from the two SHAs, not taken from the published link. The published range is
    // that of the chain's first run: a later run that passed at an older commit moves
    // "last good" forward, and the count no longer fits the commits that are left.
    const compare =
        batch && isCommitSha(fb.prev_good) && isCommitSha(fb.commit)
            ? `${COMFY_REPO}/compare/${fb.prev_good}...${fb.commit}`
            : null
    const counted = covered != null && compare != null && comfyCompareUrl(range?.url) === compare
    const commits = counted ? `${covered} commits` : 'an unknown number of commits'
    return (
        <>
            <Link href={href(fb.commit)} className="font-mono font-semibold hover:underline">
                {fb.commit.slice(0, 7)}
            </Link>
            {batch ? (
                <>
                    {' '}
                    <span>
                        (a run that covered{' '}
                        {compare ? (
                            <a
                                href={compare}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                            >
                                {commits}
                            </a>
                        ) : (
                            commits
                        )}
                        )
                    </span>
                </>
            ) : firstRun ? (
                <>
                    {' '}
                    <span>(the workflow&apos;s first run on this lane)</span>
                </>
            ) : (
                (pr != null || fb.author) && (
                    <>
                        {' '}
                        <span>
                            (
                            {pr != null && (
                                <a
                                    href={`${COMFY_REPO}/pull/${pr}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline"
                                >
                                    #{pr}
                                </a>
                            )}
                            {pr != null && fb.author && ', '}
                            {fb.author})
                        </span>
                    </>
                )
            )}
            {subject && !batch && !firstRun && (
                <>
                    {' '}
                    <span
                        className={`inline-block max-w-md truncate align-bottom ${dimClass}`}
                        title={subject}
                    >
                        — {subject}
                    </span>
                </>
            )}{' '}
            <span className={dimClass}>
                · {fb.runs} run{fb.runs === 1 ? '' : 's'} · since {shortDate(fb.run_ts)}
                {fb.golden ? ` · vs golden ${fb.golden}` : ''}
                {fb.level === 'smoke' && ' · smoke level'}
                {isCommitSha(fb.commit) && (
                    <>
                        {' '}
                        ·{' '}
                        <a
                            href={`${COMFY_REPO}/commit/${fb.commit}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                        >
                            GitHub
                        </a>
                    </>
                )}
                {fb.prev_good && (
                    <>
                        {' '}
                        · last good{' '}
                        <Link href={href(fb.prev_good)} className="font-mono hover:underline">
                            {fb.prev_good.slice(0, 7)}
                        </Link>
                    </>
                )}
            </span>
        </>
    )
}
