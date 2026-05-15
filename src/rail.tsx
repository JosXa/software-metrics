import { useEffect, useMemo, useRef } from 'react'

import { attributeByName } from './data.ts'
import { type Preset, presetMatches, presets } from './presets.ts'
import { Tile } from './tile.tsx'
import { computeDerivedEffects, solveEquilibrium } from './tradeoff.ts'

type RailProps = {
  readonly selected: readonly string[]
  readonly intents: ReadonlyMap<string, number>
  readonly setIntent: (name: string, value: number) => void
  readonly resetValue: (name: string) => void
  readonly remove: (name: string) => void
  readonly lockedNames: ReadonlySet<string>
  readonly promoteTarget: (name: string) => void
  readonly applyPreset: (preset: Preset) => void
  readonly focused: string | undefined
  readonly setFocused: (name: string | undefined) => void
}

export function Rail({
  selected,
  intents,
  setIntent,
  resetValue,
  remove,
  lockedNames,
  promoteTarget,
  applyPreset,
  focused,
  setFocused,
}: RailProps) {
  const selectedNames = useMemo(() => new Set(selected), [selected])
  /*
    The equilibrium is the actual position every slider settles at given
    every user intent and every cross-attribute pull. We pass equilibrium
    values back into the contribution accumulator so the hover panel
    explains *what is currently pulling on this attribute*, not what the
    user wished was pulling.
  */
  const equilibrium = useMemo(
    () => solveEquilibrium(intents, selectedNames),
    [intents, selectedNames],
  )
  const allDerived = useMemo(() => computeDerivedEffects(equilibrium), [equilibrium])
  const derivedByTarget = useMemo(() => {
    const map = new Map<string, (typeof allDerived)[number]>()
    for (const effect of allDerived) {
      map.set(effect.target, effect)
    }
    return map
  }, [allDerived])

  const focusedRef = useRef<string | undefined>(focused)
  focusedRef.current = focused
  const removeRef = useRef(remove)
  removeRef.current = remove
  const resetRef = useRef(resetValue)
  resetRef.current = resetValue

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return
      }
      const focusedName = focusedRef.current
      if (focusedName === undefined) return
      if (event.key === 'x' || event.key === 'X') {
        event.preventDefault()
        removeRef.current(focusedName)
        return
      }
      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault()
        resetRef.current(focusedName)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  if (selected.length === 0) {
    return (
      <RailEmpty
        applyPreset={applyPreset}
        intents={intents}
        lockedNames={lockedNames}
        selectedNames={selectedNames}
      />
    )
  }

  return (
    <section
      aria-label="Comparison rail"
      className="flex h-full min-h-0 flex-col bg-[var(--surface-0)]"
      onMouseLeave={() => setFocused(undefined)}
    >
      <RailCommandStrip
        applyPreset={applyPreset}
        intents={intents}
        lockedNames={lockedNames}
        selectedNames={selectedNames}
      />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {selected.map((name) => {
            const attribute = attributeByName.get(name)
            if (attribute === undefined) return null
            const intent = intents.get(name) ?? 0
            const equilibriumValue = equilibrium.get(name) ?? 0
            const derived = derivedByTarget.get(name)
            return (
              <Tile
                attribute={attribute}
                derivedAtThisTarget={derived}
                intent={intent}
                key={name}
                isLocked={lockedNames.has(name)}
                onChange={(next) => setIntent(name, next)}
                onFocus={() => setFocused(name)}
                onPromoteRelated={promoteTarget}
                onRemove={() => remove(name)}
                onReset={() => resetValue(name)}
                selectedNames={selectedNames}
                value={equilibriumValue}
                values={equilibrium}
              />
            )
          })}
        </div>
      </div>
    </section>
  )
}

type CommandStripProps = {
  readonly intents: ReadonlyMap<string, number>
  readonly selectedNames: ReadonlySet<string>
  readonly lockedNames: ReadonlySet<string>
  readonly applyPreset: (preset: Preset) => void
}

function RailCommandStrip({ intents, selectedNames, lockedNames, applyPreset }: CommandStripProps) {
  return (
    <header className="border-b border-[var(--line-soft)] bg-[var(--surface-1)] px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-3)]">
            comparison rail
          </p>
          <p className="mt-1 text-[13px] text-[var(--ink-1)]">
            Move a fader to discover the hidden relationships it has with other attributes. Color
            shows what the change helps and what it hurts.
          </p>
          <p className="mt-2 max-w-[72ch] text-[12px] leading-relaxed text-[var(--ink-2)]">
            Affordability, Complexity, and Reliability stay pinned because every software decision
            eventually pays through price, cognitive load, or trust.
          </p>
        </div>
        <PolarityLegend />
      </div>
      <PresetBar
        applyPreset={applyPreset}
        intents={intents}
        lockedNames={lockedNames}
        selectedNames={selectedNames}
      />
    </header>
  )
}

