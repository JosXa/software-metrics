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

/*
  Framework presets stack many positively-correlated qualities at once.
  Setting every member to the same mid-positive intent makes the graph
  saturate (everything clips to +100). A modest 30 keeps the visible
  intent below the ceiling and lets the equilibrium drift upward by the
  amount that the framework's mutual reinforcement actually adds.
*/
const frameworkIntent = 30
const universalTestabilityIntent = 20

function frameworkPreset(name: string, summary: string, members: readonly string[]): Preset {
  return {
    name,
    kind: 'framework',
    summary,
    intents: members.map((member) => [member, frameworkIntent] as const),
  }
}

function withUniversalTestability(preset: Preset): Preset {
  if (preset.intents.some(([name]) => name === 'Testability')) return preset

  return {
    ...preset,
    intents: [...preset.intents, ['Testability', universalTestabilityIntent]],
  }
}

const basePresets: readonly Preset[] = [
  /*
    Domain presets are hand-tuned: we picked the intent values such that
    the resulting equilibrium lands roughly where the user would expect
    given the preset's headline qualities. We intentionally do NOT chase
    perfect alignment — the whole point of this tool is that attributes
    push and pull on each other, so some drift between intent and
    equilibrium is the lesson, not a defect.
  */
  {
    name: 'SaaS',
    kind: 'domain',
    summary: 'Multi-tenant web product. Uptime, security, and ops legibility before raw speed.',
    intents: [
      ['Availability', 40],
      ['Securability', 50],
      ['Scalability', 50],
      ['Observability', 45],
      ['Maintainability', 40],
      ['Auditability', 50],
      ['Affordability', 50],
      ['Complexity', -10],
    ],
  },
  {
    name: 'CLI tool',
    kind: 'domain',
    summary: 'One job, well done. Simple, fast, scriptable, with no surprises.',
    intents: [
      ['Simplicity', 60],
      ['Performance', 70],
      ['Portability', 80],
      ['Composability', 70],
      ['Learnability', -30],
      ['Reliability', 10],
      ['Complexity', -50],
    ],
  },
  {
    name: 'Static site',
    kind: 'domain',
    summary: 'Editorial or marketing site. Read by everyone, fast, cheap to keep alive.',
    intents: [
      ['Accessibility', 60],
      ['Usability', 60],
      ['Performance', 80],
      ['Simplicity', 55],
      ['Maintainability', 25],
      ['Affordability', 55],
      ['Complexity', -65],
    ],
  },
  {
    name: 'Microservice',
    kind: 'domain',
    summary: 'A piece of a larger system. Boundaries, instrumentation, and fast deploys matter.',
    intents: [
      ['Modularity', 80],
      ['Observability', 50],
      ['Deployability', 65],
      ['Fault-Tolerance', 30],
      ['Scalability', 60],
      ['Testability', 0],
      ['Maintainability', -10],
      ['Complexity', 15],
    ],
  },
  {
    name: 'Mobile app',
    kind: 'domain',
    summary: 'Runs on someone else\u2019s battery. Smooth, frugal, reachable across devices.',
    intents: [
      ['Mobility', 0],
      ['Usability', 30],
      ['Performance', 60],
      ['Efficiency', 30],
      ['Accessibility', -55],
      ['Securability', 70],
      ['Sustainability', -50],
    ],
  },
  {
    name: 'Government',
    kind: 'domain',
    summary: 'Public infrastructure. Reachable, traceable, accountable, by law and by default.',
    intents: [
      ['Accessibility', 80],
      ['Auditability', 25],
      ['Accountability', 0],
      ['Transparency', 50],
      ['Standards Compliance', 80],
      ['Privacy', 50],
      ['Reliability', 60],
      ['Securability', 30],
      ['Confidentiality', 30],
    ],
  },
  {
    name: 'Embedded',
    kind: 'domain',
    summary: 'Firmware, sensors, controllers. Tight resources, hard guarantees.',
    intents: [
      ['Efficiency', 30],
      ['Reliability', 0],
      ['Determinability', 70],
      ['Safety', -40],
      ['Predictability', -75],
      ['Performance', 80],
      ['Complexity', -50],
    ],
  },
  {
    name: 'Banking',
    kind: 'domain',
    summary: 'Money moves. Integrity, confidentiality, and accountability above all.',
    intents: [
      ['Securability', 0],
      ['Integrity', 0],
      ['Auditability', 0],
      ['Confidentiality', -30],
      ['Accountability', -20],
      ['Availability', 0],
      ['Reliability', 0],
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
  {
    name: 'RAMS',
    kind: 'framework',
    summary: 'Safety-critical lens: Reliability, Availability, Maintainability, Safety.',
    intents: [
      ['Reliability', 0],
      ['Availability', 30],
      ['Maintainability', 0],
      ['Safety', 30],
    ],
  },
  frameworkPreset('CIA', 'Information security: Confidentiality, Integrity, Availability.', [
    'Confidentiality',
    'Integrity',
    'Availability',
  ]),
  {
    name: 'Dependability',
    kind: 'framework',
    summary: 'Availability, Reliability, Safety, Integrity, Maintainability.',
    intents: [
      ['Availability', 30],
      ['Reliability', -30],
      ['Safety', 30],
      ['Integrity', 30],
      ['Maintainability', 30],
    ],
  },
]

export const presets: readonly Preset[] = basePresets.map(withUniversalTestability)

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
