import React from 'react'
import { SectionTitle } from './Surface'
import { problemFile, readSmoke, smokeFacts } from '../src/regression/smoke'
import type { SmokeFile, SmokeProblem } from '../src/regression/types'
import { formatBytes } from '../utils/format'

// File names, problem sentences and notes come from the worker's run. They only ever go
// in as React text children, which React escapes: never as HTML. A name becomes a link
// only through `hrefFor`, which gives no link for anything but a plain file name.

const th = 'px-4 py-2 font-semibold'
const td = 'px-4 py-2 align-top'
const quiet = 'text-ash-500 dark:text-smoke-800'
const link = 'hover:text-sapphire-700 dark:hover:text-electric hover:underline'

function FileRow({
    file,
    failed,
    hrefFor,
}: {
    file: SmokeFile
    /** A problem names this file. */
    failed: boolean
    hrefFor: (name: string) => string | null
}) {
    // A file the worker did not send, or one the run kept in its artifact, is not on the
    // results branch: it gets no link. The Measured cell says when it was not sent.
    const sent = file.sent !== false
    const published = sent && file.published !== false
    const href = published ? hrefFor(file.name) : null
    return (
        <tr className="border-t border-smoke-200 dark:border-charcoal-400/40">
            {/* The widths keep a long name readable on a phone: the table scrolls in its box. */}
            <td className={`${td} min-w-[12rem] break-all font-mono text-xs`}>
                {href != null ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className={link}>
                        {file.name}
                    </a>
                ) : (
                    file.name
                )}
                {sent && !published && (
                    <span className={`block font-sans text-[11px] ${quiet}`}>
                        not published, kept in the run&apos;s artifact
                    </span>
                )}
            </td>
            <td className={td}>{typeof file.type === 'string' ? file.type : 'other'}</td>
            <td className={`${td} whitespace-nowrap font-mono tabular-nums`}>
                {typeof file.bytes === 'number' ? formatBytes(file.bytes) : 'unknown'}
            </td>
            <td className={`${td} min-w-[14rem] ${failed ? 'font-semibold text-red-400' : ''}`}>
                {smokeFacts(file)}
            </td>
            <td
                className={`${td} whitespace-nowrap font-mono text-xs ${quiet}`}
                title={typeof file.sha256 === 'string' ? file.sha256 : undefined}
            >
                {typeof file.sha256 === 'string' ? `${file.sha256.slice(0, 16)}…` : 'none'}
            </td>
        </tr>
    )
}

/** One problem: the file it is about, then the sentence that says what is wrong. */
function Problem({ problem }: { problem: SmokeProblem }) {
    const file = problemFile(problem)
    return (
        <li className="break-words">
            {file != null && <span className="break-all font-mono">{file}</span>}
            {file != null && ': '}
            {problem.text}
        </li>
    )
}

/**
 * What a smoke-level run was checked for, shown where a reference-level card has its
 * metric table: the problems that failed it, then one row per output file with what its
 * check measured, then the worker's notes. Renders nothing for a run that did not get as
 * far as its checks.
 */
export const SmokeChecks: React.FC<{
    /** The result's `smoke` object, as published. */
    smoke: unknown
    /** The published copy of an output file, or null for a name that cannot be linked. */
    hrefFor: (name: string) => string | null
}> = ({ smoke, hrefFor }) => {
    const { files, problems, notes } = readSmoke(smoke)
    if (files.length === 0 && problems.length === 0 && notes.length === 0) return null
    const failed = new Set(problems.map(problemFile))
    return (
        <div className="flex flex-col gap-3">
            {problems.length > 0 && (
                <div className="rounded-lg bg-red-500/[0.08] px-3 py-2 text-sm text-red-400">
                    <span className="font-semibold">Smoke check failed</span>
                    <ul className="mt-1 list-disc pl-5">
                        {problems.map((p, i) => (
                            <Problem key={i} problem={p} />
                        ))}
                    </ul>
                </div>
            )}
            {files.length > 0 && (
                <div>
                    <SectionTitle>Checked files</SectionTitle>
                    <div className="mt-2 overflow-x-auto scrollbar-thin">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className={`text-[11px] uppercase tracking-wider ${quiet}`}>
                                    <th className={th}>File</th>
                                    <th className={th}>Type</th>
                                    <th className={th}>Size</th>
                                    <th className={th}>Measured</th>
                                    <th className={th}>sha256</th>
                                </tr>
                            </thead>
                            <tbody>
                                {files.map((f, i) => (
                                    <FileRow
                                        key={i}
                                        file={f}
                                        failed={failed.has(f.name)}
                                        hrefFor={hrefFor}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {notes.length > 0 && (
                <ul className={`flex flex-col gap-0.5 text-[11px] ${quiet}`}>
                    {notes.map((note, i) => (
                        <li key={i} className="break-words">
                            {note}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
