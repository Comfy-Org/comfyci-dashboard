import { Spinner } from "flowbite-react";
import { useGetWorkflowResult, WorkflowRunStatus } from "../../src/api/generated";
import { useRouter } from "next/router";
import { toast } from 'react-toastify';
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { FiExternalLink } from "react-icons/fi";
import { WorkflowStatusButton } from "../../components/StatusButton";
import { Surface, SectionTitle } from "../../components/Surface";
import UsageGraph from "../../components/UsageGraph";
import LongTextPreview from "../../components/LongTextPreview";
import { calculateTimeDifference } from "..";

const Row: React.FC<React.PropsWithChildren<{ label: string }>> = ({ label, children }) => (
    <div className="flex flex-col gap-1 border-b border-smoke-200 dark:border-charcoal-400/40 py-3 sm:flex-row sm:items-start sm:gap-4 last:border-0">
        <dt className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wider text-ash-500 dark:text-smoke-800">
            {label}
        </dt>
        <dd className="flex-1 text-sm text-charcoal-800 dark:text-smoke-200">{children}</dd>
    </div>
)

const Stat: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
    <div className="rounded-xl border border-smoke-300 dark:border-charcoal-400/60 bg-smoke-100/60 dark:bg-charcoal-700/40 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-ash-500 dark:text-smoke-800">
            {label}
        </div>
        <div className="mt-1 text-sm font-medium text-charcoal-800 dark:text-smoke-100">
            {value ?? '—'}
        </div>
    </div>
)

const linkClass = "inline-flex items-center gap-1 text-sapphire-700 dark:text-plum-300 hover:text-sapphire-700 dark:hover:text-electric hover:underline"

