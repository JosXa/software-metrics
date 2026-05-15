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

export type QualityAttribute = {
  readonly name: string
  readonly definition: string
  readonly originalDefinition: string
  readonly categoryOrAcronym: readonly string[]
  readonly hasPositiveEffectsOn: readonly string[]
  readonly hasNegativeEffectsOn: readonly string[]
  readonly polarity: AttributePolarity
}

/*
  Whether more-of-this is generally a good or bad thing for the system.
  Most attributes are "good" by definition (Maintainability, Reliability).
  Two are "bad" (Complexity, Vulnerability). A handful are "neutral" because
  they only become good or bad in context (Mobility, Composability,
  Distributability, Customizability, etc).
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
}

function polarityFor(name: string): AttributePolarity {
  return polarityOverrides[name] ?? 'good'
}

export const qualityAttributes: readonly QualityAttribute[] = softwareQualityData.qualityAttributes
  .map((raw) => {
    const override = definitionOverrides[raw.name]
    return {
      ...raw,
      originalDefinition: raw.definition,
      definition: override ?? raw.definition,
      polarity: polarityFor(raw.name),
    }
  })
  .toSorted((a, b) => a.name.localeCompare(b.name))

export const attributeByName: ReadonlyMap<string, QualityAttribute> = new Map(
  qualityAttributes.map((attribute) => [attribute.name, attribute]),
)

export type AttributeName = string

export type AttributeIndex = ReadonlyMap<AttributeName, QualityAttribute>

export const totalEdgeCount = edges.length
