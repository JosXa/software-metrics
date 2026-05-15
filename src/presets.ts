/*
  Opinionated starting points. Each preset names a kind of software and
  the qualities its builders typically prioritize, with rough intent
  values on the same -100..+100 scale the sliders use. The math then
  takes over: equilibrium will redistribute, back-pressure will appear,
  and the user can adjust from there.

  Intents target multiples of 5 to match the fader's snap step.

  Polarity reminder: a "bad" attribute (Complexity, Vulnerability) at
  intent -60 means "I want little of this". Positive intent on a "good"
  attribute means "I want more of this". The faders color accordingly.
*/

/*
  Two flavors of preset:

  - 'domain' answers "what am I building?" Each names a kind of software
    and seeds opinionated intents on attributes its builders typically
    prioritize. Values are uneven on purpose.
  - 'framework' answers "what canonical model am I evaluating against?"
    Each names a well-known acronym (RASUI, FURPS, ACID, CIA, etc.) and
    loads its members at a uniform mid-positive intent. Acronyms don't
    rank their own members, so neither do we; the equilibrium math then
    surfaces which members reinforce each other and which fight.
*/
export type PresetKind = 'domain' | 'framework'

export type Preset = {
  readonly name: string
  readonly kind: PresetKind
  readonly summary: string
  readonly intents: readonly (readonly [string, number])[]
}

const frameworkIntent = 60

function frameworkPreset(name: string, summary: string, members: readonly string[]): Preset {
  return {
    name,
    kind: 'framework',
    summary,
    intents: members.map((member) => [member, frameworkIntent] as const),
  }
}