function WorkflowResultDetail() {
    const router = useRouter();
    const workflowId = typeof router.query.id === 'string' ? router.query.id : "";

    const { data: workflowResult, isLoading, error } = useGetWorkflowResult(workflowId)

    React.useEffect(() => {
        if (isLoading) {
            return
        }
        if (error != null)
            toast.error('An error occured. Please try again later.')

    }, [error, isLoading])

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-24">
                <Spinner size="xl" />
            </div>
        )
    }

    if (workflowResult === undefined) {
        return null;
    }

    const ms = workflowResult?.machine_stats

    return (
        <div className="space-y-6 pt-8">
            <Link href="/" className="inline-flex items-center gap-1 text-sm text-ash-500 dark:text-smoke-700 hover:text-charcoal-800 dark:hover:text-electric">
                ← Back to results
            </Link>

            {/* Hero */}
            <Surface className="brand-aura overflow-hidden">
                <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
                    {workflowResult?.storage_file?.public_url && (
                        <Image
                            src={workflowResult.storage_file.public_url}
                            alt={workflowResult.workflow_name || "Job result"}
                            width={200}
                            height={200}
                            className="h-48 w-48 shrink-0 rounded-xl border border-smoke-300 dark:border-charcoal-400/60 object-cover"
                        />
                    )}
                    <div className="min-w-0 flex-1">
                        <SectionTitle>Workflow</SectionTitle>
                        <h1 className="mt-1 break-words text-2xl font-extrabold tracking-tight text-charcoal-800 dark:text-white">
                            {workflowResult?.workflow_name}
                        </h1>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                            <WorkflowStatusButton
                                text={StatusToHumanText(workflowResult?.status)}
                                status={StatusToColor(workflowResult.status)}
                            />
                            <span className="text-sm text-ash-500 dark:text-smoke-800">
                                {workflowResult.operating_system} · py{workflowResult?.python_version}
                            </span>
                            <span className="font-mono text-sm tabular-nums text-charcoal-800 dark:text-smoke-200">
                                {workflowResult.end_time && workflowResult.start_time
                                    ? calculateTimeDifference(workflowResult.end_time, workflowResult.start_time)
                                    : 'unknown'}
                            </span>
                        </div>
                    </div>
                </div>
            </Surface>

            {/* Job & commit details */}
            <Surface className="p-6">
                <SectionTitle className="mb-2">Job & Commit Details</SectionTitle>
                <dl>
                    <Row label="Workflow">{workflowResult?.workflow_name}</Row>
                    <Row label="Commit">
                        <a
                            className={linkClass}
                            target="_blank"
                            rel="noopener noreferrer"
                            href={`https://github.com/${workflowResult.git_repo}/commit/${workflowResult.commit_hash}`}
                        >
                            {workflowResult.commit_time !== undefined
                                ? new Date(workflowResult.commit_time * 1000).toLocaleString()
                                : workflowResult.commit_time}
                        </a>
                        <span className="text-ash-500 dark:text-smoke-800"> — {workflowResult?.commit_message}</span>
                    </Row>
                    <Row label="Repository">
                        <a
                            className={linkClass}
                            target="_blank"
                            rel="noopener noreferrer"
                            href={`https://github.com/${workflowResult.git_repo}`}
                        >
                            {workflowResult?.git_repo}
                        </a>
                        <span className="text-ash-500 dark:text-smoke-800"> on branch {workflowResult.branch_name}</span>
                        {workflowResult?.pr_number ? (
                            <span className="text-ash-500 dark:text-smoke-800">
                                {' '}(PR{' '}
                                <a
                                    className={linkClass}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    href={`https://github.com/${workflowResult.git_repo}/pull/${workflowResult.pr_number}`}
                                >
                                    #{workflowResult.pr_number}
                                </a>{' '}
                                by {workflowResult?.author || "Unknown"})
                            </span>
                        ) : ''}
                    </Row>
                    <Row label="Triggered By">{workflowResult?.job_trigger_user}</Row>
                    <Row label="Run Time">
                        {workflowResult.end_time && workflowResult.start_time
                            ? calculateTimeDifference(workflowResult.end_time, workflowResult.start_time)
                            : "unknown"}
                    </Row>
                    <Row label="Versions">
                        Python {workflowResult?.python_version}, Torch {workflowResult?.pytorch_version}, CUDA {workflowResult?.cuda_version}
                    </Row>
                    <Row label="Run Info">
                        <a
                            className={linkClass}
                            target="_blank"
                            rel="noopener noreferrer"
                            href={`https://github.com/${workflowResult.git_repo}/actions/runs/${workflowResult.action_run_id}`}
                        >
                            Github Action Run <FiExternalLink className="h-3 w-3" />
                        </a>
                        <span className="text-ash-500 dark:text-smoke-800"> · Job: {workflowResult?.action_job_id} · Run: {workflowResult?.action_run_id}</span>
                    </Row>
                </dl>
            </Surface>

            {/* Machine stats */}
            <Surface className="p-6">
                <SectionTitle className="mb-3">Machine Stats</SectionTitle>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    <Stat label="Machine" value={ms?.machine_name} />
                    <Stat label="OS Version" value={ms?.os_version} />
                    <Stat label="GPU Type" value={ms?.gpu_type} />
                    <Stat label="CPU Capacity" value={ms?.cpu_capacity} />
                    <Stat label="Initial CPU" value={ms?.initial_cpu} />
                    <Stat label="Memory Capacity" value={ms?.memory_capacity} />
                    <Stat label="Initial RAM" value={ms?.initial_ram} />
                    <Stat label="Disk Capacity" value={ms?.disk_capacity} />
                    <Stat label="Initial Disk" value={ms?.initial_disk} />
                    <Stat label="Avg VRAM" value={workflowResult?.avg_vram != null ? `${workflowResult.avg_vram} MB` : undefined} />
                    <Stat label="Peak VRAM" value={workflowResult?.peak_vram != null ? `${workflowResult.peak_vram} MB` : undefined} />
                </div>
                <div className="mt-4">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-ash-500 dark:text-smoke-800">
                        Pip Freeze
                    </div>
                    <LongTextPreview text={ms?.pip_freeze || ''} />
                </div>
            </Surface>

            {/* Usage graph */}
            <Surface className="p-6">
                <SectionTitle className="mb-3">Resource Usage Over Time</SectionTitle>
                <div className="w-full">
                    <UsageGraph data={ms?.vram_time_series || {}} />
                </div>
            </Surface>
        </div>
    );
}

export function StatusToColor(status?: WorkflowRunStatus) {
    if (status === undefined) {
        return 'gray';
    }
    switch (status) {
        case WorkflowRunStatus.WorkflowRunStatusStarted:
            return 'orange';
        case WorkflowRunStatus.WorkflowRunStatusFailed:
            return 'red';
        case WorkflowRunStatus.WorkflowRunStatusCompleted:
            return 'green';
        default:
            return 'gray';
    }
}

export function StatusToHumanText(status?: WorkflowRunStatus) {
    if (status === undefined) {
        return 'Unknown';
    }
    switch (status) {
        case WorkflowRunStatus.WorkflowRunStatusStarted:
            return 'In Progress';
        case WorkflowRunStatus.WorkflowRunStatusFailed:
            return 'Failed';
        case WorkflowRunStatus.WorkflowRunStatusCompleted:
            return 'Success';
        default:
            return 'Unknown';
    }
}

export default WorkflowResultDetail;
