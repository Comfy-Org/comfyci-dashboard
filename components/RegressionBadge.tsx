import { WorkflowStatusButton } from './StatusButton'
import type { RegressionVerdict } from '../src/regression/types'

const VERDICT_META: Record<RegressionVerdict, { text: string; status: string }> = {
    pass: { text: 'Pass', status: 'green' },
    fail: { text: 'Regression', status: 'red' },
    execution_error: { text: 'Execution Error', status: 'red' },
    infra_error: { text: 'Infra Error', status: 'orange' },
    no_baseline: { text: 'No Baseline', status: 'default' },
}

export const RegressionBadge: React.FC<{ verdict: RegressionVerdict; onClick?: () => void }> = ({
    verdict,
    onClick,
}) => {
    const meta = VERDICT_META[verdict] ?? { text: verdict, status: 'default' }
    return <WorkflowStatusButton text={meta.text} status={meta.status} onClick={onClick} />
}
