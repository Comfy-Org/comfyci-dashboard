import React from 'react'
import { useGetBranch, useGetGitcommit, useGetGitcommitsummary, WorkflowRunStatus } from '../../src/api/generated'
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
    const { data: filteredJobResults, isLoading } = useGetGitcommitsummary({
        branchName: branchFilter == 'Select Branch' ? undefined : branchFilter,
        page: currentPage,
        repoName: repoFilter,
        pageSize: 10,
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
        // Generate the final grouped results, including error handling for unexpected data types
        return filteredJobResults?.commitSummaries?.map(commitSummary => ({
            gitRepo: repoFilter,
            commitHash: commitSummary.commit_hash,
            commitMessage: commitSummary.commit_name,
            commitTime: commitSummary.timestamp,
            branch: commitSummary.branch_name,
            osStatus: Object.entries(commitSummary.status_summary || {}).map(([os, status]) => {
                if (status === "FAILED") {
                    return {
                        os,
                        status: 'red', // Red if any job has failed
                    };
                }
                if (status === "STARTED") {
                    return {
                        os,
                        status: 'orange', // Yellow if any job is in progress
                    };
                }
                return {
                    os,
                    status: 'green', // Green if all jobs have succeeded
                };
            }),
        }));
    }, [filteredJobResults, isLoading]);


    return (
        <div style={{ padding: 20 }} className="dark:text-white">
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
                            {groupedResults?.map(
                                ({ osStatus, gitRepo, commitMessage, commitTime, commitHash }, index) => (
                                    <Table.Row
                                        key={index}
                                        className="bg-white dark:border-gray-700 dark:bg-gray-800"
                                    >
                                        <Table.Cell>
                                            <div className="flex items-center space-x-2">
                                                <Link
                                                    className="text-xs"
                                                    href={`https://github.com/${gitRepo}/commit/${commitHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer">

                                                    {commitHash?.slice(
                                                        0,
                                                        7
                                                    )}

                                                </Link>
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell>
                                            {commitMessage}
                                        </Table.Cell>
                                        <Table.Row>
                                            <Table.Cell>{commitTime}</Table.Cell>
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
    );
}

export default GitCommitsList
