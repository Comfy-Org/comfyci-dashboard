# ComfyCI Dashboard

Built using NextJS.

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

Make a PR to the `main` branch. Once merged, Vercel will deploy to https://comfyci.org
