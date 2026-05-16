import { qualityAttributes } from './data.ts'
import { solveEquilibrium } from './tradeoff.ts'

/*
  Regression guard for the "god-mode" class of bug: pushing an outcome
  attribute (Maintainability, Testability, Reusability, ...) up in
  isolation must NOT make Affordability climb. Outcomes are emergent;
  they are paid for through engineering effort, not summoned for free.

  The investmentCost field in data.ts generates inherent edges in
  tradeoff.ts that route this cost through the foundation rail. If those
  edges ever get dropped or weakened to the point where Affordability
  goes positive on a single outcome lift, this test fails.
*/

const lockedRail = ['Affordability', 'Complexity', 'Reliability'] as const

function affordabilityWhenLifting(driver: string, intent: number): number {
  const intents = new Map([[driver, intent]])
  const selected = new Set<string>([driver, ...lockedRail])
  const equilibrium = solveEquilibrium(intents, selected)
  return equilibrium.get('Affordability') ?? 0
}

describe('investment-cost regression: outcome attributes never grant free Affordability', () => {
  /*
    Sample of outcomes most prone to the original bug. Listed explicitly
    instead of iterating every outcome because the failure modes vary in
    flavour and a focused list makes regressions easier to read.
  */
  const sampledOutcomes = [
    'Maintainability',
    'Testability',
    'Reusability',
    'Modifiability',
    'Sustainability',
    'Robustness',
    'Understandability',
    'Evolvability',
    'Composability',
  ] as const

  for (const outcome of sampledOutcomes) {
    it(`lifting ${outcome} alone never makes Affordability climb`, () => {
      // Sanity check the attribute still exists; refactors can rename them.
      expect(qualityAttributes.some((a) => a.name === outcome)).toBe(true)
      const affordability = affordabilityWhenLifting(outcome, 80)
      expect(affordability).toBeLessThanOrEqual(0)
    })
  }
})
