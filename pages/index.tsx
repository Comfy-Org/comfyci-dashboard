import { Spinner } from 'flowbite-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import React from 'react'
import { CiFilter } from 'react-icons/ci'
import { FiExternalLink } from 'react-icons/fi'
import { ClearableLabel } from '../components/Labels/ClearableLabel'
import { WorkflowStatusButton } from '../components/StatusButton'
import { StatsDashboard } from '../components/StatsDashboard'
import { Surface, SectionTitle } from '../components/Surface'
import { BrandSelect } from '../components/Inputs'
import { Pager } from '../components/Pager'
import analytic from '../global/mixpanel'
import { useGetBranch, useGetGitcommit, WorkflowRunStatus } from '../src/api/generated'
import { formatDuration } from '../utils/format'
import { StatusToColor, StatusToHumanText } from './workflow/[id]'

const DEFAULT_REPO = 'comfyanonymous/ComfyUI'

// Status filter options. The /gitcommit API has no status param, so this filters
// the rows already loaded for the current page (see note rendered below the table).
const STATUS_OPTIONS: { label: string; value: string }[] = [
    { label: 'Failed', value: WorkflowRunStatus.WorkflowRunStatusFailed },
    { label: 'In Progress', value: WorkflowRunStatus.WorkflowRunStatusStarted },
    { label: 'Success', value: WorkflowRunStatus.WorkflowRunStatusCompleted },
]

