import { Spinner, Card, Table, Badge } from "flowbite-react";
import { useGetWorkflowResult, WorkflowRunStatus } from "../../src/api/generated";
import { useRouter } from "next/router";
import { toast } from 'react-toastify';
import React from "react";
import Image from "next/image";
import { WorkflowStatusButton } from "../../components/StatusButton";
import UsageGraph from "../../components/UsageGraph";
import LongTextPreview from "../../components/LongTextPreview";
import { calculateTimeDifference } from "..";

function WorkflowResultDetail() {
    const router = useRouter();
    const workflowId = typeof router.query.id === 'string' ? router.query.id : "";

    const { data: workflowResult, isLoading, error } = useGetWorkflowResult(workflowId)

    if (isLoading) {
        <div className="flex justify-center items-center">
            <Spinner />
        </div>
    }

    React.useEffect(() => {
        if (isLoading) {
            return
        }
        if (error != null)
            toast.error('An error occured. Please try again later.')

    }, [error, isLoading])

    if (workflowResult === undefined) {
        return null;
    }

    return (
        <div className="space-y-6 p-10">
            <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-4">
                <div className="flex flex-col items-center justify-center sm:flex-row gap-2">
                    <div>
                        {workflowResult?.storage_file?.public_url && (
                            <Image
                                src={workflowResult?.storage_file.public_url}
                                alt="Job result"
                                width={256}
                                height={256}
                                className="rounded"
                            />
                        )}
                    </div>
                </div>
            </div>

            <Card>
                <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Job & Commit Details
                </h5>
                <Table hoverable={true}>
                    <Table.Body>
                        <Table.Row>
                            <Table.Cell>Status</Table.Cell>
                            <Table.Cell>
                                <WorkflowStatusButton text={StatusToHumanText(workflowResult?.status)} status={StatusToColor(workflowResult.status)} />
                            </Table.Cell>
                        </Table.Row>
                        <Table.Row>
                            <Table.Cell>Workflow Name</Table.Cell>
                            <Table.Cell>{workflowResult?.workflow_name}</Table.Cell>
                        </Table.Row>
                        <Table.Row>
                            <Table.Cell>Commit</Table.Cell>
                            <Table.Cell><a
                                className="text-blue-500 hover:text-blue-700 underline hover:no-underline "
                                href={`https://github.com/${workflowResult.git_repo}/commit/${workflowResult.commit_hash}`}>
                                {workflowResult.commit_time !== undefined ? new Date(workflowResult.commit_time * 1000).toLocaleString() : workflowResult.commit_time}
                            </a> - {workflowResult?.commit_message}
                            </Table.Cell>
                        </Table.Row>
                        <Table.Row>
                            <Table.Cell>Repository</Table.Cell>
                            <Table.Cell>
                                <a
                                    className="text-blue-500 hover:text-blue-700 underline hover:no-underline "
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    href={`https://github.com/${workflowResult.git_repo}`}
                                >{workflowResult?.git_repo}</a>
                                &nbsp;on branch {workflowResult.branch_name}
                                {workflowResult?.pr_number ? <span>
                                        &nbsp;(PR <a
                                        className="text-blue-500 hover:text-blue-700 underline hover:no-underline "
                                        href={`https://github.com/${workflowResult.git_repo}/pull/${workflowResult.pr_number}`}>
                                            #{workflowResult.pr_number}
                                        </a> by {workflowResult?.author || "Unknown"})
                                    </span>
                                : ''}

                            </Table.Cell>
                        </Table.Row>
                        <Table.Row>
                            <Table.Cell>Triggered By</Table.Cell>
                            <Table.Cell>{workflowResult?.job_trigger_user}</Table.Cell>
                        </Table.Row>
                        <Table.Row>
                            <Table.Cell>Run Time</Table.Cell>
                            <Table.Cell className=' text-lg '>
                                {workflowResult.end_time && workflowResult.start_time ? calculateTimeDifference(workflowResult.end_time, workflowResult.start_time) : "unknown"}
                            </Table.Cell>
                        </Table.Row>
                        <Table.Row>
                            <Table.Cell>Versions</Table.Cell>
                            <Table.Cell>Python {workflowResult?.python_version}, Torch {workflowResult?.pytorch_version}, CUDA {workflowResult?.cuda_version}</Table.Cell>
                        </Table.Row>
                        <Table.Row>
                            <Table.Cell>Run Info</Table.Cell>
                            <Table.Cell><a
                                className="text-blue-500 hover:text-blue-700 underline hover:no-underline "
                                target="_blank"
                                rel="noopener noreferrer"
                                href={`https://github.com/${workflowResult.git_repo}/actions/runs/${workflowResult.action_run_id}`}
                            >
                                Github Action Run
                            </a>, Job: {workflowResult?.action_job_id}, Run: {workflowResult?.action_run_id}</Table.Cell>
                        </Table.Row>
                    </Table.Body>
                </Table>
            </Card>

            <Card className="text-black dark:text-white">
                <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Machine Stats
                </h5>
                <div className="flex flex-wrap">
                    <div className="w-full md:w-1/2 p-2">
                        <div><strong>Machine Name:</strong> {workflowResult?.machine_stats?.machine_name}</div>
                        <div><strong>OS Version:</strong> {workflowResult?.machine_stats?.os_version}</div>
                        <div><strong>CPU Capacity:</strong> {workflowResult?.machine_stats?.cpu_capacity}</div>
                        <div><strong>Initial CPU:</strong> {workflowResult?.machine_stats?.initial_cpu}</div>
                        <div><strong>Disk Capacity:</strong> {workflowResult?.machine_stats?.disk_capacity}</div>
                        <div><strong>Initial Disk:</strong> {workflowResult?.machine_stats?.initial_disk}</div>
                    </div>
                    <div className="w-full md:w-1/2 p-2">
                        <div><strong>Memory Capacity:</strong> {workflowResult?.machine_stats?.memory_capacity}</div>
                        <div><strong>Initial RAM:</strong> {workflowResult?.machine_stats?.initial_ram}</div>
                        <div><strong>GPU Type:</strong> {workflowResult?.machine_stats?.gpu_type}</div>
                        <div><strong>Avg VRAM:</strong> {workflowResult?.avg_vram} MB</div>
                        <div><strong>Peak VRAM:</strong> {workflowResult?.peak_vram} MB</div>
                    </div>
                    <div className="w-full md:w-1/2 p-2">
                        <div><strong>Pip Freeze:</strong></div>
                        <LongTextPreview text={workflowResult?.machine_stats?.pip_freeze || ''} />
                    </div>
                </div>
            </Card>
            <Card>
                <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">
                    VRAM Usage Over Time
                </h5>
                <div className="w-full">
                    <UsageGraph data={workflowResult?.machine_stats?.vram_time_series || {}} />
                </div>
            </Card>
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
