import React from 'react'
import { FetchError } from './FetchError'
import { TEXT_FILE_MAX_BYTES, useTextFile } from '../src/regression/client'
import { firstDiffAt } from '../src/regression/comparison'
import { normaliseText, wordDiff } from '../src/regression/textDiff'
import type { DiffSegment } from '../src/regression/textDiff'
import type { TextFirstDiff } from '../src/regression/types'
import { formatBytes } from '../utils/format'

// The text on this page is model output. It only ever goes in as React text children,
// which React escapes: never as HTML, and never into an attribute that is read as a URL.

const note = 'text-[11px] text-ash-500 dark:text-smoke-800'
const link = 'text-sapphire-700 dark:text-electric hover:underline'
// `relative` makes the box the offset parent of its marks, so the first one can be scrolled to.
const box =
    'relative max-h-[28rem] overflow-auto scrollbar-thin whitespace-pre-wrap break-words rounded-lg border border-smoke-300 dark:border-charcoal-400/60 bg-smoke-100 dark:bg-charcoal-800 p-3 font-mono text-xs leading-relaxed text-charcoal-800 dark:text-smoke-200'

type Side = 'ref' | 'cand'

const MARK: Record<Side, string> = {
    ref: 'rounded-sm bg-red-500/20 text-red-700 no-underline dark:text-red-300',
    cand: 'rounded-sm bg-emerald-500/20 text-emerald-700 no-underline dark:text-emerald-300',
}
const FIRST_MARK: Record<Side, string> = { ref: 'ring-1 ring-red-400', cand: 'ring-1 ring-emerald-400' }

const words = (n: number) => `${n} ${n === 1 ? 'word' : 'words'}`

function PlainText({ text, label }: { text: string; label: string }) {
    if (text === '') return <p className={note}>The file is empty.</p>
    return (
        // Focusable, so a box that scrolls can be scrolled from the keyboard.
        <pre role="group" tabIndex={0} aria-label={label} className={box}>
            {text}
        </pre>
    )
}

/**
 * One side of a diff. Words the other side lacks are marked; the mark at the first
 * difference gets an outline, and the box opens scrolled to it.
 */
function MarkedText({
    segments,
    first,
    side,
    label,
}: {
    segments: DiffSegment[]
    /** Segment where the sides first differ; the number of segments when this side ends there. */
    first: number
    side: Side
    label: string
}) {
    const boxRef = React.useRef<HTMLPreElement>(null)
    // Only the box is scrolled, never the page: the page may be holding a #wf-<id> card in place.
    React.useEffect(() => {
        const el = boxRef.current
        if (!el || first < 0) return
        const mark = el.querySelector<HTMLElement>('[data-first]')
        el.scrollTop = mark ? Math.max(0, mark.offsetTop - el.clientHeight / 3) : el.scrollHeight
    }, [segments, first])
    const Mark = side === 'ref' ? 'del' : 'ins'
    return (
        <pre ref={boxRef} role="group" tabIndex={0} aria-label={label} className={box}>
            {segments.length === 0 && <span className="text-ash-500 dark:text-smoke-800">(empty)</span>}
            {segments.map((s, i) => {
                const anchor = i === first ? { 'data-first': '' } : null
                return s.changed ? (
                    <Mark key={i} {...anchor} className={`${MARK[side]} ${anchor ? FIRST_MARK[side] : ''}`}>
                        {s.text}
                    </Mark>
                ) : (
                    <span key={i} {...anchor}>
                        {s.text}
                    </span>
                )
            })}
        </pre>
    )
}

/** The golden's text beside this commit's, stacked on a phone. */
function SideBySide({
    reference,
    candidate,
    referenceUrl,
    goldenTag,
    at,
}: {
    reference: string
    candidate: string
    referenceUrl: string
    goldenTag: string
    /** "line 3, col 14" as the worker reported it, when the first difference is in this file. */
    at: string | null
}) {
    // Null over the size cap: the two texts are then shown without marks.
    const diff = React.useMemo(() => wordDiff(reference, candidate), [reference, candidate])
    const refLabel = `golden ${goldenTag}`
    return (
        <>
            <p className={`mb-2 ${note}`}>
                {at && <>First difference at {at}. </>}
                {diff == null
                    ? 'These texts are too long to mark word by word, so they are shown as they are.'
                    : diff.removed + diff.added === 0
                    ? 'The words are the same. Only spacing or line breaks differ.'
                    : 'Words only the golden has are marked red, words only this commit has are marked green.'}
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="min-w-0">
                    <div className={`mb-1 ${note}`}>
                        <span className="font-semibold">{refLabel}</span>
                        {diff != null && diff.removed > 0 && <> · {words(diff.removed)} removed</>}
                        {' · '}
                        <a href={referenceUrl} target="_blank" rel="noopener noreferrer" className={link}>
                            open raw
                        </a>
                    </div>
                    {diff ? (
                        <MarkedText segments={diff.ref} first={diff.refFirst} side="ref" label={refLabel} />
                    ) : (
                        <PlainText text={reference} label={refLabel} />
                    )}
                </div>
                <div className="min-w-0">
                    <div className={`mb-1 ${note}`}>
                        <span className="font-semibold">this commit</span>
                        {diff != null && diff.added > 0 && <> · {words(diff.added)} added</>}
                    </div>
                    {diff ? (
                        <MarkedText segments={diff.cand} first={diff.candFirst} side="cand" label="this commit" />
                    ) : (
                        <PlainText text={candidate} label="this commit" />
                    )}
                </div>
            </div>
        </>
    )
}

