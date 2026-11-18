# ComfyCI Dashboard

Built using NextJS. Deployed at https://ci.comfy.org.

## Pages

Every page except Legacy reads static JSON that the worker repo ([Comfy-Org/comfyci-runpod-worker](https://github.com/Comfy-Org/comfyci-runpod-worker)) publishes on its `results` branch; `NEXT_PUBLIC_REGRESSION_BASE` overrides the regression base URL.

- **All Results** (`/`): the GPU regression history of one lane on one branch, with freshness, open regressions, the per-workflow strip, drift sparklines and the paged run history. Lane pills switch lanes (primary first, retired last). `?lane=` and `?branch=` are kept in the URL (master is left out), so a view can be shared. The lookup opens a commit by its full SHA, or by a 7+ character prefix that matches exactly one loaded run.
- **Waterfall** (`/waterfall`): every tested commit across lanes, one column per lane, read from each lane's index head. It can filter to commits where any lane is red, or where a workflow passes on one lane and fails on another. `?branch=` works as on All Results; the filter and page are kept as `?show=red|disagree` and `?page=<n>`. A head lists only a lane's newest 500 runs, so for a commit older than that a column shows "—" (unknown) rather than "not run".
- **Commit page** (`/regression/<branch>/<sha>?lane=<id>`): one lane's run of one commit, with per-workflow metrics, outputs, diffs and the re-bless commands. A text workflow shows its generated text, beside the golden's with the changed words marked when the two differ. Other saved files (a mesh, a GIF) are listed as links. It has newer and older links and a lane switcher that shows which lanes ran the commit. Without `?lane=` it shows the primary lane. PULSE PR comments link here, so this URL does not change. Each workflow card has a `#wf-<workflow id>` anchor.
- **Frontend** (`/frontend`): see [Frontend tab](#frontend-tab).
- **Legacy** (`/legacy`, `/legacy/waterfall`, `/workflow/<id>`): the api.comfy.org results of the old comfy-action CI, which stopped reporting on 2026-06-22. Read-only; linked from the footer, and the two legacy pages link each other.

Lanes come from `regression/index/lanes.json`, which the worker builds from its [`manifest/lanes.json`](https://github.com/Comfy-Org/comfyci-runpod-worker/blob/main/manifest/lanes.json). A lane with cadence `retired` runs no more but keeps its history readable: it is listed last, gets a neutral note instead of a staleness warning, and offers no re-bless commands.

A lane with cadence `nightly` or `weekly` tests one commit of many. It has no column on the Waterfall, which links to it on All Results instead once it has a run on the branch. Its freshness banner turns amber after 36 hours or 8 days without a run. When a failing chain started in a run that covered more than one commit, the "failing since" line names no pull request, author or subject: that commit is only the newest of them. It links GitHub's compare page from the last good commit to that one, and says how many commits the run covered while the published count is of that range. A later run that passes at an older commit moves "last good" forward, and the worker then publishes the link without a count: the line reads "the newest of the commits since the last good one". A chain that never passed on such a lane reads as the workflow's first run on the lane. In the history a failure names the commits since the workflow's last result only while no later run has put a result of that workflow in between. On a nightly or weekly lane, and on a lane that names another card than the RTX 4090, the intro of All Results does not speak of every commit or of that card.

The commit page reads four more things a nightly or weekly run can publish, and says each under its title. A summary with `partial` is of a run that did not finish, or is still going: the page says how many workflows have a result, and shows no green verdict. A summary with `scope` is of a run that tested only the workflows it named. A workflow with worker status `not_reached` was not tested, because the run's deadline came before it could start. Workflows under `retests` were tested again by a later run.

A run that named its workflows at a commit without a full result has `"named": true` on its index entry. It is not the lane's run of the commit. Its row on All Results and its cell on the Waterfall say "named workflows only", and so does the hover of its lane pill on the commit page. It is not counted in the pass rate, and it is not the latest run of the freshness banner, the "Last Run" tile, the Workflows strip or the pack section of the Frontend tab: that is the newest run without the mark, as in the worker's `latest`. A workflow it tested shows that newer result in its tile and in the open count. A lane whose runs all named their workflows says that it has no full run yet.

### Smoke-level workflows

A workflow the worker runs at smoke level (`"level": "smoke"` in its manifest) is only checked to finish and to write usable files. Its output is not compared with a golden. The pages read `level` on a result and `l` on an index cell, and show such a result with words of its own:

- The badge reads "Smoke pass" or "Smoke check failed", and "Smoke check failed (inherited)" when the workflow's result before it had failed too. An execution or infra error reads as on any workflow.
- A run's overall badge takes the smoke words when smoke-level results alone decide it. A run of smoke-level workflows only reads "Infra Error" when nothing failed and one of them was not tested, and "Execution Error" when its only new failures are workflows that did not finish. A green run with results of both levels reads "Pass", with a hover that names both.
- On a lane with smoke-level results only, All Results says "Open Failures" where other lanes say "Open Regressions", and its intro names no golden.
- It has no golden: no golden tag, no accepted drift, no re-bless commands, and no place in "Drift vs golden" on All Results.
- Its commit-page card has a "Checked files" table where other cards have the metric table: one row per output file with its type, size, sha256 and what the check measured, under the sentences that say what failed. A file the worker did not send reads "not sent, checked by size only". A file the run kept in its artifact (a large output that does not repeat) is listed without a link and is left out of the pictures.
- A failing chain of a smoke-level workflow that never passed on the lane says that it is the workflow's first run on the lane, and names no pull request or author.

File names and problem sentences come from the worker's run. They are shown as text only, and a file is linked only when its name is a plain file name.

### Redirects

`next.config.js` keeps old links working. The redirects are temporary (307) and keep the query string.

| From | To | Why |
|---|---|---|
| `/regression` | `/` | The Regression tab became All Results |
| `/` with `repo`, `os`, `workflowName` or `commitId` | `/legacy` | Filters of the old All Results page |
| `/` with `branch=<number>/merge` | `/legacy` | Links ComfyUI's `pullrequest-ci-run.yml` posted on PRs |
| `/waterfall` with `repo` | `/legacy/waterfall` | The old waterfall's only param |

Commit pages under `/regression/<branch>/<sha>` are never redirected. A branch of the form `<number>/merge` typed into All Results is written to the URL like any other, so that URL opens the legacy page when reloaded or shared; no regression lane runs on such a branch. The Waterfall keeps such a URL and shows no runs.

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
