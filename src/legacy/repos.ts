/**
 * Repositories that api.comfy.org holds legacy core GPU CI (comfy-action) results
 * for. Runs were reported under 'comfyanonymous/ComfyUI' until 2026-01-07 and under
 * 'Comfy-Org/ComfyUI' until 2026-06-22; the API matches repo names case-insensitively.
 */
export const LEGACY_REPOS = ['Comfy-Org/ComfyUI', 'comfyanonymous/ComfyUI']

export const DEFAULT_REPO = LEGACY_REPOS[0]

/**
 * The repo filter comes from ?repo= and from the select, and it ends up in github.com
 * links, so only a GitHub "owner/name" pair is kept: anything else is the default repo.
 * The links still pass it through encodeURI, which leaves such a pair unchanged.
 */
export const repoOrDefault = (value: unknown): string =>
    typeof value === 'string' &&
    /^[A-Za-z0-9][A-Za-z0-9_-]{0,38}\/[A-Za-z0-9._-]{1,100}$/.test(value)
        ? value
        : DEFAULT_REPO
