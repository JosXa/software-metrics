# Software Quality Tradeoffs

An interactive explorer for software quality tradeoffs. Pick the attributes you care about, set the intent, watch the equilibrium settle, and see which forces are pushing back.

The model is opinionated, not scientific: a curated graph of how qualities like *Performance*, *Securability*, *Modifiability*, or *Testability* tend to support or fight one another in real systems. Three foundation metrics (Affordability, Complexity, Reliability) stay pinned because every software decision eventually pays through price, cognitive load, or trust.

## Why

Most "quality attribute" lists are flat checkboxes. That hides the interesting part: raising one quality almost always taxes another. This tool turns the list into a graph you can argue with.

Use it to:

- Run a cheap thought experiment before a design review.
- Explain to non-engineers why "more secure" or "more modular" is never free.
- Compare canonical frameworks (FURPS, RASUI, ACID, CIA, RAMS, …) side by side.
- Probe a domain preset (SaaS, CLI, Embedded, Banking, Government, …) and see which pressures dominate.

## How it works

Every selected attribute is a slider. Each slider has two values:

- **Intent** — what you want.
- **Equilibrium** — what you actually get once cross-attribute influences settle.

Influences come from a curated edge graph (`src/edges.ts`) with direction, influence weight, and confidence. The tradeoff solver (`src/tradeoff.ts`) iterates a damped Jacobi step until the system stabilizes. Hub-budget normalization keeps highly-connected attributes from drowning out the rest.

Click a tile title to open its full relationship dialog. Hover the pressure gauge under a slider to see which active drivers are pushing on it.

## Stack

- React 19 + Vite 8
- Tailwind v4 (via `@tailwindcss/vite`)
- Biome for formatting & lint
- `tsgo --noEmit` for typecheck
- Vitest + Testing Library

## Development

```bash
pnpm install
pnpm dev
```

One command for the full quality bar:

```bash
pnpm ai:check   # biome + tsgo + vitest
```

## Data

The starting list of attributes and their definitions comes from a public Coda table on software quality. The relationship graph (and the opinionated parts: polarities, foundation metrics, edge weights) is hand-curated in this repo. None of it is meant as a benchmark — it is a structured way to *argue* about tradeoffs.

## License

MIT — see [LICENSE](./LICENSE).
