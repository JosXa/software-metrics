import { qualityAttributes } from './data.ts'
import { type Edge, edges } from './edges.ts'

export type SourceState = ReadonlyMap<string, number>

export type EffectContribution = {
  readonly source: string
  readonly direction: 'positive' | 'negative'
  readonly influence: number
  readonly delta: number
  readonly note: string | undefined
  readonly confidence: Edge['confidence']
}

export type DerivedEffect = {
  readonly target: string
  readonly value: number
  readonly absMagnitude: number
  readonly netSign: 'positive' | 'negative' | 'neutral'
  readonly contributions: readonly EffectContribution[]
  readonly clamped: boolean
}

/*
  Inherent investment cost edges. For every attribute with investmentCost
  greater than 0 we synthesize two edges: source → Affordability (negative,
  "investing in this costs money/time") and source → Complexity (positive,
  "investing in this adds moving parts"). Outcome attributes also charge
  more on Complexity than levers, because outcomes only "go up" via
  abstraction work that bites Complexity twice.

  This is what fixes the god-mode problem: Testability or Maintainability
  can no longer climb without paying Affordability and Complexity, the
  same way you cannot avoid those costs in real software.

  Synthesized edges carry confidence='inherent' so the relations dialog
  and pressure popovers can label them honestly as "intrinsic cost of
  raising X" rather than as a curated opinion.
*/
const inherentInfluenceTable: Readonly<Record<number, EdgeInfluenceForCost>> = {
  1: 1,
  2: 3,
  3: 5,
}

type EdgeInfluenceForCost = 1 | 2 | 3 | 5

function oneStepLowerInfluence(influence: EdgeInfluenceForCost): EdgeInfluenceForCost {
  if (influence === 5) return 3
  if (influence === 3) return 2
  return 1
}

function inherentEdgesFor(name: string, kind: string, cost: number): readonly Edge[] {
  if (cost <= 0) return []
  const baseInfluence = inherentInfluenceTable[cost] ?? 1
  // Outcomes are bought through layers of indirection; complexity scales
  // higher than the affordability hit. Levers cost more wallet, less
  // brain.
  const affordabilityInfluence: EdgeInfluenceForCost =
    kind === 'outcome' ? oneStepLowerInfluence(baseInfluence) : baseInfluence
  const complexityInfluence: EdgeInfluenceForCost =
    kind === 'outcome' ? baseInfluence : oneStepLowerInfluence(baseInfluence)
  return [
    {
      source: name,
      target: 'Affordability',
      direction: 'negative',
      influence: affordabilityInfluence,
      confidence: 'inherent',
      note: 'Investing in this costs engineering time, infrastructure, and ongoing operations.',
    },
    {
      source: name,
      target: 'Complexity',
      direction: 'positive',
      influence: complexityInfluence,
      confidence: 'inherent',
      note:
        kind === 'outcome'
          ? 'Outcome qualities only go up through layers of abstraction; Complexity is the price.'
          : 'Investing in this adds moving parts, configuration, and concepts to track.',
    },
  ]
}

const inherentEdges: readonly Edge[] = qualityAttributes.flatMap((attribute) =>
  inherentEdgesFor(attribute.name, attribute.kind, attribute.investmentCost),
)

const allEdges: readonly Edge[] = [...edges, ...inherentEdges]

const edgesBySource = new Map<string, Edge[]>()
const edgesByTarget = new Map<string, Edge[]>()
const weightedOutDegree = new Map<string, number>()
const weightedInDegree = new Map<string, number>()
for (const edge of allEdges) {
  const fromList = edgesBySource.get(edge.source) ?? []
  fromList.push(edge)
  edgesBySource.set(edge.source, fromList)
  const toList = edgesByTarget.get(edge.target) ?? []
  toList.push(edge)
  edgesByTarget.set(edge.target, toList)

  const weight = edge.influence / 5
  weightedOutDegree.set(edge.source, (weightedOutDegree.get(edge.source) ?? 0) + weight)
  weightedInDegree.set(edge.target, (weightedInDegree.get(edge.target) ?? 0) + weight)
}

export function edgesFromSource(source: string): readonly Edge[] {
  return edgesBySource.get(source) ?? []
}

export function edgesToTarget(target: string): readonly Edge[] {
  return edgesByTarget.get(target) ?? []
}

const valueClampMin = -100
const valueClampMax = 100
/*
  Hub-normalization budget. Sources and targets whose weighted degree
  exceeds this threshold get their per-edge influence scaled down so a
  single highly-connected attribute can't drown out the system.
  Increasing the budget effectively dials up the strength of every
  relationship, because more attributes stay below the cap and pay no
  damping. Treat it as the single global "strength of relationships"
  knob.
*/
const weightedDegreeBudget = 3.125

export function clampValue(value: number): number {
  return Math.min(valueClampMax, Math.max(valueClampMin, value))
}

