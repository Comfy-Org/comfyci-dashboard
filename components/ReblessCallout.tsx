import React from 'react'
import type { LaneRef } from '../src/regression/client'
import { isCommitSha, isLaneId, isWorkflowId, shellQuote } from '../src/regression/validate'

const WORKER_REPO = 'Comfy-Org/comfyci-runpod-worker'

function CopyableCommand({ command }: { command: string }) {
    const [copied, setCopied] = React.useState(false)
    const copy = () => {
        if (typeof navigator === 'undefined' || !navigator.clipboard) return
        navigator.clipboard
            .writeText(command)
            .then(() => {
                setCopied(true)
                window.setTimeout(() => setCopied(false), 1500)
            })
            .catch(() => undefined)
    }
    return (
        <div className="relative">
            <pre className="overflow-x-auto scrollbar-thin rounded-lg bg-smoke-200/60 dark:bg-charcoal-800 px-3 py-2 pr-20 font-mono text-[11px] leading-relaxed text-charcoal-800 dark:text-smoke-200">
                {command}
            </pre>
            <button
                type="button"
                onClick={copy}
                className="absolute right-2 top-2 rounded-md border border-smoke-300 dark:border-charcoal-400/60 bg-white dark:bg-charcoal-700 px-2 py-0.5 text-[11px] font-semibold text-charcoal-800 dark:text-smoke-200 hover:border-electric/50 hover:text-electric"
            >
                {copied ? 'Copied' : 'Copy'}
            </button>
        </div>
    )
}

/**
 * How to accept a failing output as the new golden: the worker's golden-baseline
 * workflow regenerates the output from a ref for review, then blesses it on a second run.
 * The commands carry values from the URL and the published results, so they are only
 * offered when every value has the expected shape, and each one goes through shellQuote.
 */
export const ReblessCallout: React.FC<{ workflowId: string; commit: string; lane: LaneRef }> = ({
    workflowId,
    commit,
    lane,
}) => {
    const safe = isCommitSha(commit) && isWorkflowId(workflowId) && isLaneId(lane.id)
    const laneFlag = lane.layout === 2 ? ` -f lane=${shellQuote(lane.id)}` : ''
    const base = `gh workflow run golden-baseline.yml --repo ${WORKER_REPO} -f ref=${shellQuote(commit)} -f workflows=${shellQuote(workflowId)}${laneFlag}`
    return (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3 text-xs">
            <div className="font-semibold text-amber-600 dark:text-amber-400">Is this drift intended?</div>
            <p className="mt-1 text-ash-500 dark:text-smoke-800">
                If the output change is expected, re-bless the golden so later runs compare
                against it. Generate a candidate from this commit first (bless=false), review the
                outputs the run uploads, then bless it with a second run (bless_only=true). Use the
                newest release tag as the ref instead when the baseline should track a release.
            </p>
            {safe && (
                <div className="mt-2 flex flex-col gap-2">
                    <CopyableCommand command={`${base} -f bless=false`} />
                    <CopyableCommand command={`${base} -f bless_only=true`} />
                </div>
            )}
        </div>
    )
}
