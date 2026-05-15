import { useCallback, useEffect, useState } from 'react'

import { attributeByName } from './data.ts'
import { Library } from './library.tsx'
import type { Preset } from './presets.ts'
import { Rail } from './rail.tsx'
import { useTheme } from './use-theme.ts'

const defaultDrivers = [
  'Affordability',
  'Complexity',
  'Reliability',
  'Performance',
  'Securability',
  'Maintainability',
  'Usability',
] as const

const lockedDrivers = ['Affordability', 'Complexity', 'Reliability'] as const
const lockedDriverSet = new Set<string>(lockedDrivers)

/*
  Intents are what the user *wishes* a slider was at. The actual rendered
  position of every slider is an equilibrium of all intents propagated
  through the curated graph of edges, recomputed on every change.
*/
const defaultIntents = new Map<string, number>([['Performance', 60]])

const stateStorageKey = 'sqm.selection'

type StoredExplorerState = {
  readonly selected: readonly string[]
  readonly values: readonly (readonly [string, number])[]
}

function safeStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const candidate = window.localStorage
    if (candidate === null || candidate === undefined) return undefined
    if (typeof candidate.getItem !== 'function') return undefined
    return candidate
  } catch {
    return undefined
  }
}

function isStoredExplorerState(value: unknown): value is StoredExplorerState {
  if (typeof value !== 'object' || value === null) return false
  if (!('selected' in value && 'values' in value)) return false
  const candidate = value as { selected: unknown; values: unknown }
  return (
    Array.isArray(candidate.selected) &&
    candidate.selected.every((entry) => typeof entry === 'string') &&
    Array.isArray(candidate.values) &&
    candidate.values.every(
      (entry) =>
        Array.isArray(entry) &&
        entry.length === 2 &&
        typeof entry[0] === 'string' &&
        typeof entry[1] === 'number' &&
        Number.isFinite(entry[1]),
    )
  )
}

function readStoredState(): StoredExplorerState | undefined {
  const raw = safeStorage()?.getItem(stateStorageKey)
  if (raw === null || raw === undefined) return undefined
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isStoredExplorerState(parsed)) return undefined
    const selected = parsed.selected.filter((name) => attributeByName.has(name))
    const selectedSet = new Set(selected)
    const values = parsed.values.filter(
      ([name, value]) => selectedSet.has(name) && value >= -100 && value <= 100,
    )
    return { selected, values }
  } catch {
    return undefined
  }
}

function withLockedDrivers(names: readonly string[]): readonly string[] {
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const name of [...lockedDrivers, ...names]) {
    if (!attributeByName.has(name) || seen.has(name)) continue
    seen.add(name)
    ordered.push(name)
  }
  return ordered
}

function initialSelected(): readonly string[] {
  return withLockedDrivers(readStoredState()?.selected ?? defaultDrivers)
}

function initialIntents(): ReadonlyMap<string, number> {
  return new Map(readStoredState()?.values ?? defaultIntents)
}