function deltaFor(edge: Edge, sourceValue: number): number {
  const directionMultiplier = edge.direction === 'positive' ? 1 : -1
  return sourceValue * directionMultiplier * (edge.influence / 5) * normalizedInfluenceFactor(edge)
}

function budgetFactor(weightedDegree: number): number {
  if (weightedDegree <= weightedDegreeBudget) return 1
  return weightedDegreeBudget / weightedDegree
}

function normalizedInfluenceFactor(edge: Edge): number {
  const sourceFactor = budgetFactor(weightedOutDegree.get(edge.source) ?? 0)
  const targetFactor = budgetFactor(weightedInDegree.get(edge.target) ?? 0)
  return Math.sqrt(sourceFactor * targetFactor)
}

function contributionsFromSources(sources: SourceState): Map<string, EffectContribution[]> {
  const accumulator = new Map<string, EffectContribution[]>()
  for (const [sourceName, sourceValue] of sources) {
    if (sourceValue === 0) continue
    for (const edge of edgesBySource.get(sourceName) ?? []) {
      const delta = deltaFor(edge, sourceValue)
      if (delta === 0) continue
      const list = accumulator.get(edge.target) ?? []
      list.push({
        source: sourceName,
        direction: edge.direction,
        influence: edge.influence,
        delta,
        note: edge.note,
        confidence: edge.confidence,
      })
      accumulator.set(edge.target, list)
    }
  }
  return accumulator
}

function buildDerivedEffect(
  target: string,
  contributions: readonly EffectContribution[],
): DerivedEffect {
  const rawSum = contributions.reduce((sum, contribution) => sum + contribution.delta, 0)
  const value = clampValue(rawSum)
  const ordered = contributions.toSorted(
    (a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.source.localeCompare(b.source),
  )
  return {
    target,
    value,
    absMagnitude: Math.abs(value),
    netSign: value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral',
    contributions: ordered,
    clamped: value !== rawSum,
  }
}

/*
  For a given map of source -> [-100..100] values, compute every target's
  combined effect. Contributions sum additively (with sign), then clamp.
*/
export function computeDerivedEffects(sources: SourceState): readonly DerivedEffect[] {
  const accumulator = contributionsFromSources(sources)
  const results: DerivedEffect[] = []
  for (const [target, contributions] of accumulator) {
    results.push(buildDerivedEffect(target, contributions))
  }
  return results.toSorted(
    (a, b) => b.absMagnitude - a.absMagnitude || a.target.localeCompare(b.target),
  )
}

/*
  Equilibrium solver. Each selected attribute's actual value is the fixed
  point of: equilibrium = clamp(userIntent + sum of incoming contributions
  from other selected attributes, where contributions read each source's
  own equilibrium, not its intent).

  This intentionally couples all selected sliders into one system. Negative
  back-edges can pin a slider against the user's will (the "fight"); strong
  positive chains saturate near ±100. Only edges between currently selected
  nodes count, because only selected nodes are part of the rendered system.

  Jacobi iteration with damping. Damping suppresses oscillation when a
  cycle has net negative gain. Iterations are bounded; if a configuration
  truly oscillates, we return the last damped state, which is visually
  stable enough to interact with.
*/
const equilibriumMaxIterations = 80
const equilibriumTolerance = 0.25
const equilibriumDamping = 0.5

function incomingContributionAt(
  target: string,
  selected: ReadonlySet<string>,
  current: ReadonlyMap<string, number>,
): number {
  let contribution = 0
  for (const edge of edgesByTarget.get(target) ?? []) {
    if (!selected.has(edge.source)) continue
    contribution += deltaFor(edge, current.get(edge.source) ?? 0)
  }
  return contribution
}

function equilibriumStep(
  intents: SourceState,
  selected: ReadonlySet<string>,
  current: Map<string, number>,
): number {
  let maxDelta = 0
  const next = new Map<string, number>()
  for (const name of selected) {
    const intent = intents.get(name) ?? 0
    const contribution = incomingContributionAt(name, selected, current)
    const target = clampValue(intent + contribution)
    const previous = current.get(name) ?? 0
    const value = previous + (target - previous) * equilibriumDamping
    next.set(name, value)
    const delta = Math.abs(value - previous)
    if (delta > maxDelta) maxDelta = delta
  }
  for (const [name, value] of next) current.set(name, value)
  return maxDelta
}

export function solveEquilibrium(
  intents: SourceState,
  selected: ReadonlySet<string>,
): ReadonlyMap<string, number> {
  const current = new Map<string, number>()
  for (const name of selected) {
    current.set(name, clampValue(intents.get(name) ?? 0))
  }
  for (let iteration = 0; iteration < equilibriumMaxIterations; iteration++) {
    const maxDelta = equilibriumStep(intents, selected, current)
    if (maxDelta < equilibriumTolerance) break
  }
  return current
}

export function formatSignedValue(value: number): string {
  if (value === 0) return '0'
  const rounded = Math.round(value)
  return rounded > 0 ? `+${rounded.toString()}` : rounded.toString()
}
