# ComfyCI Dashboard

Built using NextJS. Deployed at https://ci.comfy.org.

## Pages

Every page except Legacy reads static JSON that the worker repo ([Comfy-Org/comfyci-runpod-worker](https://github.com/Comfy-Org/comfyci-runpod-worker)) publishes on its `results` branch; `NEXT_PUBLIC_REGRESSION_BASE` overrides the regression base URL.

- **All Results** (`/`): the GPU regression history of one lane on one branch, with freshness, open regressions, the per-workflow strip, drift sparklines and the paged run history. Lane pills switch lanes (primary first, retired last). `?lane=` and `?branch=` are kept in the URL (master is left out), so a view can be shared. The lookup opens a commit by its full SHA, or by a 7+ character prefix that matches exactly one loaded run.
- **Waterfall** (`/waterfall`): every tested commit across lanes, one column per lane, read from each lane's index head. It can filter to commits where any lane is red, or where a workflow passes on one lane and fails on another. `?branch=` works as on All Results; the filter and page are kept as `?show=red|disagree` and `?page=<n>`. A head lists only a lane's newest 500 runs, so for a commit older than that a column shows "—" (unknown) rather than "not run".
- **Commit page** (`/regression/<branch>/<sha>?lane=<id>`): one lane's run of one commit, with per-workflow metrics, outputs, diffs and the re-bless commands. It has newer and older links and a lane switcher that shows which lanes ran the commit. Without `?lane=` it shows the primary lane. PULSE PR comments link here, so this URL does not change. Each workflow card has a `#wf-<workflow id>` anchor.
- **Frontend** (`/frontend`): see [Frontend tab](#frontend-tab).
- **Legacy** (`/legacy`, `/legacy/waterfall`, `/workflow/<id>`): the api.comfy.org results of the old comfy-action CI, which stopped reporting on 2026-06-22. Read-only; linked from the footer, and the two legacy pages link each other.

Lanes come from `regression/index/lanes.json`, which the worker builds from its [`manifest/lanes.json`](https://github.com/Comfy-Org/comfyci-runpod-worker/blob/main/manifest/lanes.json). A lane with cadence `retired` runs no more but keeps its history readable: it is listed last, gets a neutral note instead of a staleness warning, and offers no re-bless commands.

### Redirects

`next.config.js` keeps old links working. The redirects are temporary (307) and keep the query string.

| From | To | Why |
|---|---|---|
| `/regression` | `/` | The Regression tab became All Results |
| `/` with `repo`, `os`, `workflowName` or `commitId` | `/legacy` | Filters of the old All Results page |
| `/` with `branch=<number>/merge` | `/legacy` | Links ComfyUI's `pullrequest-ci-run.yml` posted on PRs |
| `/waterfall` with `repo` | `/legacy/waterfall` | The old waterfall's only param |

Commit pages under `/regression/<branch>/<sha>` are never redirected. A branch of the form `<number>/merge` typed into All Results or the Waterfall is written to the URL like any other, so that URL opens the legacy page when reloaded or shared; no regression lane runs on such a branch.

## Getting Started

### Set up IDE

#### VSCode

Install [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) + [Eslint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) extensions.

- `.vscode/settings.json.default` is available, it is set up in the workspace to lint + format code on save.
    - Copy to `settings.json` to use it
    - But also maybe don't because the existing code doesn't stick to that formatter at all

### Local Development

- Install prereqs:
    - Clone this repo
    - install NodeJS: https://nodejs.org/en/download/package-manager/current
    - Install pnpm: https://pnpm.io/installation
    - open new terminal install (pnpm doesn't add self to path instantly) (note VS Code terminal has persistence that will screw you here)
    - `pnpm install`
- Setup:
    - Copy `.env.local.example` to `.env.local` and configure it
- Actually run:
    - `pnpm run dev`
    - Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Frontend tab

`/frontend` shows ComfyUI_frontend's CI on `main` per commit and workflow, its perf baselines per scenario (judged by the frontend repo's own z-score rule, published with the data), and the daily custom-nodes gate per shard with the pinned core and the current streak. It reads only static JSON that the worker repo's `frontend-index` workflow publishes under `frontend/` on its `results` branch; no token or server code. The tab also shows the GPU pack workflows from the regression lane index (`regression/index/lanes.json` and each lane's head): every workflow whose newest cell carries `cn` is listed with its last runs, each pack's import status, and the pack's pinned commit from the worker's `manifest/custom_nodes.json`. `NEXT_PUBLIC_FRONTEND_BASE` overrides the base URL (default: the results branch via raw.githubusercontent.com); set it to `/fixtures/frontend` to render the checked-in samples in `public/fixtures/frontend/` before the publisher has run. The samples are the publisher's own dry-run output (only bot author logins are replaced by `merge-bot`), never hand-written: regenerate them from the worker repo with `python scripts/frontend_index.py --skip-publish --results-workdir <scratch> --backfill-days 3`, copy its `frontend/` tree over `public/fixtures/frontend/`, and point the shard imports in `src/frontend/fixtures.check.ts` at the new month if it changed. That file makes `tsc` and `next build` check the samples against `src/frontend/types.ts`, so a renamed or dropped key fails the build instead of the live page.

### Generate Code Stub based on OpenAPI Spec

Start the dev server.

Currently, the Orval spec is in `orval.config.js`. It points to the OpenAPI spec in your localhost server. This can be changed to staging or prod.

`npx orval`

This generates react queries that you can use in your Components.

### Deployments

#### Production

Make a PR to the `main` branch. Once merged, Vercel will deploy to https://ci.comfy.org
