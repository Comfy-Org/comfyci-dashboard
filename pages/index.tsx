import React from 'react'
import { useGetGitcommit } from '../src/api/generated'
import {
    Badge,
    Button,
    Select,
    Table,
    Pagination,
    Spinner,
} from 'flowbite-react'
import Image from 'next/image'
import Link from 'next/link'
import { CiFilter } from 'react-icons/ci'
import { ClearableLabel } from '../components/Labels/ClearableLabel'

function GitCommitsList() {
    const [currentPage, setCurrentPage] = React.useState(1)
    const onPageChange = (page: number) => setCurrentPage(page)

    const [filterOS, setFilterOS] = React.useState<string>('')
    const [branch, setBranch] = React.useState<string>('master')
    const [commitId, setCommitId] = React.useState<string>('')
    const [workflowNameFilter, setWorkflowFilter] = React.useState<string>('')
    const { data: filteredJobResults, isLoading } = useGetGitcommit({
        operatingSystem: filterOS == '' ? undefined : filterOS,
        commitId: commitId == '' ? undefined : commitId,
        workflowName: workflowNameFilter == '' ? undefined : workflowNameFilter,
        page: currentPage,
        pageSize: 10,
    })

    return (
        <div style={{ padding: 20 }}>
            <h1 className="text-center text-3xl text-gray-700 mb-4">
                Comfy Workflows CI/CD
            </h1>
            <h3>Filters</h3>
            <div className="flex items-center gap-2 mb-4">
                <Badge href="https://github.com/comfyanonymous/ComfyUI">
                    comfyanonymous/ComfyUI
                </Badge>
                <Select
                    id="branch-select"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                >
                    <option value="">Select Branch</option>
                    <option value="master">master</option>
                    {/* Add other branch options here */}
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
            {isLoading ? (
                <div className="flex justify-center items-center">
                    <Spinner />
                </div>
            ) : (
                <>
                    <Table hoverable={true}>
                        <Table.Head>
                            <Table.HeadCell>Workflow Name</Table.HeadCell>
                            <Table.HeadCell>Github Action</Table.HeadCell>
                            <Table.HeadCell>Commit Id</Table.HeadCell>
                            <Table.HeadCell>Operating System</Table.HeadCell>
                            <Table.HeadCell>Output File</Table.HeadCell>
                            <Table.HeadCell>Run time</Table.HeadCell>
                        </Table.Head>
                        <Table.Body className="divide-y">
                            {filteredJobResults?.jobResults?.map(
                                (result, index) => (
                                    <Table.Row
                                        key={index}
                                        className="bg-white dark:border-gray-700 dark:bg-gray-800"
                                    >
                                        <Table.Cell>
                                            <div className="flex items-center gap-2 mb-4">
                                                {result.workflow_name}
                                                <Button
                                                    size="xs"
                                                    onClick={() =>
                                                        setWorkflowFilter(
                                                            result.workflow_name ||
                                                            ''
                                                        )
                                                    }
                                                >
                                                    <CiFilter />
                                                </Button>
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Link
                                                passHref
                                                href={`https://github.com/${result.git_repo}/actions/runs/${result.action_run_id}`}
                                            >
                                                <a
                                                    className="text-blue-500 hover:text-blue-700 underline hover:no-underline"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    Github Action
                                                </a>
                                            </Link>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <div className="flex items-center space-x-2">
                                                <Link
                                                    className="text-xs"
                                                    href={`https://github.com/${result.git_repo}/commit/${result.commit_hash}`}
                                                >
                                                    <a
                                                        className="text-blue-500 hover:text-blue-700 underline hover:no-underline"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        {result.commit_hash?.slice(
                                                            0,
                                                            7
                                                        )}
                                                    </a>
                                                </Link>
                                                <Button
                                                    size="xs"
                                                    onClick={() => {
                                                        setCommitId(
                                                            result.commit_id ||
                                                            ''
                                                        )
                                                    }}
                                                >
                                                    <CiFilter />
                                                </Button>
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell>
                                            {result.operating_system}
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Image
                                                src={
                                                    result.storage_file
                                                        ?.public_url || ''
                                                }
                                                width="256px"
                                                height="256px"
                                            />
                                        </Table.Cell>
                                        <Table.Cell>
                                            {result.end_time && result.start_time ? calculateTimeDifferenceInMinutes(result.end_time, result.start_time) : "Unknown"} minutes
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

function calculateTimeDifferenceInMinutes(startTime: number, endTime: number): number {
    const differenceInSeconds = Math.abs(endTime - startTime);
    const differenceInMinutes = differenceInSeconds / 60;
    return differenceInMinutes;
}

export default GitCommitsList
