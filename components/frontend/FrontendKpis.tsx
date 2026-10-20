import React from 'react'
import { StatCard } from '../StatsDashboard'
import { cellState } from '../WorkflowDots'
import type { PackLanesState, useFrontendCi, useFrontendGate, useFrontendPerf } from '../../src/frontend/client'
import { coreCommitUrl, frontendCommitUrl } from '../../src/frontend/client'
import { cleanCounts, isRed, proofCounts, streakPhrase } from '../../src/frontend/gate'
import { newestPackRun, packNames, packTone } from '../../src/frontend/packs'
import type { PackTone } from '../../src/frontend/packs'
import { latestSummary, shortPerfSha } from '../../src/frontend/perf'
import { formatRelative } from '../../utils/time'

const NOT_RUN = 'publisher has not run yet'
const FAILED = 'could not load'
const NEUTRAL = 'text-charcoal-400 dark:text-smoke-500'
const GREEN = 'text-emerald-600 dark:text-emerald-400'
const RED = 'text-red-600 dark:text-red-400'
const AMBER = 'text-amber-600 dark:text-amber-400'

const ShaLink: React.FC<{ href: string | null; sha: string }> = ({ href, sha }) =>
    href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="font-mono hover:underline">
            {sha.slice(0, 7)}
        </a>
    ) : (
        <span className="font-mono">{sha.slice(0, 7)}</span>
    )

/** Sub line that truncates with the full text on hover. */
const Sub: React.FC<{ title?: string; children: React.ReactNode }> = ({ title, children }) => (
    <span className="block truncate" title={title}>
        {children}
    </span>
)

const OVERALL_TEXT = {
    success: 'all core suites green',
    failure: 'core suite failing',
    pending: 'core suites still running',
    cancelled: 'a core suite was cancelled',
}

function MainCard({ query }: { query: ReturnType<typeof useFrontendCi> }) {
    const label = 'Main at HEAD'
    const dot = 'bg-sapphire-700 dark:bg-electric'
    if (query.isPending) return <StatCard label={label} value="…" dotClass={dot} valueClass={NEUTRAL} />
    const ci = query.data
    const latest = ci?.entries[0]
    if (!ci || !latest) {
        const sub = query.isError ? FAILED : ci ? 'no commits indexed yet' : NOT_RUN
        return <StatCard label={label} value="—" sub={sub} dotClass={dot} valueClass={NEUTRAL} />
    }
    const core = ci.columns.filter((c) => c.group === 'core')
    const cells = core.map((col) => ({ col, cell: latest.w[col.id] }))
    const passing = cells.filter((x) => x.cell?.c === 'success').length
    const failing = cells.filter((x) => isRed(x.cell?.c)).map((x) => x.col.label)
    const running = cells.filter((x) => x.cell && x.cell.c == null).length
    const tone =
        latest.o === 'success' ? GREEN : latest.o === 'failure' ? RED : latest.o === 'pending' ? AMBER : NEUTRAL
    const text = OVERALL_TEXT[latest.o] ?? latest.o
    const extra = [
        failing.length ? `failing: ${failing.join(', ')}` : null,
        running ? `${running} running` : null,
    ]
        .filter(Boolean)
        .join(' · ')
    return (
        <StatCard
            label={label}
            value={`${passing}/${core.length}`}
            sub={
                <Sub title={`${latest.c} · ${text}${extra ? ` · ${extra}` : ''}`}>
                    <ShaLink href={frontendCommitUrl(latest.c)} sha={latest.c} /> · {text} ·{' '}
                    {formatRelative(latest.ct)}
                    {extra ? ` · ${extra}` : ''}
                </Sub>
            }
            dotClass={dot}
            valueClass={tone}
        />
    )
}

function PerfCard({ query }: { query: ReturnType<typeof useFrontendPerf> }) {
    const label = 'Perf regressions'
    const dot = 'bg-plum-600 dark:bg-plum-300'
    if (query.isPending) return <StatCard label={label} value="…" dotClass={dot} valueClass={NEUTRAL} />
    const perf = query.data
    if (!perf || !perf.latest) {
        const sub = query.isError ? FAILED : perf ? 'no baseline compared yet' : NOT_RUN
        return <StatCard label={label} value="—" sub={sub} dotClass={dot} valueClass={NEUTRAL} />
    }
    const sum = latestSummary(perf.latest, perf.scenarios)
    const parts = [
        sum.regressions.length ? sum.regressions.join(', ') : 'none at the latest baseline',
        sum.noisy.length ? `${sum.noisy.length} noisy: ${sum.noisy.join(', ')}` : null,
    ]
        .filter(Boolean)
        .join(' · ')
    return (
        <StatCard
            label={label}
            value={sum.regressions.length}
            sub={
                <Sub title={`${perf.latest.c ?? perf.latest.id} · ${parts}`}>
                    <ShaLink href={frontendCommitUrl(perf.latest.c)} sha={shortPerfSha(perf.latest)} /> ·{' '}
                    {formatRelative(perf.latest.t)} · {parts}
                </Sub>
            }
            dotClass={dot}
            valueClass={sum.regressions.length ? RED : NEUTRAL}
        />
    )
}

