import Link from 'next/link'
import React from 'react'
import { COMFY_REPO } from '../src/regression/client'
import type { FirstBad } from '../src/regression/types'
import { shortDate } from '../utils/time'

/**
 * Where a failing chain started, as the words after "failing since": the first bad
 * commit with its PR and author, that commit's subject, how long the chain has run,
 * the golden it fails against and the last good commit. Rendered as inline fragments
 * so the history page's banner and the commit page's summary can give it their own
 * lead-in and colour.
 */
export const FirstBadLine: React.FC<{
    fb: FirstBad
    branch: string
    laneId: string
    /** Subject of the first bad commit, when the caller has it from the index. */
    subject?: string
    /** Classes for the details after the commit and its origin. */
    dimClass?: string
}> = ({ fb, branch, laneId, subject, dimClass = 'text-ash-500 dark:text-smoke-800' }) => {
    const href = (sha: string) => `/regression/${branch}/${sha}?lane=${laneId}`
    return (
        <>
            <Link href={href(fb.commit)} className="font-mono font-semibold hover:underline">
                {fb.commit.slice(0, 7)}
            </Link>
            {(fb.pr != null || fb.author) && (
                <>
                    {' '}
                    <span>
                        (
                        {fb.pr != null && (
                            <a
                                href={`${COMFY_REPO}/pull/${fb.pr}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                            >
                                #{fb.pr}
                            </a>
                        )}
                        {fb.pr != null && fb.author && ', '}
                        {fb.author})
                    </span>
                </>
            )}
            {subject && (
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
                {fb.golden ? ` · vs golden ${fb.golden}` : ''} ·{' '}
                <a
                    href={`${COMFY_REPO}/commit/${fb.commit}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                >
                    GitHub
                </a>
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
