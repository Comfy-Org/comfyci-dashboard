import React from 'react'
import { CiMainTable } from '../../components/frontend/CiMainTable'
import { CustomNodesSection } from '../../components/frontend/CustomNodesSection'
import { FreshnessBanner } from '../../components/frontend/FreshnessBanner'
import { FrontendKpis } from '../../components/frontend/FrontendKpis'
import { PerfSection } from '../../components/frontend/PerfSection'
import { useFrontendCi, useFrontendGate, useFrontendPerf } from '../../src/frontend/client'

/** A head's updated_ts for the banner: unknown while loading or failed, null when not published. */
const freshness = (q: {
    isPending: boolean
    isError: boolean
    data: { updated_ts: number } | null | undefined
}): number | null | undefined => (q.isPending || q.isError ? undefined : q.data ? q.data.updated_ts : null)

export default function FrontendPage() {
    const ci = useFrontendCi()
    const perf = useFrontendPerf()
    const gate = useFrontendGate()

    return (
        <div className="pt-8">
            <div className="mb-6">
                <h1 className="text-2xl font-extrabold tracking-tight text-charcoal-800 dark:text-white">
                    Frontend
                </h1>
                <p className="mt-1 text-sm text-ash-500 dark:text-smoke-800">
                    ComfyUI_frontend on main: every CI workflow per commit, perf baselines per scenario judged by
                    the frontend repo{"'"}s own regression rule, and the daily custom-nodes gate against the pinned
                    ComfyUI core. Read-only, from static files the worker repo publishes twice an hour.
                </p>
            </div>

            <FrontendKpis ci={ci} perf={perf} gate={gate} />
            <FreshnessBanner
                heads={[
                    { label: 'CI', ts: freshness(ci) },
                    { label: 'perf', ts: freshness(perf) },
                    { label: 'gate', ts: freshness(gate) },
                ]}
            />
            <CiMainTable query={ci} />
            <PerfSection query={perf} />
            <CustomNodesSection query={gate} />
        </div>
    )
}
