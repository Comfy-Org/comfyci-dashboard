import { StatusPill, WorkflowStatusButton } from './StatusButton'
import type { CheckLevel, DriftKind, RegressionVerdict } from '../src/regression/types'

// 'accepted' exists only on the client: a failing output whose sha matches the lane's
// current golden means the golden was re-blessed to it, so it is shown amber, not red.
export type BadgeVerdict = RegressionVerdict | 'accepted'

interface BadgeMeta {
    text: string
    status: string
    title: string
}

const VERDICT_META: Record<BadgeVerdict, BadgeMeta> = {
    pass: { text: 'Pass', status: 'green', title: 'Matches the golden within thresholds' },
    fail: { text: 'Regression', status: 'red', title: 'Differs from the golden beyond thresholds' },
    execution_error: { text: 'Execution Error', status: 'red', title: 'The workflow failed to execute' },
    infra_error: {
        text: 'Infra Error',
        status: 'orange',
        title: 'Worker or infrastructure failure, not a ComfyUI regression',
    },
    no_baseline: { text: 'No Baseline', status: 'default', title: 'No blessed golden for this workflow yet' },
    accepted: {
        text: 'Accepted drift',
        status: 'amber',
        title: 'Output matches the current golden: this drift was re-blessed',
    },
}

const INHERITED_META = {
    text: 'Inherited drift',
    status: 'muted',
    title: 'Still failing, but bit-identical to the previous (also failing) run',
}

// A smoke-level workflow is only checked to finish and to write usable files, so its
// pass and its failure get words of their own. Its other verdicts read as above.
const SMOKE_PASS_META = {
    text: 'Smoke pass',
    status: 'green',
    title:
        'The workflow finished and its output passed the smoke checks. ' +
        'Not compared with a reference',
}

const SMOKE_FAIL_META = {
    text: 'Smoke check failed',
    status: 'red',
    title: 'The workflow finished, and an output is missing, unreadable, blank or the wrong size',
}

const SMOKE_INHERITED_META = {
    text: 'Smoke check failed (inherited)',
    status: 'muted',
    title: 'Still failing its smoke checks: the result before this one had failed too',
}

/** What a badge shows for one workflow result once client-side states are folded in. */
export interface DisplayState {
    verdict: BadgeVerdict
    inherited: boolean
    /** Set for a smoke-level result: it was checked, not compared with a golden. */
    level?: CheckLevel
}

/** Text, status colour and hover explanation for a display state; shared by badges and dots. */
export function badgeMeta({ verdict, inherited, level }: DisplayState): BadgeMeta {
    if (level === 'smoke' && verdict === 'pass') return SMOKE_PASS_META
    if (level === 'smoke' && verdict === 'fail') {
        return inherited ? SMOKE_INHERITED_META : SMOKE_FAIL_META
    }
    return (
        (inherited && verdict === 'fail' ? INHERITED_META : VERDICT_META[verdict]) ?? {
            text: verdict,
            status: 'default',
            title: verdict,
        }
    )
}

export const RegressionBadge: React.FC<{
    /** The result to word: its verdict, whether it is inherited, and its check level. */
    state: DisplayState
    onClick?: () => void
    /** A non-interactive span with a native title, for a badge inside a link. */
    plain?: boolean
}> = ({ state, onClick, plain = false }) => {
    const meta = badgeMeta(state)
    if (plain) return <StatusPill text={meta.text} status={meta.status} title={meta.title} />
    return (
        <WorkflowStatusButton text={meta.text} status={meta.status} title={meta.title} onClick={onClick} />
    )
}

/** Display state for one workflow result, folding in client-derived accepted and inherited drift. */
export function displayVerdict(
    verdict: RegressionVerdict,
    outputSha: string | null | undefined,
    goldenSha: string | null | undefined,
    drift: DriftKind | null | undefined,
    level?: CheckLevel | null
): DisplayState {
    // A smoke-level result has no golden. A workflow that moved to smoke level leaves its
    // old golden behind, so a sha that equals it must not read as accepted drift.
    if (level === 'smoke') {
        return { verdict, inherited: verdict === 'fail' && drift === 'inherited', level }
    }
    if (verdict === 'fail' && outputSha && goldenSha && outputSha === goldenSha) {
        return { verdict: 'accepted', inherited: false }
    }
    return { verdict, inherited: verdict === 'fail' && drift === 'inherited' }
}

/** A failure that started at this run: a fresh regression or an execution error. */
export const changedHere = (s: DisplayState) =>
    s.verdict === 'execution_error' || (s.verdict === 'fail' && !s.inherited)

// The run's badge takes the smoke words only when smoke-level results alone decide it.
const smokeOnly = (states: DisplayState[]): { level?: CheckLevel } =>
    states.length > 0 && states.every((s) => s.level === 'smoke' && s.verdict !== 'execution_error')
        ? { level: 'smoke' }
        : {}

/**
 * Overall badge for one run. The worker's overall is just pass/fail; the per-workflow
 * display states soften it so a run that only inherits an older regression, or whose
 * drift was accepted, does not shout as loudly as the run where the drift started.
 * `infra` marks a run with an infrastructure failure in it. A run of smoke-level
 * workflows only reads "Smoke pass"; a red run reads "Smoke check failed" when no
 * reference-level result and no execution error is among the failures that decide it.
 */
export function overallDisplay(
    overall: 'pass' | 'fail',
    states: DisplayState[],
    infra: boolean
): DisplayState {
    if (overall === 'pass') return { verdict: 'pass', inherited: false, ...smokeOnly(states) }
    const changed = states.filter(changedHere)
    if (changed.length > 0) return { verdict: 'fail', inherited: false, ...smokeOnly(changed) }
    const inherited = states.filter((s) => s.inherited)
    if (inherited.length > 0) return { verdict: 'fail', inherited: true, ...smokeOnly(inherited) }
    if (states.some((s) => s.verdict === 'accepted')) return { verdict: 'accepted', inherited: false }
    if (infra) return { verdict: 'infra_error', inherited: false }
    return { verdict: 'fail', inherited: false }
}