function GateCard({ query }: { query: ReturnType<typeof useFrontendGate> }) {
    const label = 'Custom-nodes gate'
    const dot = 'bg-emerald-600 dark:bg-emerald-400'
    if (query.isPending) return <StatCard label={label} value="…" dotClass={dot} valueClass={NEUTRAL} />
    const gate = query.data
    // The daily schedule is the gate; a dispatch run tests another ref and does not count.
    const run = gate?.runs.find((r) => r.ev === 'schedule') ?? gate?.runs[0]
    if (!gate || !run) {
        const sub = query.isError ? FAILED : gate ? 'no gate runs recorded yet' : NOT_RUN
        return <StatCard label={label} value="—" sub={sub} dotClass={dot} valueClass={NEUTRAL} />
    }
    const clean = cleanCounts(run)
    const proofs = proofCounts(run)
    const tone = clean.fail ? RED : clean.pending ? AMBER : clean.total && clean.pass === clean.total ? GREEN : NEUTRAL
    const pinHref = coreCommitUrl(gate.pin)
    const streak = gate.streak ? streakPhrase(gate.streak) : null
    return (
        <StatCard
            label={label}
            value={clean.total ? `${clean.pass}/${clean.total}` : '—'}
            sub={
                <Sub title={`${streak ? `${streak} · ` : ''}proofs held ${proofs.held}/${proofs.total}`}>
                    clean shards passing · proofs held {proofs.held}/{proofs.total}
                    {streak && (
                        <>
                            {' · '}
                            <span className={gate.streak?.state === 'fail' ? RED : undefined}>{streak}</span>
                        </>
                    )}
                    {gate.pin && (
                        <>
                            {' · pin '}
                            {pinHref ? (
                                <a href={pinHref} target="_blank" rel="noopener noreferrer" className="font-mono hover:underline">
                                    {gate.pin.slice(0, 8)}
                                </a>
                            ) : (
                                <span className="font-mono">{gate.pin.slice(0, 8)}</span>
                            )}
                        </>
                    )}
                </Sub>
            }
            dotClass={dot}
            valueClass={tone}
        />
    )
}

/** Value colour per pack tone, the same tone the section's status line shows. */
const TONE_CLASS: Record<PackTone, string> = { red: RED, amber: AMBER, green: GREEN }

/**
 * The pack workflows of the core GPU regression at their newest run: read from the
 * regression lane index, so it does not depend on the frontend publisher's files.
 */
function PacksCard({ packs }: { packs: PackLanesState }) {
    const label = 'Packs on GPU'
    const dot = 'bg-sky-600 dark:bg-sky-400'
    if (packs.pending) return <StatCard label={label} value="…" dotClass={dot} valueClass={NEUTRAL} />
    const newest = newestPackRun(packs.lanes)
    if (!newest) {
        const sub = packs.failure ? FAILED : 'no GPU pack runs published yet'
        return <StatCard label={label} value="—" sub={sub} dotClass={dot} valueClass={NEUTRAL} />
    }
    const rows = packs.lanes.flatMap((lane) => lane.workflows.map((pw) => ({ lane, pw })))
    const workflows = rows.map(({ pw }) => pw)
    const states = rows.map(({ lane, pw }) => cellState(pw.cell, pw.wf, lane.info.goldens))
    const passing = states.filter((s) => s.verdict === 'pass').length
    const names = packNames(workflows).join(', ')
    const when = formatRelative(newest.entry.t)
    // Commit and age first, like the other cards: the pack names are long and truncate.
    return (
        <StatCard
            label={label}
            value={`${passing}/${rows.length}`}
            sub={
                <Sub title={`core ${newest.entry.c} · ${when} · ${names}`}>
                    core <ShaLink href={coreCommitUrl(newest.entry.c)} sha={newest.entry.c} /> · {when} · {names}
                </Sub>
            }
            dotClass={dot}
            valueClass={TONE_CLASS[packTone(states, workflows)]}
        />
    )
}

/**
 * The four headline numbers: main at HEAD, perf at the latest baseline, the custom-nodes
 * gate, and the pack workflows on the GPU regression.
 */
export const FrontendKpis: React.FC<{
    ci: ReturnType<typeof useFrontendCi>
    perf: ReturnType<typeof useFrontendPerf>
    gate: ReturnType<typeof useFrontendGate>
    packs: PackLanesState
}> = ({ ci, perf, gate, packs }) => (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MainCard query={ci} />
        <PerfCard query={perf} />
        <GateCard query={gate} />
        <PacksCard packs={packs} />
    </div>
)
