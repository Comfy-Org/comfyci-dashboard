import React from 'react'
import { COMFY_REPO } from '../src/regression/client'
import type { CommitMeta } from '../src/regression/types'
import { shortDate } from '../utils/time'

const linkClass = 'hover:text-electric hover:underline'

/** Subject, author, commit date, PR and parent links for the commit under test. */
export const CommitMetaChip: React.FC<{ meta: CommitMeta }> = ({ meta }) => (
    <div className="flex max-w-xl flex-col gap-0.5 rounded-xl border border-smoke-300 dark:border-charcoal-400/60 bg-smoke-200/60 dark:bg-charcoal-700/60 px-3 py-1.5 text-xs">
        <div
            className="truncate font-medium text-charcoal-800 dark:text-smoke-100"
            title={meta.subject}
        >
            {meta.subject}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 text-ash-500 dark:text-smoke-800">
            {meta.author && <span>{meta.author}</span>}
            {meta.committed_ts != null && <span>committed {shortDate(meta.committed_ts)}</span>}
            {meta.pr != null && (
                <a
                    href={`${COMFY_REPO}/pull/${meta.pr}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClass}
                >
                    #{meta.pr}
                </a>
            )}
            {(meta.parents ?? []).map((p) => (
                <a
                    key={p}
                    href={`${COMFY_REPO}/commit/${p}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`font-mono ${linkClass}`}
                >
                    parent {p.slice(0, 7)}
                </a>
            ))}
        </div>
    </div>
)
