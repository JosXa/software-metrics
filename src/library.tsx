import { useDeferredValue, useMemo, useState } from 'react'

import { type QualityAttribute, qualityAttributes } from './data.ts'
import { polarityAdjustedSign } from './fader.tsx'

type LibraryProps = {
  readonly selected: ReadonlySet<string>
  readonly lockedNames: ReadonlySet<string>
  readonly onToggle: (name: string) => void
  readonly onClear: () => void
}

function matchesQuery(attribute: QualityAttribute, query: string): boolean {
  if (query === '') return true
  const haystack = `${attribute.name} ${attribute.definition} ${attribute.categoryOrAcronym.join(' ')}`
  return haystack.toLowerCase().includes(query)
}

export function Library({ selected, lockedNames, onToggle, onClear }: LibraryProps) {
  const [rawQuery, setRawQuery] = useState('')
  const query = useDeferredValue(rawQuery.trim().toLowerCase())

  const filtered = useMemo(
    () =>
      qualityAttributes
        .filter((attribute) => matchesQuery(attribute, query))
        .toSorted((a, b) => {
          const aLocked = lockedNames.has(a.name)
          const bLocked = lockedNames.has(b.name)
          if (aLocked !== bLocked) return aLocked ? -1 : 1
          return a.name.localeCompare(b.name)
        }),
    [query, lockedNames],
  )

  return (
    <section
      aria-label="Attribute library"
      className="flex h-full min-h-0 flex-col border-r border-[var(--line-soft)] bg-[var(--surface-1)]"
    >
      <header className="sticky top-0 z-10 flex flex-col gap-2 border-b border-[var(--line-soft)] bg-[var(--surface-1)] px-4 pt-4 pb-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-2)]">
            Library
          </h2>
          {selected.size > 0 && (
            <button
              aria-label="Clear optional selected attributes"
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)] transition-colors duration-150 hover:text-[var(--ink-0)] focus-visible:text-[var(--accent-ink)] focus-visible:outline-none"
              onClick={onClear}
              type="button"
            >
              clear optional
            </button>
          )}
        </div>
        <label className="relative block">
          <span className="sr-only">Search attributes</span>
          <input
            autoComplete="off"
            className="w-full rounded-md border border-[var(--line)] bg-[var(--surface-0)] px-2.5 py-1.5 font-mono text-[12px] text-[var(--ink-0)] placeholder:text-[var(--ink-3)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
            onChange={(event) => setRawQuery(event.currentTarget.value)}
            placeholder="filter: security, latency, audit"
            spellCheck={false}
            type="search"
            value={rawQuery}
          />
        </label>
      </header>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--ink-2)]">
            Nothing matches <span className="font-mono text-[var(--ink-1)]">{rawQuery}</span>. Try a
            substring like <span className="font-mono text-[var(--ink-1)]">test</span> or{' '}
            <span className="font-mono text-[var(--ink-1)]">audit</span>.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--line-soft)]">
            {filtered.map((attribute) => (
              <LibraryRow
                attribute={attribute}
                isSelected={selected.has(attribute.name)}
                isLocked={lockedNames.has(attribute.name)}
                key={attribute.name}
                onToggle={() => onToggle(attribute.name)}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

type LibraryRowProps = {
  readonly attribute: QualityAttribute
  readonly isSelected: boolean
  readonly isLocked: boolean
  readonly onToggle: () => void
}

function LibraryRow({ attribute, isSelected, isLocked, onToggle }: LibraryRowProps) {
  /*
    The polarity glyph is the same one shown on the tile so users learn
    the symbol once. We hint at default direction using a hairline to the
    right of the row when selected.
  */
  const polarityTone = polarityAdjustedSign(attribute.polarity, isSelected ? 1 : 0)
  const dotColor = isSelected
    ? polarityTone === 'positive'
      ? 'var(--positive)'
      : polarityTone === 'negative'
        ? 'var(--negative)'
        : 'var(--accent)'
    : 'var(--line-strong)'

  return (
    <li>
      <button
        aria-disabled={isLocked}
        aria-pressed={isSelected}
        className={`group flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-[var(--surface-2)] focus-visible:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-ring)] ${
          isSelected ? 'bg-[var(--surface-2)]' : ''
        }`}
        onClick={() => {
          if (!isLocked) onToggle()
        }}
        type="button"
      >
        <span
          aria-hidden
          className={`mt-1 inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-sm border ${
            isSelected ? 'border-[var(--ink-1)]' : 'border-[var(--line-strong)]'
          }`}
        >
          {isSelected && (
            <span
              className="inline-block h-1.5 w-1.5 rounded-[1px]"
              style={{ background: dotColor }}
            />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate font-medium text-[13px] text-[var(--ink-0)]">
              {attribute.name}
            </span>
            {isLocked ? <LockedBadge /> : <PolarityBadge polarity={attribute.polarity} />}
          </span>
          <span className="text-[12px] leading-snug text-[var(--ink-2)]">
            {attribute.definition}
          </span>
        </span>
      </button>
    </li>
  )
}

function LockedBadge() {
  return (
    <span className="shrink-0 rounded-sm border border-[var(--line)] bg-[var(--surface-0)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--accent-ink)]">
      pinned
    </span>
  )
}

function PolarityBadge({ polarity }: { readonly polarity: 'good' | 'bad' | 'neutral' }) {
  const symbol = polarity === 'good' ? '+' : polarity === 'bad' ? '\u2212' : '~'
  const color =
    polarity === 'good' ? 'var(--ink-3)' : polarity === 'bad' ? 'var(--negative)' : 'var(--ink-3)'
  const title =
    polarity === 'good'
      ? 'More of this is generally good'
      : polarity === 'bad'
        ? 'More of this is generally bad'
        : 'Context-dependent'
  return (
    <span
      aria-hidden
      className="font-mono text-[10px] leading-none"
      style={{ color }}
      title={title}
    >
      {symbol}
    </span>
  )
}