export function App() {
  const { theme, toggle } = useTheme()
  const [selected, setSelected] = useState<readonly string[]>(initialSelected)
  const [intents, setIntents] = useState<ReadonlyMap<string, number>>(initialIntents)
  const [focused, setFocused] = useState<string | undefined>(() => initialSelected()[0])

  useEffect(() => {
    const selectedSet = new Set(selected)
    const stored: StoredExplorerState = {
      selected,
      values: [...intents].filter(([name]) => selectedSet.has(name)),
    }
    safeStorage()?.setItem(stateStorageKey, JSON.stringify(stored))
  }, [selected, intents])

  const toggleDriver = useCallback((name: string) => {
    if (lockedDriverSet.has(name)) return
    setSelected((current) => {
      if (current.includes(name)) {
        return current.filter((entry) => entry !== name)
      }
      return [...current, name]
    })
    setIntents((current) => {
      if (current.has(name)) {
        const next = new Map(current)
        next.delete(name)
        return next
      }
      const next = new Map(current)
      next.set(name, 0)
      return next
    })
    setFocused((current) => {
      if (current === name) return undefined
      return name
    })
  }, [])

  const promoteDriver = useCallback((name: string) => {
    setSelected((current) => (current.includes(name) ? current : [...current, name]))
    setIntents((current) => {
      if (current.has(name)) return current
      const next = new Map(current)
      next.set(name, 0)
      return next
    })
    setFocused(name)
  }, [])

  const removeDriver = useCallback((name: string) => {
    if (lockedDriverSet.has(name)) return
    setSelected((current) => current.filter((entry) => entry !== name))
    setIntents((current) => {
      if (!current.has(name)) return current
      const next = new Map(current)
      next.delete(name)
      return next
    })
    setFocused((current) => {
      if (current !== name) return current
      return undefined
    })
  }, [])

  const setDriverIntent = useCallback((name: string, value: number) => {
    setIntents((current) => {
      const next = new Map(current)
      next.set(name, value)
      return next
    })
    setFocused(name)
  }, [])

  const resetDriver = useCallback((name: string) => {
    setIntents((current) => {
      if (!current.has(name)) return current
      const next = new Map(current)
      next.set(name, 0)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setSelected(lockedDrivers)
    setIntents(new Map())
    setFocused(lockedDrivers[0])
  }, [])

  /*
    Applying a preset is a wholesale replacement, not a merge: the user is
    saying "show me how this kind of software thinks", and the equilibrium
    only makes sense for the preset's chosen set. We snap to known
    attributes only, in case a preset references something later renamed.
  */
  const applyPreset = useCallback((preset: Preset) => {
    const validIntents = preset.intents.filter(([name]) => attributeByName.has(name))
    setSelected(withLockedDrivers(validIntents.map(([name]) => name)))
    setIntents(new Map(validIntents))
    setFocused(lockedDrivers[0])
  }, [])

  const selectedSet = new Set(selected)

  return (
    <div className="grid h-full grid-rows-[auto_1fr_auto] bg-[var(--surface-0)] text-[var(--ink-0)]">
      <Header onToggleTheme={toggle} theme={theme} />
      <main className="grid min-h-0 grid-rows-[1fr] lg:grid-cols-[minmax(20rem,22rem)_minmax(0,1fr)]">
        <Library
          lockedNames={lockedDriverSet}
          onClear={clearAll}
          onToggle={toggleDriver}
          selected={selectedSet}
        />
        <Rail
          applyPreset={applyPreset}
          focused={focused}
          intents={intents}
          promoteTarget={promoteDriver}
          lockedNames={lockedDriverSet}
          remove={removeDriver}
          resetValue={resetDriver}
          selected={selected}
          setFocused={setFocused}
          setIntent={setDriverIntent}
        />
      </main>
      <Credit />
    </div>
  )
}

type HeaderProps = {
  readonly theme: 'light' | 'dark'
  readonly onToggleTheme: () => void
}

function Header({ theme, onToggleTheme }: HeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line-soft)] bg-[var(--surface-1)] px-5 py-2.5">
      <div className="flex items-baseline gap-3">
        <span aria-hidden className="font-mono text-[11px] tracking-[0.32em] text-[var(--accent)]">
          {'SQM \u2022'}
        </span>
        <h1 className="text-[14px] font-semibold tracking-tight text-[var(--ink-0)]">
          Quality tradeoff explorer
        </h1>
        <p className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)] md:block">
          discover hidden relationships
        </p>
      </div>
      <div className="flex items-center gap-2">
        <a
          className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-2)] underline decoration-[var(--line)] decoration-dotted underline-offset-4 hover:decoration-[var(--accent)] hover:text-[var(--ink-0)] md:inline"
          href="https://en.wikipedia.org/wiki/List_of_system_quality_attributes"
          rel="noreferrer"
          target="_blank"
        >
          source list
        </a>
        <ThemeToggle onToggle={onToggleTheme} theme={theme} />
      </div>
    </header>
  )
}

type ThemeToggleProps = {
  readonly theme: 'light' | 'dark'
  readonly onToggle: () => void
}

function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const next = theme === 'light' ? 'dark' : 'light'
  return (
    <button
      aria-label={`Switch to ${next} theme`}
      className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--surface-0)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-1)] transition-colors duration-150 hover:border-[var(--accent)] hover:text-[var(--accent-ink)] focus-visible:border-[var(--accent)] focus-visible:bg-[var(--accent-soft)] focus-visible:text-[var(--accent-ink)] focus-visible:outline-none"
      onClick={onToggle}
      type="button"
    >
      <span
        aria-hidden
        className={theme === 'light' ? 'text-[var(--ink-0)]' : 'text-[var(--ink-3)]'}
      >
        light
      </span>
      <span aria-hidden className="text-[var(--ink-3)]">
        /
      </span>
      <span
        aria-hidden
        className={theme === 'dark' ? 'text-[var(--ink-0)]' : 'text-[var(--ink-3)]'}
      >
        dark
      </span>
    </button>
  )
}

function Credit() {
  return (
    <footer className="hidden border-t border-[var(--line-soft)] bg-[var(--surface-1)] px-5 py-2 lg:block">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)]">
        Built with care by{' '}
        <a
          className="underline decoration-dotted underline-offset-4 hover:text-[var(--ink-1)]"
          href="https://github.com/JosXa"
          rel="noreferrer"
          target="_blank"
        >
          @JosXa
        </a>
      </p>
    </footer>
  )
}
