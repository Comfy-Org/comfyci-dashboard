import { useRouter } from 'next/router'
import React from 'react'
import { isBranchName } from './validate'

export const DEFAULT_BRANCH = 'master'

const NO_PARAMS: string[] = []

/** The branch a branch field asks for: master while it is empty, else exactly what was typed. */
const branchOf = (field: string) => (field.trim() === '' ? DEFAULT_BRANCH : field)

/**
 * A page's branch, read from ?branch= (master when absent) and written back with a
 * shallow router.replace that keeps every other param, so the view can be shared; master
 * is left out of the URL. The branch field is free text: emptying it means master (the
 * param is dropped, as the clear button does), and a value that is not a branch name stays
 * in the field but is not written to the URL. `resetParams` are dropped from the URL when
 * the branch changes, for state that belongs to the old branch's view (a page number).
 */
export function useBranchParam(resetParams: string[] = NO_PARAMS): {
    /** The branch to show; check it with isBranchName before fetching. */
    branch: string
    /** What the branch field holds. */
    field: string
    setBranch: (field: string) => void
} {
    const router = useRouter()
    const param =
        typeof router.query.branch === 'string' && router.query.branch ? router.query.branch : DEFAULT_BRANCH
    const [field, setField] = React.useState(DEFAULT_BRANCH)

    // Follows the URL (first load, back and forward, a link to the bare page). A value this
    // hook just wrote comes back unchanged, and an emptied field stays empty for master.
    React.useEffect(() => {
        if (router.isReady) setField((current) => (branchOf(current) === param ? current : param))
    }, [router.isReady, param])

    const setBranch = React.useCallback(
        (next: string) => {
            setField(next)
            const branch = branchOf(next)
            if (!isBranchName(branch)) return
            const query = { ...router.query }
            delete query.branch
            if (branch !== DEFAULT_BRANCH) query.branch = branch
            if (branch !== param) resetParams.forEach((key) => delete query[key])
            router.replace({ pathname: router.pathname, query }, undefined, { shallow: true, scroll: false })
        },
        [router, param, resetParams]
    )

    return { branch: branchOf(field), field, setBranch }
}

/** Link to All Results on a lane and branch, spelled the way the page writes its own URL (master left out). */
export function allResultsHref(laneId: string, branch: string = DEFAULT_BRANCH): string {
    const params = new URLSearchParams({ lane: laneId })
    if (branch !== DEFAULT_BRANCH) params.set('branch', branch)
    return `/?${params.toString()}`
}
