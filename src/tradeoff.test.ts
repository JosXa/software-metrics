import { presets } from './presets.ts'
import { clampValue, computeDerivedEffects, edgesFromSource, solveEquilibrium } from './tradeoff.ts'

describe('tradeoff math', () => {
  it('clamps to ±100', () => {
    expect(clampValue(150)).toBe(100)
    expect(clampValue(-150)).toBe(-100)
    expect(clampValue(42)).toBe(42)
  })

  it('skips zero-valued sources', () => {
    const effects = computeDerivedEffects(new Map([['Performance', 0]]))
    expect(effects).toHaveLength(0)
  })

  it('applies direction and influence to derive a target value', () => {
    const performanceEdges = edgesFromSource('Performance')
    const responsivenessEdge = performanceEdges.find((edge) => edge.target === 'Responsiveness')
    expect(responsivenessEdge?.direction).toBe('positive')
    expect(responsivenessEdge?.influence).toBe(5)

    const effects = computeDerivedEffects(new Map([['Performance', 100]]))
    const responsiveness = effects.find((effect) => effect.target === 'Responsiveness')
    expect(responsiveness?.value).toBeCloseTo(70.71)
    expect(responsiveness?.netSign).toBe('positive')
  })

  it('sums multi-source contributions with sign', () => {
    // Modularity → Maintainability is +5; Complexity → Maintainability is −5.
    // Degree normalization can make the terms uneven, but they still mostly cancel.
    const sources = new Map([
      ['Modularity', 50],
      ['Complexity', 50],
    ])
    const effects = computeDerivedEffects(sources)
    const maintainability = effects.find((effect) => effect.target === 'Maintainability')
    expect(maintainability).toBeDefined()
    expect(maintainability?.contributions.length).toBeGreaterThanOrEqual(2)
    expect(Math.abs(maintainability?.value ?? Number.NaN)).toBeLessThan(3)
  })

  it('models broad complexity influence as weak pressure', () => {
    const accountabilityEdges = edgesFromSource('Accountability')
    const complexityEdge = accountabilityEdges.find((edge) => edge.target === 'Complexity')
    expect(complexityEdge).toMatchObject({
      direction: 'positive',
      influence: 1,
      confidence: 'inferred',
    })

    const effects = computeDerivedEffects(new Map([['Accountability', 100]]))
    const complexity = effects.find((effect) => effect.target === 'Complexity')
    expect(complexity?.value).toBeGreaterThan(0)
    expect(complexity?.value).toBeLessThan(10)
  })

  it('keeps the mobile preset from saturating complexity', () => {
    const mobileApp = presets.find((preset) => preset.name === 'Mobile app')
    expect(mobileApp).toBeDefined()
    const locked = ['Affordability', 'Complexity', 'Reliability'] as const
    const intents = new Map(mobileApp?.intents)
    const selected = new Set([...locked, ...(mobileApp?.intents.map(([name]) => name) ?? [])])

    const equilibrium = solveEquilibrium(intents, selected)
    expect(equilibrium.get('Complexity')).toBeLessThan(70)
  })
})
