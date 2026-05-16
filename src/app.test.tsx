import { fireEvent, render, screen, within } from '@testing-library/react'

import { App } from './app.tsx'

const titleText = /quality tradeoff explorer/i
const libraryRegionName = /attribute library/i
const railRegionName = /comparison rail/i
const performanceTileName = /performance tile/i
const securabilityTileName = /securability tile/i
const maintainabilityTileName = /maintainability tile/i
const usabilityTileName = /usability tile/i
const affordabilityTileName = /affordability tile/i
const complexityTileName = /complexity tile/i
const reliabilityTileName = /reliability tile/i
const accessibilityRowName = /^Accessibility/
const affordabilityRowName = /^Affordability/
const accessibilityTileName = /accessibility tile/i
const foundationMetricText = /foundation metric, always shown/i
const clearOptionalName = /clear optional selected attributes/i
const switchToDarkName = /switch to dark theme/i
const switchToLightName = /switch to light theme/i
const bankingPresetName = /Banking/

function installMemoryStorage() {
  const store = new Map<string, string>()
  const storage: Storage = {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => [...store.keys()][index] ?? null,
    removeItem: (key) => store.delete(key),
    setItem: (key, value) => store.set(key, value),
  }
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: storage,
  })
}

beforeEach(() => {
  installMemoryStorage()
  window.localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

describe('App shell', () => {
  it('renders header, library, and rail with the default driver loaded', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: titleText })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: libraryRegionName })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: railRegionName })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: affordabilityTileName })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: complexityTileName })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: reliabilityTileName })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: performanceTileName })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: securabilityTileName })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: maintainabilityTileName })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: usabilityTileName })).toBeInTheDocument()
    expect(screen.queryByText(foundationMetricText)).not.toBeInTheDocument()
  })

  it('toggles a driver in and out of the rail from the library', () => {
    render(<App />)

    const library = screen.getByRole('region', { name: libraryRegionName })
    const accessibilityRow = within(library).getByRole('button', { name: accessibilityRowName })

    fireEvent.click(accessibilityRow)
    expect(screen.getByRole('article', { name: accessibilityTileName })).toBeInTheDocument()

    fireEvent.click(accessibilityRow)
    expect(screen.queryByRole('article', { name: accessibilityTileName })).not.toBeInTheDocument()
  })

  it('restores the selected drivers from local storage', () => {
    window.localStorage.setItem(
      'sqm.selection',
      JSON.stringify({ selected: ['Accessibility'], values: [['Accessibility', 45]] }),
    )

    render(<App />)

    expect(screen.getByRole('article', { name: affordabilityTileName })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: complexityTileName })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: reliabilityTileName })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: accessibilityTileName })).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: performanceTileName })).not.toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Accessibility' })).toHaveAttribute(
      'aria-valuenow',
      '45',
    )
  })

  it('keeps foundation metrics pinned when users clear or click them', () => {
    render(<App />)

    const library = screen.getByRole('region', { name: libraryRegionName })
    const affordabilityRow = within(library).getByRole('button', { name: affordabilityRowName })
    fireEvent.click(affordabilityRow)
    expect(screen.getByRole('article', { name: affordabilityTileName })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: clearOptionalName }))
    expect(screen.getByRole('article', { name: affordabilityTileName })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: complexityTileName })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: reliabilityTileName })).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: performanceTileName })).not.toBeInTheDocument()
  })

  it('keeps the dragged slider thumb at the requested intent and never moves other thumbs', () => {
    /*
      Two contracts on one drag:
        1. The thumb you drag lands exactly where you put it (intent is
           ground truth, never overwritten by the equilibrium pass).
        2. Every OTHER slider's thumb stays put — only the dragged one
           moves. Cross-coupling is communicated by the equilibrium
           ghost tick, not by yanking thumbs around.
    */
    render(<App />)

    const railRegion = screen.getByRole('region', { name: railRegionName })
    const bankingButton = within(railRegion).getByRole('button', { name: bankingPresetName })
    fireEvent.click(bankingButton)

    const before = new Map(
      screen
        .getAllByRole('slider')
        .map((slider) => [
          slider.getAttribute('aria-label') ?? '',
          slider.getAttribute('aria-valuenow') ?? '',
        ]),
    )

    const securabilitySlider = screen.getByRole('slider', { name: 'Securability' })
    fireEvent.change(securabilitySlider, { target: { value: '100' } })

    expect(securabilitySlider).toHaveAttribute('aria-valuenow', '100')

    const after = new Map(
      screen
        .getAllByRole('slider')
        .map((slider) => [
          slider.getAttribute('aria-label') ?? '',
          slider.getAttribute('aria-valuenow') ?? '',
        ]),
    )
    const movedOthers = [...before.entries()].filter(
      ([name, value]) => name !== 'Securability' && after.get(name) !== value,
    )
    expect(movedOthers).toEqual([])
  })

  it('moves equilibrium ghost ticks on other tiles when one slider is dragged', () => {
    /*
      Cross-coupling regression: dragging Securability must change at
      least one OTHER tile's equilibrium readout (the ghost tick on the
      track), because that is how the explorer teaches that attributes
      pull each other through the curated graph. The thumbs themselves
      stay locked to user intent (covered by the test above).
    */
    render(<App />)

    const railRegion = screen.getByRole('region', { name: railRegionName })
    const bankingButton = within(railRegion).getByRole('button', { name: bankingPresetName })
    fireEvent.click(bankingButton)

    function snapshotEquilibria(): Map<string, string> {
      const result = new Map<string, string>()
      for (const tile of screen.getAllByRole('article')) {
        const label = tile.getAttribute('aria-label') ?? ''
        const tick = tile.querySelector<HTMLElement>('[data-testid="fader-equilibrium-tick"]')
        // Tiles with no divergence omit the tick — record the placeholder
        // so 'no tick -> tick appears' also counts as movement.
        result.set(label, tick?.dataset['value'] ?? 'none')
      }
      return result
    }

    const before = snapshotEquilibria()

    const securabilitySlider = screen.getByRole('slider', { name: 'Securability' })
    fireEvent.change(securabilitySlider, { target: { value: '100' } })

    const after = snapshotEquilibria()

    const movedOthers = [...before.entries()].filter(
      ([label, value]) => label !== 'Securability tile' && after.get(label) !== value,
    )
    expect(movedOthers.length).toBeGreaterThan(0)
  })

  it('toggles the theme and persists to the document', () => {
    /*
      Dark is the default now (see use-theme.ts), so the first toggle
      renders as "switch to light theme" and the document already carries
      data-theme=dark on first paint.
    */
    render(<App />)

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

    const toggleToLight = screen.getByRole('button', { name: switchToLightName })
    fireEvent.click(toggleToLight)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    const toggleBackToDark = screen.getByRole('button', { name: switchToDarkName })
    fireEvent.click(toggleBackToDark)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })
})