export const presets: readonly Preset[] = [
  {
    name: 'SaaS',
    kind: 'domain',
    summary: 'Multi-tenant web product. Uptime, security, and ops legibility before raw speed.',
    intents: [
      ['Availability', 80],
      ['Securability', 80],
      ['Scalability', 70],
      ['Observability', 70],
      ['Maintainability', 60],
      ['Auditability', 50],
      ['Affordability', 30],
      ['Complexity', 30],
    ],
  },
  {
    name: 'CLI tool',
    kind: 'domain',
    summary: 'One job, well done. Simple, fast, scriptable, with no surprises.',
    intents: [
      ['Simplicity', 80],
      ['Performance', 60],
      ['Portability', 70],
      ['Composability', 70],
      ['Learnability', 40],
      ['Reliability', 60],
      ['Complexity', -60],
    ],
  },
  {
    name: 'Static site',
    kind: 'domain',
    summary: 'Editorial or marketing site. Read by everyone, fast, cheap to keep alive.',
    intents: [
      ['Accessibility', 80],
      ['Usability', 80],
      ['Performance', 70],
      ['Simplicity', 70],
      ['Maintainability', 50],
      ['Affordability', 60],
      ['Complexity', -70],
    ],
  },
  {
    name: 'Microservice',
    kind: 'domain',
    summary: 'A piece of a larger system. Boundaries, instrumentation, and fast deploys matter.',
    intents: [
      ['Modularity', 80],
      ['Observability', 80],
      ['Deployability', 70],
      ['Fault-Tolerance', 70],
      ['Scalability', 70],
      ['Testability', 70],
      ['Maintainability', 60],
      ['Complexity', 30],
    ],
  },
  {
    name: 'Mobile app',
    kind: 'domain',
    summary: 'Runs on someone else\u2019s battery. Smooth, frugal, reachable across devices.',
    intents: [
      ['Mobility', 80],
      ['Usability', 80],
      ['Performance', 70],
      ['Efficiency', 70],
      ['Accessibility', 60],
      ['Securability', 50],
      ['Sustainability', 50],
    ],
  },
  {
    name: 'Government',
    kind: 'domain',
    summary: 'Public infrastructure. Reachable, traceable, accountable, by law and by default.',
    intents: [
      ['Accessibility', 90],
      ['Auditability', 60],
      ['Accountability', 55],
      ['Transparency', 50],
      ['Standards Compliance', 80],
      ['Privacy', 50],
      ['Reliability', 70],
      ['Securability', 55],
      ['Confidentiality', 70],
    ],
  },
  {
    name: 'Embedded',
    kind: 'domain',
    summary: 'Firmware, sensors, controllers. Tight resources, hard guarantees.',
    intents: [
      ['Efficiency', 90],
      ['Reliability', 90],
      ['Determinability', 80],
      ['Safety', 70],
      ['Predictability', 70],
      ['Performance', 60],
      ['Complexity', -70],
    ],
  },
  {
    name: 'Banking',
    kind: 'domain',
    summary: 'Money moves. Integrity, confidentiality, and accountability above all.',
    intents: [
      ['Securability', 90],
      ['Integrity', 90],
      ['Auditability', 90],
      ['Confidentiality', 80],
      ['Accountability', 80],
      ['Availability', 80],
      ['Reliability', 80],
      ['Standards Compliance', 70],
    ],
  },

  /*
    Framework presets. Each acronym below comes from the canonical
    Wikipedia summary of "common subsets" of quality attributes. We map
    each member to the closest attribute we actually have in our dataset.
    Notes:
      - "Serviceability" maps to "Serviceability/Supportability".
      - "Security" is a composite term in the source paragraph; we use
        Securability (the attribute we have, meaning ability-to-be-secured).
      - "Isolation" from ACID has no direct attribute; we omit it rather
        than fake it.
      - "Supportability" from FURPS maps to Serviceability/Supportability.
  */
  frameworkPreset(
    'RASUI',
    'Reliability, Availability, Serviceability, Usability, Installability.',
    ['Reliability', 'Availability', 'Serviceability/Supportability', 'Usability', 'Installability'],
  ),
  frameworkPreset('FURPS', 'Functionality, Usability, Reliability, Performance, Supportability.', [
    'Functionality',
    'Usability',
    'Reliability',
    'Performance',
    'Serviceability/Supportability',
  ]),
  frameworkPreset(
    'Agility-7',
    'Architecturally sensitive: Debuggability, Extensibility, Portability, Scalability, Securability, Testability, Understandability.',
    [
      'Debuggability',
      'Extensibility',
      'Portability',
      'Scalability',
      'Securability',
      'Testability',
      'Understandability',
    ],
  ),
  frameworkPreset(
    'RASR',
    'Database lens: Reliability, Availability, Scalability, Recoverability.',
    ['Reliability', 'Availability', 'Scalability', 'Recoverability'],
  ),
  frameworkPreset(
    'ACID',
    'Transaction lens: Atomicity, Consistency, Integrity, Durability. (No Isolation attribute in our dataset.)',
    ['Atomicity', 'Consistency', 'Integrity', 'Durability'],
  ),
  frameworkPreset(
    'RAMS',
    'Safety-critical lens: Reliability, Availability, Maintainability, Safety.',
    ['Reliability', 'Availability', 'Maintainability', 'Safety'],
  ),
  frameworkPreset('CIA', 'Information security: Confidentiality, Integrity, Availability.', [
    'Confidentiality',
    'Integrity',
    'Availability',
  ]),
  frameworkPreset(
    'Dependability',
    'Availability, Reliability, Safety, Integrity, Maintainability.',
    ['Availability', 'Reliability', 'Safety', 'Integrity', 'Maintainability'],
  ),
]

/*
  A preset is considered "active" when every attribute it declares is
  selected at exactly the intent it asked for. We ignore locked drivers
  in the size check, since the app pins those onto every selection
  regardless of preset.
*/
export function presetMatches(
  preset: Preset,
  selected: ReadonlySet<string>,
  intents: ReadonlyMap<string, number>,
  lockedNames: ReadonlySet<string> = new Set(),
): boolean {
  let nonLockedSelectedCount = 0
  for (const name of selected) {
    if (!lockedNames.has(name)) nonLockedSelectedCount += 1
  }
  const presetNonLockedCount = preset.intents.reduce(
    (acc, [name]) => (lockedNames.has(name) ? acc : acc + 1),
    0,
  )
  if (presetNonLockedCount !== nonLockedSelectedCount) return false
  for (const [name, value] of preset.intents) {
    if (!selected.has(name)) return false
    if (intents.get(name) !== value) return false
  }
  return true
}
