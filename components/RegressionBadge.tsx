import { WorkflowStatusButton } from './StatusButton'
import type { DriftKind, RegressionVerdict } from '../src/regression/types'

// 'accepted' exists only on the client: a failing output whose sha matches the lane's
// current golden means the golden was re-blessed to it, so it is shown amber, not red.
export type BadgeVerdict = RegressionVerdict | 'accepted'

const VERDICT_META: Record<BadgeVerdict, { text: string; status: string; title: string }> = {
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
    text: 'Inherited',
    status: 'muted',
    title: 'Still failing, but bit-identical to the previous (also failing) run',
}

/** What a badge shows for one workflow result once client-side states are folded in. */
export interface DisplayState {
    verdict: BadgeVerdict
    inherited: boolean
}

export const RegressionBadge: React.FC<{
    verdict: BadgeVerdict
    /** Failing but bit-identical to the previous failing run: nothing changed at this commit. */
    inherited?: boolean
    onClick?: () => void
}> = ({ verdict, inherited, onClick }) => {
    const meta =
        (inherited && verdict === 'fail' ? INHERITED_META : VERDICT_META[verdict]) ??
        { text: verdict, status: 'default', title: verdict }
    return (
        <WorkflowStatusButton text={meta.text} status={meta.status} title={meta.title} onClick={onClick} />
    )
}

/** Display state for one workflow result, folding in client-derived accepted and inherited drift. */
export function displayVerdict(
    verdict: RegressionVerdict,
    outputSha: string | null | undefined,
    goldenSha: string | null | undefined,
    drift: DriftKind | null | undefined
): DisplayState {
    if (verdict === 'fail' && outputSha && goldenSha && outputSha === goldenSha) {
        return { verdict: 'accepted', inherited: false }
    }
    return { verdict, inherited: verdict === 'fail' && drift === 'inherited' }
}

/** A failure that started at this run: a fresh regression or an execution error. */
export const changedHere = (s: DisplayState) =>
    s.verdict === 'execution_error' || (s.verdict === 'fail' && !s.inherited)

/**
 * Overall badge for one run. The worker's overall is just pass/fail; the per-workflow
 * display states soften it so a run that only inherits an older regression, or whose
 * drift was accepted, does not shout as loudly as the run where the drift started.
 * `infra` marks a run with an infrastructure failure in it.
 */
export function overallDisplay(
    overall: 'pass' | 'fail',
    states: DisplayState[],
    infra: boolean
): DisplayState {
    if (overall === 'pass') return { verdict: 'pass', inherited: false }
    if (states.some(changedHere)) return { verdict: 'fail', inherited: false }
    if (states.some((s) => s.inherited)) return { verdict: 'fail', inherited: true }
    if (states.some((s) => s.verdict === 'accepted')) return { verdict: 'accepted', inherited: false }
    if (infra) return { verdict: 'infra_error', inherited: false }
    return { verdict: 'fail', inherited: false }
}
