import qualityData from '../software-quality-attributes.json'

import { edges } from './edges.ts'

export type QualityCategory = {
  readonly name: string
  readonly domain: string
  readonly qualityAttributes: readonly string[]
}

export type RawQualityAttribute = {
  readonly name: string
  readonly definition: string
  readonly categoryOrAcronym: readonly string[]
  readonly hasPositiveEffectsOn: readonly string[]
  readonly hasNegativeEffectsOn: readonly string[]
}

export type SoftwareQualityData = {
  readonly title: string
  readonly source: string
  readonly mainSource: string
  readonly extractedAt: string
  readonly categories: readonly QualityCategory[]
  readonly qualityAttributes: readonly RawQualityAttribute[]
}

export const softwareQualityData: SoftwareQualityData = qualityData

/*
  A handful of the source definitions read awkwardly or mix attribute
  with effect. These are tightened, kept short, and edit the spirit of
  the original. The unedited text is retained on the raw record.
*/
const definitionOverrides: Readonly<Record<string, string>> = {
  Accessibility:
    'How well the software supports people with disabilities, including assistive technologies.',
  Accountability:
    'How clearly the software records who did what, and how cleanly those records can be inspected.',
  Affordability: 'How readily the cost of running and owning the software fits real budgets.',
  Capabilities: 'The breadth of distinct things the software is able to do.',
  Complexity:
    'How much intricacy the design carries: hard to hold in one head, hard to predict, hard to change.',
  Composability: 'How freely the software can be assembled from independent parts.',
  Customizability: 'How far end users can shape the software to their own preferences.',
  Determinability: 'How tightly the software ties its outputs to its inputs.',
  Durability: 'How long the software keeps working under stress.',
  'Failure Transparency':
    'How honestly the software exposes its failures and their consequences instead of hiding them.',
  Functionality: 'The set of things the software actually does.',
  Inspectability: 'How readily a human can look inside the running software.',
  Mobility: 'How well the software follows users across devices and environments.',
  Orthogonality: 'How independent the software\u2019s parts are from each other.',
  Producibility: 'How reliably the software can be built and rebuilt at scale.',
  Repeatability: 'Same input, same conditions, same output.',
  Reproducibility: 'Same result across environments, machines, and time.',
  'Serviceability/Supportability':
    'How easy the software is to support, service, and keep healthy in production.',
  Tailorability: 'How well the software can be adjusted to fit a specific user or workflow.',
  Ubiquity: 'How widely the software is available across platforms and devices.',
  Vulnerability:
    'How exposed the software is to unauthorized access or exploitation. Higher is worse.',
}

export type AttributePolarity = 'good' | 'bad' | 'neutral'

/*
  Distinction between attributes you can directly *invest* in (levers) and
  attributes that *emerge* from those investments (outcomes). Without it,
  the rail behaved like a god-mode console: drag Maintainability or
  Testability up and the whole graph lit green for free.

  - foundation: the three universal cost ledgers (Affordability, Complexity,
    Reliability). Always pinned, no investment cost (they ARE the cost).
  - lever: a thing you can spend hours/$/architecture on and it goes up
    (Modularity, Observability, Caching, Encryption-style choices).
  - outcome: a system property that only goes up because lots of levers
    went up first (Maintainability, Testability, Reusability, Robustness).
*/
export type AttributeKind = 'foundation' | 'lever' | 'outcome'

/*
  Investment cost answers "how much does it cost to actually raise this
  attribute in real software?", on a 0..3 scale. The math turns this into
  inherent edges so foundation metrics absorb the cost transparently:

  - 0: free / descriptive (Capabilities, Functionality) or you wouldn't
       want to raise it (Vulnerability) or the attribute IS a cost ledger
       (foundations).
  - 1: cheap / mostly design discipline (Simplicity, Customizability,
       Predictability).
  - 2: real engineering effort, often ongoing (Performance, Maintainability,
       Testability, Auditability).
  - 3: major ongoing investment in infra, redundancy, certification, or
       adversary response (Securability, Availability, Scalability, Safety,
       Observability).
*/
export type InvestmentCost = 0 | 1 | 2 | 3

export type QualityAttribute = {
  readonly name: string
  readonly definition: string
  readonly originalDefinition: string
  readonly categoryOrAcronym: readonly string[]
  readonly hasPositiveEffectsOn: readonly string[]
  readonly hasNegativeEffectsOn: readonly string[]
  readonly polarity: AttributePolarity
  readonly kind: AttributeKind
  readonly investmentCost: InvestmentCost
}

/*
  Whether more-of-this is generally a good or bad thing for the system.
  Most attributes are "good" by definition (Maintainability, Reliability).
  Two are "bad" (Complexity, Vulnerability). A handful are "neutral" because
  they only become good or bad in context (Mobility, Composability,
  Distributability, Customizability, Autonomy, etc).
*/
const polarityOverrides: Readonly<Record<string, AttributePolarity>> = {
  Complexity: 'bad',
  Vulnerability: 'bad',
  Customizability: 'neutral',
  Composability: 'neutral',
  Distributability: 'neutral',
  Mobility: 'neutral',
  Tailorability: 'neutral',
  Configurability: 'neutral',
  Capabilities: 'neutral',
  Functionality: 'neutral',
  Ubiquity: 'neutral',
  Atomicity: 'neutral',
  Autonomy: 'neutral',
}

