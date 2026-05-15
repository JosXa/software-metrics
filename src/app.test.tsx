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

  it('toggles the theme and persists to the document', () => {
    render(<App />)

    const toggle = screen.getByRole('button', { name: switchToDarkName })
    fireEvent.click(toggle)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

    const reverseToggle = screen.getByRole('button', { name: switchToLightName })
    fireEvent.click(reverseToggle)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})