type PresetBarProps = {
  readonly intents: ReadonlyMap<string, number>
  readonly selectedNames: ReadonlySet<string>
  readonly lockedNames: ReadonlySet<string>
  readonly applyPreset: (preset: Preset) => void
}

/*
  Presets seed the rail with a opinionated starting set of intents.
  Two flavors live side by side:
    - "domain" answers what kind of software is being built
    - "framework" answers which canonical evaluation acronym is in play
      (RASUI, FURPS, ACID, CIA, etc.). Same UI, different lane and label.
  We highlight the active preset (if the current state matches one
  verbatim) so the user can see they're exploring from a named anchor.
*/
function PresetBar({ intents, selectedNames, lockedNames, applyPreset }: PresetBarProps) {
  const domainPresets = presets.filter((preset) => preset.kind === 'domain')
  const frameworkPresets = presets.filter((preset) => preset.kind === 'framework')
  return (
    <div className="mt-3 space-y-2">
      <PresetRow
        applyPreset={applyPreset}
        intents={intents}
        items={domainPresets}
        label="domain"
        lockedNames={lockedNames}
        selectedNames={selectedNames}
      />
      <PresetRow
        applyPreset={applyPreset}
        intents={intents}
        items={frameworkPresets}
        label="framework"
        lockedNames={lockedNames}
        selectedNames={selectedNames}
      />
    </div>
  )
}

type PresetRowProps = {
  readonly intents: ReadonlyMap<string, number>
  readonly selectedNames: ReadonlySet<string>
  readonly lockedNames: ReadonlySet<string>
  readonly applyPreset: (preset: Preset) => void
  readonly items: readonly Preset[]
  readonly label: string
}

function PresetRow({
  intents,
  selectedNames,
  lockedNames,
  applyPreset,
  items,
  label,
}: PresetRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <p className="w-20 shrink-0 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--ink-3)]">
        {label}
      </p>
      <div className="flex flex-1 flex-wrap gap-1.5">
        {items.map((preset) => {
          const isActive = presetMatches(preset, selectedNames, intents, lockedNames)
          return (
            <button
              aria-pressed={isActive}
              className={`group inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] ${
                isActive
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                  : 'border-[var(--line)] bg-[var(--surface-0)] text-[var(--ink-1)] hover:border-[var(--accent)] hover:text-[var(--accent-ink)]'
              }`}
              key={preset.name}
              onClick={() => applyPreset(preset)}
              title={preset.summary}
              type="button"
            >
              <span aria-hidden className="text-[var(--ink-3)] group-hover:text-[var(--accent)]">
                {isActive ? '\u25cf' : '\u25cb'}
              </span>
              <span>{preset.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PolarityLegend() {
  return (
    <dl className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)]">
      <LegendItem color="var(--positive)" label="helps" />
      <LegendItem color="var(--negative)" label="hurts" />
      <LegendItem color="var(--accent)" label="context" />
    </dl>
  )
}

function LegendItem({ color, label }: { readonly color: string; readonly label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <dt aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      <dd>{label}</dd>
    </div>
  )
}

type RailEmptyProps = {
  readonly intents: ReadonlyMap<string, number>
  readonly selectedNames: ReadonlySet<string>
  readonly lockedNames: ReadonlySet<string>
  readonly applyPreset: (preset: Preset) => void
}

function RailEmpty({ intents, selectedNames, lockedNames, applyPreset }: RailEmptyProps) {
  return (
    <section
      aria-label="Comparison rail"
      className="flex h-full min-h-0 flex-col bg-[var(--surface-0)]"
    >
      <div className="flex flex-1 items-center justify-center px-8 py-12">
        <div className="w-full max-w-[52ch] text-[var(--ink-2)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-3)]">
            no drivers loaded
          </p>
          <p className="mt-3 text-[18px] leading-snug text-[var(--ink-0)]">
            Discover hidden relationships between quality attributes.
          </p>
          <p className="mt-3 text-[13px] leading-relaxed">
            Pick the kind of software you\u2019re building to seed a starting set of priorities, or
            add attributes one by one from the library on the left.
          </p>
          <div className="mt-5">
            <PresetBar
              applyPreset={applyPreset}
              intents={intents}
              lockedNames={lockedNames}
              selectedNames={selectedNames}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