function polarityFor(name: string): AttributePolarity {
  return polarityOverrides[name] ?? 'good'
}

const foundationNames = new Set(['Affordability', 'Complexity', 'Reliability'])

/*
  Outcomes are properties of the system that you can't directly engineer:
  they emerge from many lever decisions. Letting users drag these up freely
  was the source of the god-mode behaviour. Listed explicitly so adding new
  attributes defaults to 'lever' (which is honest for most things you can
  actually choose to invest in).
*/
const outcomeNames = new Set([
  'Adaptability',
  'Composability',
  'Correctness',
  'Credibility',
  'Dependability',
  'Effectiveness',
  'Evolvability',
  'Fault-Tolerance',
  'Flexibility',
  'Interoperability',
  'Maintainability',
  'Modifiability',
  'Operability',
  'Predictability',
  'Resilience',
  'Reusability',
  'Robustness',
  'Seamlessness',
  'Self-Sustainability',
  'Stability',
  'Survivability',
  'Sustainability',
  'Testability',
  'Understandability',
  'Upgradability',
  'Usability',
])

function kindFor(name: string): AttributeKind {
  if (foundationNames.has(name)) return 'foundation'
  if (outcomeNames.has(name)) return 'outcome'
  return 'lever'
}

/*
  Investment cost overrides. Anything not listed defaults to a kind-based
  baseline below. We list anything where reality strongly disagrees with
  the default. The map is the single source of truth for "how much should
  raising this attribute hurt Affordability and Complexity directly?".
*/
const investmentCostOverrides: Readonly<Record<string, InvestmentCost>> = {
  // Foundations are the cost ledger themselves.
  Affordability: 0,
  Complexity: 0,
  Reliability: 0,
  // Pure descriptions of "what the software does", not investments.
  Capabilities: 0,
  Functionality: 0,
  // Vulnerability is bad — raising it costs nothing, you just stop trying.
  Vulnerability: 0,
  // Cheap design discipline.
  Simplicity: 1,
  Predictability: 1,
  Customizability: 1,
  Configurability: 1,
  Tailorability: 1,
  Atomicity: 1,
  Composability: 1,
  Modularity: 2,
  Orthogonality: 2,
  // Real ongoing engineering effort.
  Maintainability: 2,
  Modifiability: 2,
  Testability: 2,
  Understandability: 2,
  Documentation: 2,
  Performance: 2,
  Efficiency: 2,
  Accessibility: 2,
  Localizability: 2,
  Auditability: 2,
  Traceability: 2,
  Inspectability: 2,
  Operability: 2,
  Deployability: 2,
  Installability: 1,
  Portability: 2,
  Interoperability: 2,
  Compatibility: 2,
  Reusability: 2,
  Extensibility: 2,
  Evolvability: 2,
  // Major ongoing investment.
  Securability: 3,
  Confidentiality: 3,
  Integrity: 3,
  Privacy: 3,
  Availability: 3,
  Scalability: 3,
  'Fault-Tolerance': 3,
  Safety: 3,
  Survivability: 3,
  Recoverability: 3,
  Resilience: 3,
  Robustness: 3,
  Observability: 3,
  Manageability: 2,
  'Serviceability/Supportability': 2,
  Sustainability: 2,
  'Self-Sustainability': 2,
  Provability: 3,
  'Standards Compliance': 3,
  Demonstrability: 2,
  Accountability: 2,
  Credibility: 2,
  Dependability: 2,
}

function defaultCostForKind(kind: AttributeKind): InvestmentCost {
  if (kind === 'foundation') return 0
  if (kind === 'outcome') return 2
  return 2
}

function investmentCostFor(name: string, kind: AttributeKind): InvestmentCost {
  return investmentCostOverrides[name] ?? defaultCostForKind(kind)
}

export const qualityAttributes: readonly QualityAttribute[] = softwareQualityData.qualityAttributes
  .map((raw) => {
    const override = definitionOverrides[raw.name]
    const kind = kindFor(raw.name)
    return {
      ...raw,
      originalDefinition: raw.definition,
      definition: override ?? raw.definition,
      polarity: polarityFor(raw.name),
      kind,
      investmentCost: investmentCostFor(raw.name, kind),
    }
  })
  .toSorted((a, b) => a.name.localeCompare(b.name))

export const attributeByName: ReadonlyMap<string, QualityAttribute> = new Map(
  qualityAttributes.map((attribute) => [attribute.name, attribute]),
)

export type AttributeName = string

export type AttributeIndex = ReadonlyMap<AttributeName, QualityAttribute>

export const totalEdgeCount = edges.length
