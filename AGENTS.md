## Stack

- pnpm for package management
- Biome for formatting, linting, and import organization
- `tsgo --noEmit` for type checking
- Vitest for fast deterministic tests
- Tailwind CSS v4 through `@tailwindcss/vite`

## Deploy

- Cloudflare Workers Assets via `wrangler.jsonc`
- Live domain: `https://sqm.josxa.dev`
- Deploy with `pnpm deploy`

## Code Quality

MUST run `pnpm ai:check` after concluding any changes.

MUST use one repo-wide `ai:check` command as the default verification step. Run it frequently while working and always before considering the task complete.

If you touch a subsystem with its own fast deterministic tests, run those too.

Do not consider work complete while `ai:check` is failing.

After concluding your changes, you MUST run `ai:check`.
