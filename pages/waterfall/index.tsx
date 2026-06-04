import React from 'react'
import { useGetBranch, useGetGitcommitsummary } from '../../src/api/generated'
import { Spinner } from 'flowbite-react'
import Link from 'next/link'
import { FiExternalLink } from 'react-icons/fi'
import { useRouter } from 'next/router'
import { ClearableLabel } from '../../components/Labels/ClearableLabel'
import { WorkflowStatusButton } from '../../components/StatusButton'
import { Surface, SectionTitle } from '../../components/Surface'
import { BrandSelect } from '../../components/Inputs'
import { Pager } from '../../components/Pager'

const DEFAULT_REPO = 'comfyanonymous/ComfyUI'

function formatTimestamp(ts?: string): string {
    if (!ts) return ''
    const d = new Date(ts)
    return isNaN(d.getTime()) ? ts : d.toLocaleString()
}

function GitCommitsList() {
    const [currentPage, setCurrentPage] = React.useState(1)
    const onPageChange = (page: number) => setCurrentPage(page)
    const router = useRouter();
    const [filterOS, setFilterOS] = React.useState<string>('Select OS')
    const [repoFilter, setRepoFilter] = React.useState<string>(DEFAULT_REPO)
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
    }, [filteredJobResults, repoFilter]);

    return (
        <div className="pt-8">
            {/* Page heading */}
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-charcoal-800 dark:text-white">
                        Waterfall
                    </h1>
                    <p className="mt-1 text-sm text-ash-500 dark:text-smoke-800">
                        Per-commit CI status across operating systems. Click a platform to drill into its runs.
                    </p>
                </div>
                <a
                    href={`https://github.com/${repoFilter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-smoke-300 dark:border-charcoal-400/60 bg-smoke-200/60 dark:bg-charcoal-700/60 px-3 py-1.5 text-sm font-medium text-charcoal-800 dark:text-smoke-200 hover:border-electric/50 hover:text-charcoal-900 dark:hover:text-electric"
                >
                    {repoFilter}
                    <FiExternalLink className="h-3.5 w-3.5" />
                </a>
            </div>

            {/* Filters */}
            <Surface className="mb-6 p-4">
                <div className="mb-3">
                    <SectionTitle>Filters</SectionTitle>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <BrandSelect
                        id="branch-select"
                        value={branchFilter}
                        onChange={(e) => {
                            setBranchFilter(e.target.value)
                            setCurrentPage(1)
                        }}
                        className="w-56"
                    >
                        <option value="">Select Branch</option>
                        {branchesQueryResults?.branches?.map((branch, index) => (
                            <option key={index} value={branch}>
                                {branch}
                            </option>
                        ))}
                    </BrandSelect>
                    <BrandSelect
                        id="os-select"
                        value={filterOS}
                        onChange={(e) => setFilterOS(e.target.value)}
                        className="w-40"
                    >
                        <option value="">Select OS</option>
                        <option value="linux">linux</option>
                        <option value="macos">macos</option>
                        <option value="windows">windows</option>
                    </BrandSelect>
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
            </Surface>

            {(isLoading || loadingBranchs) ? (
                <div className="flex justify-center items-center py-24">
                    <Spinner size="xl" />
                </div>
            ) : !groupedResults || groupedResults.length === 0 ? (
                <Surface className="flex flex-col items-center justify-center gap-2 py-24 text-center">
                    <span className="text-lg font-semibold">No commits found</span>
                    <span className="text-sm text-ash-500 dark:text-smoke-800">
                        Try a different branch.
                    </span>
                </Surface>
            ) : (
                <>
                    <Surface className="overflow-hidden">
                        <div className="overflow-x-auto scrollbar-thin">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-smoke-300 dark:border-charcoal-400/60 text-[11px] uppercase tracking-wider text-ash-500 dark:text-smoke-800">
                                        <th className="px-5 py-3 font-semibold">Commit</th>
                                        <th className="px-5 py-3 font-semibold">Time</th>
                                        <th className="px-5 py-3 font-semibold">Platform Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-smoke-200 dark:divide-charcoal-400/40">
                                    {groupedResults.map(
                                        ({ osStatus, gitRepo, commitMessage, commitTime, commitHash }, index) => (
                                            <tr
                                                key={index}
                                                className="group transition-colors hover:bg-smoke-200/60 dark:hover:bg-charcoal-700/40"
                                            >
                                                <td className="px-5 py-4 align-top">
                                                    <div className="flex items-center gap-2">
                                                        <Link
                                                            href={`https://github.com/${gitRepo}/commit/${commitHash}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="rounded bg-smoke-200 dark:bg-charcoal-700 px-1.5 py-0.5 font-mono text-xs text-sapphire-700 dark:text-plum-300 hover:underline"
                                                        >
                                                            {commitHash?.slice(0, 7)}
                                                        </Link>
                                                    </div>
                                                    <div className="mt-1 max-w-[32rem] truncate text-sm text-charcoal-800 dark:text-smoke-200" title={commitMessage}>
                                                        {commitMessage}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 align-top text-xs text-ash-500 dark:text-smoke-800 whitespace-nowrap">
                                                    {formatTimestamp(commitTime)}
                                                </td>
                                                <td className="px-5 py-4 align-top">
                                                    <div className="flex flex-wrap gap-1.5">
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
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Surface>

                    <div className="mt-6 flex justify-center">
                        <Pager
                            currentPage={currentPage}
                            totalPages={filteredJobResults?.totalNumberOfPages || 1}
                            onPageChange={onPageChange}
                        />
                    </div>
                </>
            )}
        </div>
    );
}

export default GitCommitsList
