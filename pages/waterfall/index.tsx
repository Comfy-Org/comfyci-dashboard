import React from 'react'
import { useGetBranch, useGetGitcommit, WorkflowRunStatus } from '../../src/api/generated'
import {
    Badge,
    Button,
    Select,
    Table,
    Pagination,
    Spinner,
} from 'flowbite-react'
import Link from 'next/link'
import { CiFilter } from 'react-icons/ci'
import { useRouter } from 'next/router'
import { ClearableLabel } from '../../components/Labels/ClearableLabel'
import { WorkflowStatusButton } from '../../components/StatusButton'

function GitCommitsList() {
    const [currentPage, setCurrentPage] = React.useState(1)
    const onPageChange = (page: number) => setCurrentPage(page)
    const router = useRouter();
    const [filterOS, setFilterOS] = React.useState<string>('Select OS')
    const [repoFilter, setRepoFilter] = React.useState<string>('comfyanonymous/ComfyUI')
    const [branchFilter, setBranchFilter] = React.useState<string>('master')
    const [commitId, setCommitId] = React.useState<string>('')
    const [workflowNameFilter, setWorkflowFilter] = React.useState<string>('')
    const { data: filteredJobResults, isLoading } = useGetGitcommit({
        operatingSystem: filterOS == 'Select OS' ? undefined : filterOS,
        commitId: commitId == '' ? undefined : commitId,
        branch: branchFilter == 'Select Branch' ? undefined : branchFilter,
        page: currentPage,
        repoName: repoFilter,
        pageSize: 100,
    })

    const { data: branchesQueryResults, isLoading: loadingBranchs } = useGetBranch({
        repo_name: repoFilter
    })

    React.useEffect(() => {
        const repo = router.query.repo;
        if (typeof repo === 'string') {
            setRepoFilter(repo);
        }
    }, [router.query.repo]);


    const groupedResults = React.useMemo(() => {
        if (isLoading || !filteredJobResults || !filteredJobResults.jobResults) {
            return [];
        }
        const byCommit = filteredJobResults.jobResults.reduce((acc, item) => {
            const { commit_id, operating_system, status, git_repo, commit_message, commit_time, commit_hash } = item;
            if (commit_id) {
                if (!acc[commit_id]) {
                    // Initialize the entry for each commit_id with gitRepo and an empty osStatus map
                    acc[commit_id] = { gitRepo: git_repo, commitMessage: commit_message, commitTime: commit_time, commitHash: commit_hash, osStatus: {} };
                }
                if (!acc[commit_id].osStatus[operating_system]) {
                    // Ensure the operating system entry is initialized as an empty array
                    acc[commit_id].osStatus[operating_system] = [];
                }
                // Append the status to the array of statuses for the current operating system
                acc[commit_id].osStatus[operating_system].push(status);
            }
            return acc;
        }, {});

        // Generate the final grouped results, including error handling for unexpected data types
        return Object.keys(byCommit).map(commitId => ({
            commitId,
            gitRepo: byCommit[commitId].gitRepo,
            commitHash: byCommit[commitId].commitHash,
            commitMessage: byCommit[commitId].commitMessage,
            commitTime: byCommit[commitId].commitTime,
            branch: byCommit[commitId].branch,
            osStatus: Object.keys(byCommit[commitId].osStatus).map(os => {
                const statuses = byCommit[commitId].osStatus[os];
                // First check if any statuses indicate failure
                const isFailed = Array.isArray(statuses) && statuses.some(status => status === WorkflowRunStatus.WorkflowRunStatusFailed);
                if (isFailed) {
                    return {
                        os,
                        status: 'red', // Red if any job has failed
                    };
                }
                // Then check if any statuses indicate started
                const isInProgress = Array.isArray(statuses) && statuses.some(status => status === WorkflowRunStatus.WorkflowRunStatusStarted);
                if (isInProgress) {
                    return {
                        os,
                        status: 'orange', // Yellow if any job is in progress
                    };
                }
                // Default to green if none are failed or in progress
                return {
                    os,
                    status: 'green', // Green if all jobs have succeeded
                };
            }),
        }));
    }, [filteredJobResults, isLoading]);


    return (
        <div style={{ padding: 20 }}>
            <h3>Filters</h3>
            <div className="flex items-center gap-2 mb-4">
                <Badge href={`https://github.com/${repoFilter}`}>
                    {repoFilter}
                </Badge>
                <Select
                    id="branch-select"
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                >
                    <option value="">Select Branch</option>
                    {branchesQueryResults?.branches?.map((branch, index) => (
                        <option key={index} value={branch}>
                            {branch}
                        </option>
                    ))}
                </Select>
                <Select
                    id="os-select"
                    value={filterOS}
                    onChange={(e) => setFilterOS(e.target.value)}
                >
                    <option value="">Select OS</option>
                    <option value="linux">linux</option>
                    <option value="macos">macos</option>
                    <option value="windows">windows</option>
                </Select>
                <ClearableLabel
                    id="commit-id-input"
                    label="Commit ID"
                    value={commitId}
                    onChange={(s) => setCommitId(s)}
                    onClear={() => setCommitId('')}
                    disabled
                />
                <ClearableLabel
                    id="workflow-id-input"
                    label="Workflow Name"
                    value={workflowNameFilter}
                    onChange={(s) => setWorkflowFilter(s)}
                    onClear={() => setWorkflowFilter('')}
                    disabled
                />
            </div>
            {(isLoading || loadingBranchs) ? (
                <div className="flex justify-center items-center">
                    <Spinner />
                </div>
            ) : (
                <>
                    <Table hoverable={true}>
                        <Table.Head>
                            <Table.HeadCell>Commit Hash</Table.HeadCell>
                            <Table.HeadCell>Commit Message</Table.HeadCell>
                            <Table.HeadCell>Commit Time</Table.HeadCell>
                            <Table.HeadCell>Status</Table.HeadCell>

                        </Table.Head>
                        <Table.Body className="divide-y">
                            {groupedResults.map(
                                ({ commitId, osStatus, gitRepo, commitMessage, commitTime, commitHash }, index) => (
                                    <Table.Row
                                        key={index}
                                        className="bg-white dark:border-gray-700 dark:bg-gray-800"
                                    >
                                        <Table.Cell>
                                            <div className="flex items-center space-x-2">
                                                <Link
                                                    className="text-xs"
                                                    href={`https://github.com/${gitRepo}/commit/${commitHash}`}
                                                >
                                                    <a
                                                        className="text-blue-500 hover:text-blue-700 underline hover:no-underline"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        {commitHash?.slice(
                                                            0,
                                                            7
                                                        )}
                                                    </a>
                                                </Link>
                                                <Button
                                                    size="xs"
                                                    onClick={() => {
                                                        setCommitId(
                                                            commitId ||
                                                            ''
                                                        )
                                                    }}
                                                >
                                                    <CiFilter />
                                                </Button>
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell>
                                            {commitMessage}
                                        </Table.Cell>
                                        <Table.Row>
                                            <Table.Cell>{commitTime !== undefined ? new Date(commitTime * 1000).toLocaleString() : commitTime}</Table.Cell>
                                        </Table.Row>
                                        <Table.Cell>
                                            <div className='flex flex-row gap-1'>
                                                {osStatus.map(({ os, status }) =>
                                                    <WorkflowStatusButton key={os} text={os} status={status}
                                                        onClick={() => {

                                                            const query = {
                                                                os,
                                                                commitId,
                                                                repo: gitRepo,
                                                                branch: branchFilter,
                                                            };
                                                            // Update the URL with new query parameters
                                                            router.push({ pathname: '/', query });

                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </Table.Cell>
                                    </Table.Row>
                                )
                            )}
                        </Table.Body>
                    </Table>
                    <Pagination
                        className="mt-4"
                        currentPage={currentPage}
                        totalPages={filteredJobResults?.totalNumberOfPages || 1}
                        onPageChange={onPageChange}
                    />
                </>
            )}
        </div>
    )
}

export default GitCommitsList