/**
 * One text file a run saved. Shown alone when there is nothing to set it against (no
 * golden yet, or it matches the golden), else beside the golden's copy with the changed
 * words marked. A file over the size cap is only linked.
 */
export const TextOutputDiff: React.FC<{
    filename: string
    bytes?: number
    sha256?: string
    /** The run's copy of the file. */
    url: string
    /** The golden's copy, when the comparison says the text differs; null shows the text alone. */
    referenceUrl: string | null
    goldenTag: string | null
    /** Where the worker found the first difference among the run's text files. */
    firstDiff?: TextFirstDiff | null
}> = ({ filename, bytes, sha256, url, referenceUrl, goldenTag, firstDiff }) => {
    const oversize = bytes != null && bytes > TEXT_FILE_MAX_BYTES
    const candidate = useTextFile(url, !oversize)
    const loaded = candidate.data != null && !candidate.data.tooLarge
    // The reference is only asked for once there is a text to set it against.
    const reference = useTextFile(referenceUrl, loaded)
    const text = candidate.data?.text != null ? normaliseText(candidate.data.text) : null
    const refText = reference.data?.text != null ? normaliseText(reference.data.text) : null
    const tag = goldenTag ?? '—'
    // The worker names the first file that differs; its position belongs to that file only.
    const at = firstDiff?.file == null || firstDiff.file === filename ? firstDiffAt(firstDiff) : null

    let body: React.ReactNode
    if (oversize || candidate.data?.tooLarge) {
        body = <p className={note}>Too large to show here. Open the raw file.</p>
    } else if (candidate.isError) {
        body = (
            <FetchError
                what="the generated text"
                error={candidate.error}
                busy={candidate.isFetching}
                onRetry={() => candidate.refetch()}
                className=""
            />
        )
    } else if (candidate.isPending) {
        body = <p className={note}>Loading the text…</p>
    } else if (text == null) {
        body = <p className={note}>This file is not published.</p>
    } else if (referenceUrl != null && refText != null && refText !== text) {
        body = (
            <SideBySide
                reference={refText}
                candidate={text}
                referenceUrl={referenceUrl}
                goldenTag={tag}
                at={at}
            />
        )
    } else {
        body = (
            <>
                <PlainText text={text} label={filename} />
                {referenceUrl != null &&
                    (reference.isError ? (
                        <FetchError
                            what="the reference text"
                            error={reference.error}
                            busy={reference.isFetching}
                            onRetry={() => reference.refetch()}
                            className="mt-2"
                        />
                    ) : (
                        <p className={`mt-1 ${note}`}>
                            {reference.isPending ? (
                                'Loading the reference text…'
                            ) : reference.data == null ? (
                                <>
                                    No reference text published for golden <span className="font-mono">{tag}</span>.
                                </>
                            ) : reference.data.tooLarge ? (
                                <>
                                    The reference text of golden <span className="font-mono">{tag}</span> is too
                                    large to show here.{' '}
                                    <a href={referenceUrl} target="_blank" rel="noopener noreferrer" className={link}>
                                        Open the raw file
                                    </a>
                                    .
                                </>
                            ) : (
                                <>
                                    This file is the same as in golden <span className="font-mono">{tag}</span>.
                                </>
                            )}
                        </p>
                    ))}
            </>
        )
    }

    return (
        <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-baseline gap-x-2 text-xs">
                <span className="break-all font-mono text-charcoal-800 dark:text-smoke-200">{filename}</span>
                <span className={note}>
                    {bytes != null && <>{formatBytes(bytes)} · </>}
                    {sha256 && <>sha256 {sha256.slice(0, 16)}… · </>}
                    <a href={url} target="_blank" rel="noopener noreferrer" className={link}>
                        open raw
                    </a>
                </span>
            </div>
            {body}
        </div>
    )
}
