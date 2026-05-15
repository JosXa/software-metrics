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
    // Hub-budget normalization keeps the value below the raw influence (5/5 → 100).
    expect(responsiveness?.value).toBeGreaterThan(60)
    expect(responsiveness?.value).toBeLessThan(80)
    expect(responsiveness?.netSign).toBe('positive')
  })

  it('sums multi-source contributions with sign', () => {
    // Modularity → Maintainability is positive; Complexity → Maintainability is negative.
    // Both contributions must register with opposing signs. The hub-budget
    // normalization in tradeoff.ts dilutes Complexity's voice (it is a large
    // hub), so the two no longer cancel cleanly — Modularity wins. We assert
    // the structural property rather than a magic equilibrium number.
    const sources = new Map([
      ['Modularity', 50],
      ['Complexity', 50],
    ])
    const effects = computeDerivedEffects(sources)
    const maintainability = effects.find((effect) => effect.target === 'Maintainability')
    expect(maintainability).toBeDefined()
    expect(maintainability?.contributions.length).toBeGreaterThanOrEqual(2)
    const fromModularity = maintainability?.contributions.find((c) => c.source === 'Modularity')
    const fromComplexity = maintainability?.contributions.find((c) => c.source === 'Complexity')
    expect(fromModularity?.delta).toBeGreaterThan(0)
    expect(fromComplexity?.delta).toBeLessThan(0)
  })

  it('models broad complexity influence as background pressure', () => {
    /*
      The bulk of attributes drive Complexity by inferred default at
      influence 2. The exact magnitude after hub normalization isn't worth
      pinning, but the qualitative claim ("everything weakly grows
      complexity") is — assert structure, not numbers.
    */
    const accountabilityEdges = edgesFromSource('Accountability')
    const complexityEdge = accountabilityEdges.find((edge) => edge.target === 'Complexity')
    expect(complexityEdge).toMatchObject({
      direction: 'positive',
      influence: 2,
      confidence: 'inferred',
    })

    const effects = computeDerivedEffects(new Map([['Accountability', 100]]))
    const complexity = effects.find((effect) => effect.target === 'Complexity')
    expect(complexity?.value).toBeGreaterThan(0)
    expect(complexity?.value).toBeLessThan(20)
  })

  it('keeps the mobile preset from saturating complexity', () => {
    /*
      Even after intentionally amplifying Complexity influences, a sane
      preset should not pin the slider against the ceiling. We allow up
      to 90 because Mobile (Customizability + Distributability + many
      capability-style attributes) is genuinely complexity-heavy and the
      threshold mainly guards against runaway feedback loops.
    */
    const mobileApp = presets.find((preset) => preset.name === 'Mobile app')
    expect(mobileApp).toBeDefined()
    const locked = ['Affordability', 'Complexity', 'Reliability'] as const
    const intents = new Map(mobileApp?.intents)
    const selected = new Set([...locked, ...(mobileApp?.intents.map(([name]) => name) ?? [])])

    const equilibrium = solveEquilibrium(intents, selected)
    expect(equilibrium.get('Complexity')).toBeLessThan(90)
  })

  it('keeps every preset within a sane equilibrium drift band', () => {
    /*
      Presets are hand-tuned: there is no runtime calibration. We do not
      pretend the equilibrium will land exactly on the chosen intents (the
      whole point of the tool is that attributes mutually constrain each
      other). We do guarantee that the drift between user intent and
      delivered equilibrium stays within a band that's still legible and
      teaches the lesson rather than clipping to ±100 everywhere.
    */
    const locked = ['Affordability', 'Complexity', 'Reliability'] as const
    const driftBudget = 60
    for (const preset of presets) {
      const intents = new Map(preset.intents)
      const selected = new Set([...locked, ...preset.intents.map(([name]) => name)])
      const equilibrium = solveEquilibrium(intents, selected)
      for (const [name, intent] of preset.intents) {
        const drift = Math.abs((equilibrium.get(name) ?? 0) - intent)
        expect(drift).toBeLessThanOrEqual(driftBudget)
      }
    }
  })
})
