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

### Generate Code Stub based on OpenAPI Spec

Start the dev server.

Currently, the Orval spec is in `orval.config.js`. It points to the OpenAPI spec in your localhost server. This can be changed to staging or prod.

`npx orval`

This generates react queries that you can use in your Components.

### Deployments

#### Production

Make a PR to the `main` branch. Once merged, Vercel will deploy to https://comfyci.org
