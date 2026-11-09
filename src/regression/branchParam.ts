import { useRouter } from 'next/router'
import React from 'react'
import { isBranchName } from './validate'

export const DEFAULT_BRANCH = 'master'

/**
 * A page's branch, read from ?branch= (master when absent) and written back with a
 * shallow router.replace that keeps every other param, so the view can be shared; master
 * is left out of the URL. The branch field is free text: a value that is not a branch
 * name stays in the field but is not written to the URL.
 */
export function useBranchParam(): [string, (branch: string) => void] {
    const router = useRouter()
    const param =
        typeof router.query.branch === 'string' && router.query.branch ? router.query.branch : DEFAULT_BRANCH
    const [branch, setLocal] = React.useState(DEFAULT_BRANCH)

    // Follows the URL (first load, back and forward, a link to the bare page); a value
    // this hook just wrote comes back unchanged.
    React.useEffect(() => {
        if (router.isReady) setLocal(param)
    }, [router.isReady, param])

    const setBranch = React.useCallback(
        (next: string) => {
            setLocal(next)
            if (!isBranchName(next)) return
            const query = { ...router.query }
            delete query.branch
            if (next !== DEFAULT_BRANCH) query.branch = next
            router.replace({ pathname: router.pathname, query }, undefined, { shallow: true, scroll: false })
        },
        [router]
    )

    return [branch, setBranch]
}

/** Link to All Results on a lane and branch, spelled the way the page writes its own URL (master left out). */
export function allResultsHref(laneId: string, branch: string = DEFAULT_BRANCH): string {
    const params = new URLSearchParams({ lane: laneId })
    if (branch !== DEFAULT_BRANCH) params.set('branch', branch)
    return `/?${params.toString()}`
}
