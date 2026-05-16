import { presets } from './presets.ts'
import { solveEquilibrium } from './tradeoff.ts'

const lockedFoundationMetrics = ['Affordability', 'Complexity', 'Reliability'] as const

function solvePreset(name: string): ReadonlyMap<string, number> {
  const preset = presets.find((candidate) => candidate.name === name)
  if (preset === undefined) throw new Error(`Missing preset ${name}`)
  const intents = new Map(preset?.intents)
  const selected = new Set([
    ...lockedFoundationMetrics,
    ...(preset?.intents.map(([attributeName]) => attributeName) ?? []),
  ])
  return solveEquilibrium(intents, selected)
}

function solveScenario(
  entries: readonly (readonly [string, number])[],
): ReadonlyMap<string, number> {
  const intents = new Map(entries)
  const selected = new Set([
    ...lockedFoundationMetrics,
    ...entries.map(([attributeName]) => attributeName),
  ])
  return solveEquilibrium(intents, selected)
}

function metricValue(equilibrium: ReadonlyMap<string, number>, name: string): number {
  return equilibrium.get(name) ?? 0
}

describe('scenario regressions', () => {
  it('keeps banking expensive, complex, and control-heavy', () => {
    const equilibrium = solvePreset('Banking')

    expect(metricValue(equilibrium, 'Affordability')).toBeLessThan(-80)
    expect(metricValue(equilibrium, 'Complexity')).toBeGreaterThan(80)
    expect(metricValue(equilibrium, 'Integrity')).toBeGreaterThan(80)
    expect(metricValue(equilibrium, 'Auditability')).toBeGreaterThan(80)
    expect(metricValue(equilibrium, 'Confidentiality')).toBeGreaterThan(80)
  })

  it('keeps mobile useful without saturating its complexity ledger', () => {
    const equilibrium = solvePreset('Mobile app')

    expect(metricValue(equilibrium, 'Mobility')).toBeGreaterThan(70)
    expect(metricValue(equilibrium, 'Usability')).toBeGreaterThan(80)
    expect(metricValue(equilibrium, 'Responsiveness')).toBeGreaterThan(80)
    expect(metricValue(equilibrium, 'Affordability')).toBeLessThan(-30)
    expect(metricValue(equilibrium, 'Complexity')).toBeGreaterThan(30)
    expect(metricValue(equilibrium, 'Complexity')).toBeLessThan(90)
  })

  it('keeps embedded systems safety-focused without making complexity explode', () => {
    const equilibrium = solvePreset('Embedded')

    expect(metricValue(equilibrium, 'Reliability')).toBeGreaterThan(80)
    expect(metricValue(equilibrium, 'Safety')).toBeGreaterThan(80)
    expect(metricValue(equilibrium, 'Predictability')).toBeGreaterThan(70)
    expect(metricValue(equilibrium, 'Complexity')).toBeLessThan(40)
  })

  it('makes a cheap MVP narrow and simple rather than magically excellent', () => {
    const equilibrium = solveScenario([
      ['Affordability', 70],
      ['Simplicity', 60],
      ['Functionality', 30],
      ['Complexity', -50],
      ['Securability', 0],
      ['Scalability', 0],
      ['Availability', 0],
    ])

    expect(metricValue(equilibrium, 'Affordability')).toBeGreaterThan(60)
    expect(metricValue(equilibrium, 'Complexity')).toBeLessThan(-40)
    expect(metricValue(equilibrium, 'Simplicity')).toBeGreaterThan(80)
    expect(metricValue(equilibrium, 'Functionality')).toBeLessThan(0)
    expect(metricValue(equilibrium, 'Scalability')).toBeLessThan(0)
    expect(metricValue(equilibrium, 'Availability')).toBeLessThan(0)
  })

  it('makes distributed services trade scale for consistency and operability', () => {
    const equilibrium = solveScenario([
      ['Distributability', 70],
      ['Scalability', 60],
      ['Availability', 60],
      ['Autonomy', 50],
      ['Interoperability', 50],
      ['Consistency', 0],
      ['Debuggability', 0],
      ['Operability', 0],
    ])

    expect(metricValue(equilibrium, 'Scalability')).toBeGreaterThan(80)
    expect(metricValue(equilibrium, 'Availability')).toBeGreaterThan(80)
    expect(metricValue(equilibrium, 'Affordability')).toBeLessThan(-40)
    expect(metricValue(equilibrium, 'Consistency')).toBeLessThan(-70)
    expect(metricValue(equilibrium, 'Debuggability')).toBeLessThan(-20)
    expect(metricValue(equilibrium, 'Operability')).toBeLessThan(-20)
  })

  it('keeps accessibility-first work beneficial without treating it as huge complexity tax', () => {
    const equilibrium = solveScenario([
      ['Accessibility', 70],
      ['Usability', 50],
      ['Effectiveness', 0],
      ['Learnability', 0],
      ['Complexity', 0],
    ])

    expect(metricValue(equilibrium, 'Accessibility')).toBeGreaterThan(80)
    expect(metricValue(equilibrium, 'Usability')).toBeGreaterThan(70)
    expect(metricValue(equilibrium, 'Effectiveness')).toBeGreaterThan(40)
    expect(metricValue(equilibrium, 'Learnability')).toBeGreaterThan(0)
    expect(metricValue(equilibrium, 'Complexity')).toBeLessThan(60)
  })
})