function GitCommitsList() {
    const [currentPage, setCurrentPage] = React.useState(1)
    const onPageChange = (page: number) => setCurrentPage(page)
    const router = useRouter();
    const [filterOS, setFilterOS] = React.useState<string>('Select OS')
    const [repoFilter, setRepoFilter] = React.useState<string>(DEFAULT_REPO)
    const [branchFilter, setBranchFilter] = React.useState<string>('Select Branch')
    const [commitId, setCommitId] = React.useState<string>('')
    const [workflowNameFilter, setWorkflowFilter] = React.useState<string>('')
    // Client-side only (the API has no status param) — not synced to the URL.
    const [statusFilter, setStatusFilter] = React.useState<string>('')

    const prevFilters = React.useRef({ filterOS, repoFilter, branchFilter, commitId, workflowNameFilter, currentPage });

    const { data: filteredJobResults, isLoading } = useGetGitcommit({
        operatingSystem: filterOS == 'Select OS' ? undefined : filterOS,
        commitId: commitId == '' ? undefined : commitId,
        workflowName: workflowNameFilter == '' ? undefined : workflowNameFilter,
        branch: branchFilter == 'Select Branch' ? undefined : branchFilter,
        page: currentPage,
        repoName: repoFilter,
        pageSize: 30,
    })

    // Update the URL parameters when filters change
    React.useEffect(() => {
        // Only update the URL if the filters have actually changed
        if (filterOS !== prevFilters.current.filterOS ||
            repoFilter !== prevFilters.current.repoFilter ||
            branchFilter !== prevFilters.current.branchFilter ||
            commitId !== prevFilters.current.commitId ||
            workflowNameFilter !== prevFilters.current.workflowNameFilter ||
            currentPage !== prevFilters.current.currentPage) {
            const query = {
                os: filterOS || undefined,
                repo: repoFilter || undefined,
                branch: branchFilter || undefined,
                commitId: commitId || undefined,
                workflowName: workflowNameFilter || undefined,
                page: currentPage.toString(),
            };
            router.push({ pathname: router.pathname, query }, undefined, { shallow: true });

            // Update the ref with the new values
            prevFilters.current = { filterOS, repoFilter, branchFilter, commitId, workflowNameFilter, currentPage };
        }
    }, [filterOS, repoFilter, branchFilter, commitId, workflowNameFilter, currentPage, router, prevFilters]);

    // Initialize filters from URL on component mount or when URL changes
    React.useEffect(() => {
        const query = router.query;
        // Ensure all parameters are treated as strings, even if they are arrays
        setFilterOS(typeof query.os === 'string' ? query.os : query.os?.[0] || 'Select OS');
        setRepoFilter(typeof query.repo === 'string' ? query.repo : query.repo?.[0] || DEFAULT_REPO);
        setBranchFilter(typeof query.branch === 'string' ? query.branch : query.branch?.[0] || 'Select Branch');
        setCommitId(typeof query.commitId === 'string' ? query.commitId : query.commitId?.[0] || '');
        setWorkflowFilter(typeof query.workflowName === 'string' ? query.workflowName : query.workflowName?.[0] || '');
        setCurrentPage(parseInt(typeof query.page === 'string' ? query.page : query.page?.[0] || '1'));
    }, [router.query]);

    const { data: branchesQueryResults, isLoading: loadingBranchs } = useGetBranch({
        repo_name: repoFilter
    })

    React.useEffect(() => {
        const repo = router.query.repo;
        if (typeof repo === 'string') {
            setRepoFilter(repo);
        }
    }, [router.query.repo]);

    const jobResults = filteredJobResults?.jobResults ?? []
    const visibleResults = statusFilter
        ? jobResults.filter((r) => r.status === statusFilter)
        : jobResults
    const hasActiveFilters =
        filterOS !== 'Select OS' ||
        branchFilter !== 'Select Branch' ||
        commitId !== '' ||
        workflowNameFilter !== '' ||
        statusFilter !== ''

    const clearAll = () => {
        setFilterOS('Select OS')
        setBranchFilter('Select Branch')
        setCommitId('')
        setWorkflowFilter('')
        setStatusFilter('')
        setCurrentPage(1)
    }

    return (
        <div className="pt-8">
            {/* Page heading */}
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-charcoal-800 dark:text-white">
                        Workflow Results
                    </h1>
                    <p className="mt-1 text-sm text-ash-500 dark:text-smoke-800">
                        Individual CI runs across commits, branches and platforms.
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

            {/* Dashboard */}
            <StatsDashboard results={jobResults} />

            {/* Filters */}
            <Surface className="mb-6 p-4">
                <div className="mb-3 flex items-center justify-between">
                    <SectionTitle>Filters</SectionTitle>
                    {hasActiveFilters && (
                        <button
                            onClick={clearAll}
                            className="text-xs font-semibold text-ash-500 hover:text-electric"
                        >
                            Clear all
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <BrandSelect
                        id="branch-select"
                        value={branchFilter}
                        onChange={(e) => {
                            setBranchFilter(e.target.value);
                            analytic.track('Change Branch Filter', { branch: e.target.value });
                            setCurrentPage(1);
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
                    <BrandSelect
                        id="status-select"
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value)
                            analytic.track('Change Status Filter', { status: e.target.value })
                        }}
                        className="w-44"
                    >
                        <option value="">Select Status</option>
                        {STATUS_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value}>
                                {s.label}
                            </option>
                        ))}
                    </BrandSelect>
                    <ClearableLabel
                        id="commit-id-input"
                        label="Commit ID"
                        value={commitId}
                        onChange={(s) => {
                            setCommitId(s);
                            setCurrentPage(1);
                        }}
                        onClear={() => setCommitId('')}
                    />
                    <ClearableLabel
                        id="workflow-id-input"
                        label="Workflow Name"
                        value={workflowNameFilter}
                        onChange={(s) => {
                            setWorkflowFilter(s);
                            setCurrentPage(1);
                        }}
                        onClear={() => setWorkflowFilter('')}
                    />
                </div>
            </Surface>

            {(isLoading || loadingBranchs) ? (
                <div className="flex justify-center items-center py-24">
                    <Spinner size="xl" />
                </div>
            ) : jobResults.length === 0 ? (
                <Surface className="flex flex-col items-center justify-center gap-2 py-24 text-center">
                    <span className="text-lg font-semibold">No results found</span>
                    <span className="text-sm text-ash-500 dark:text-smoke-800">
                        Try adjusting or clearing your filters.
                    </span>
                </Surface>
            ) : (
                <>
                    {statusFilter && (
                        <p className="mb-2 text-xs text-ash-500 dark:text-smoke-800">
                            Showing {visibleResults.length} of {jobResults.length} run{jobResults.length === 1 ? '' : 's'} on this page matching{' '}
                            <span className="font-semibold">{StatusToHumanText(statusFilter as WorkflowRunStatus)}</span>.
                        </p>
                    )}
                    <Surface className="overflow-hidden">
                        <div className="overflow-x-auto scrollbar-thin">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-smoke-300 dark:border-charcoal-400/60 text-[11px] uppercase tracking-wider text-ash-500 dark:text-smoke-800">
                                        <th className="px-5 py-3 font-semibold">Workflow</th>
                                        <th className="px-5 py-3 font-semibold">Status</th>
                                        <th className="px-5 py-3 font-semibold">Commit</th>
                                        <th className="px-5 py-3 font-semibold">Environment</th>
                                        <th className="px-5 py-3 font-semibold">Output</th>
                                        <th className="px-5 py-3 font-semibold">Run Time</th>
                                        <th className="px-5 py-3 font-semibold text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-smoke-200 dark:divide-charcoal-400/40">
                                    {visibleResults.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-10 text-center text-sm text-ash-500 dark:text-smoke-800">
                                                No runs match the selected status on this page.
                                            </td>
                                        </tr>
                                    )}
                                    {visibleResults.map((result, index) => (
                                        <tr
                                            key={result.id || index}
                                            className={`group transition-colors hover:bg-smoke-200/60 dark:hover:bg-charcoal-700/40 ${result.status === WorkflowRunStatus.WorkflowRunStatusFailed
                                                ? 'bg-red-500/[0.06] dark:bg-red-500/[0.08]'
                                                : ''
                                                }`}
                                        >
                                            {/* Workflow */}
                                            <td className="px-5 py-4 align-top">
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        href={`/workflow/${result.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-semibold text-charcoal-800 dark:text-smoke-100 hover:text-sapphire-700 dark:hover:text-electric"
                                                    >
                                                        {result.workflow_name}
                                                    </Link>
                                                    <button
                                                        title="Filter by this workflow"
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1 text-ash-500 hover:bg-smoke-300 dark:hover:bg-charcoal-400/60 hover:text-electric"
                                                        onClick={() => {
                                                            setWorkflowFilter(result.workflow_name || '')
                                                            setCurrentPage(1)
                                                        }}
                                                    >
                                                        <CiFilter />
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-5 py-4 align-top">
                                                <WorkflowStatusButton
                                                    text={StatusToHumanText(result?.status)}
                                                    status={StatusToColor(result.status)}
                                                />
                                            </td>

                                            {/* Commit */}
                                            <td className="px-5 py-4 align-top">
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        href={`https://github.com/${result.git_repo}/commit/${result.commit_hash}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="rounded bg-smoke-200 dark:bg-charcoal-700 px-1.5 py-0.5 font-mono text-xs text-sapphire-700 dark:text-plum-300 hover:underline"
                                                    >
                                                        {result.commit_hash?.slice(0, 7)}
                                                    </Link>
                                                    <button
                                                        title="Filter by this commit"
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1 text-ash-500 hover:bg-smoke-300 dark:hover:bg-charcoal-400/60 hover:text-electric"
                                                        onClick={() => {
                                                            setCommitId(result.commit_id || '')
                                                            setCurrentPage(1)
                                                        }}
                                                    >
                                                        <CiFilter />
                                                    </button>
                                                </div>
                                                <div className="mt-1 max-w-[22rem] truncate text-xs text-ash-500 dark:text-smoke-800" title={result.commit_message}>
                                                    {result.commit_message}
                                                </div>
                                                <div className="mt-0.5 text-[11px] text-ash-500/80 dark:text-smoke-800/80">
                                                    {result.commit_time !== undefined
                                                        ? new Date(result.commit_time * 1000).toLocaleString()
                                                        : ''}
                                                </div>
                                            </td>

                                            {/* Environment */}
                                            <td className="px-5 py-4 align-top">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm">
                                                        {result.operating_system}
                                                        <span className="text-ash-500 dark:text-smoke-800">
                                                            {' '}· py{result?.python_version}
                                                        </span>
                                                    </span>
                                                    <button
                                                        title="Filter by this OS"
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1 text-ash-500 hover:bg-smoke-300 dark:hover:bg-charcoal-400/60 hover:text-electric"
                                                        onClick={() => {
                                                            setFilterOS(result.operating_system || '')
                                                            setCurrentPage(1)
                                                        }}
                                                    >
                                                        <CiFilter />
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Output */}
                                            <td className="px-5 py-4 align-top">
                                                {result.storage_file?.public_url ? (
                                                    <Link
                                                        href={`/workflow/${result.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <Image
                                                            src={result.storage_file.public_url}
                                                            alt={result.workflow_name || 'output file'}
                                                            width={72}
                                                            height={72}
                                                            className="h-[72px] w-[72px] rounded-lg border border-smoke-300 dark:border-charcoal-400/60 object-cover transition-transform hover:scale-105"
                                                        />
                                                    </Link>
                                                ) : (
                                                    <div className="flex h-[72px] w-[72px] items-center justify-center rounded-lg border border-dashed border-smoke-400 dark:border-charcoal-400/60 text-[10px] text-ash-500 dark:text-smoke-800">
                                                        no output
                                                    </div>
                                                )}
                                            </td>

                                            {/* Run time */}
                                            <td className="px-5 py-4 align-top">
                                                <span className="font-mono text-sm tabular-nums">
                                                    {result.end_time && result.start_time
                                                        ? formatDuration(Math.abs(result.end_time - result.start_time))
                                                        : 'unknown'}
                                                </span>
                                            </td>

                                            {/* Action */}
                                            <td className="px-5 py-4 align-top text-right">
                                                <Link
                                                    href={`https://github.com/${result.git_repo}/actions/runs/${result.action_run_id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-smoke-300 dark:border-charcoal-400/60 px-2.5 py-1.5 text-xs font-medium text-charcoal-800 dark:text-smoke-200 hover:border-electric/50 hover:text-charcoal-900 dark:hover:text-electric"
                                                >
                                                    Action
                                                    <FiExternalLink className="h-3 w-3" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
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
