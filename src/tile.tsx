import type React from 'react'
import type { CSSProperties } from 'react'
import { useEffect, useId, useState } from 'react'

import type { AttributePolarity, QualityAttribute } from './data.ts'
import { Fader, polarityAdjustedSign, type SignTone } from './fader.tsx'
import {
  type DerivedEffect,
  type EffectContribution,
  edgesFromSource,
  edgesToTarget,
  formatSignedValue,
} from './tradeoff.ts'

type TileProps = {
  readonly attribute: QualityAttribute
  /*
    `value` is the equilibrium position the slider currently rests at.
    `intent` is the raw value the user last requested; the gap between
    them is the back-pressure the rest of the graph exerts on this slider.
  */
  readonly value: number
  readonly intent: number
  readonly isLocked: boolean
  readonly derivedAtThisTarget: DerivedEffect | undefined
  readonly onChange: (value: number) => void
  readonly onReset: () => void
  readonly onRemove: () => void
  readonly onPromoteRelated: (name: string) => void
  readonly onFocus: () => void
  readonly selectedNames: ReadonlySet<string>
  readonly values: ReadonlyMap<string, number>
}

export function Tile({
  attribute,
  value,
  intent,
  isLocked,
  derivedAtThisTarget,
  onChange,
  onReset,
  onRemove,
  onPromoteRelated,
  onFocus,
  selectedNames,
  values,
}: TileProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const dialogTitleId = useId()
  const outgoing = edgesFromSource(attribute.name)
  const incoming = edgesToTarget(attribute.name)
  const tileClassName = isLocked
    ? 'group relative flex min-h-[7.25rem] flex-col gap-2.5 border border-[var(--line-strong)] bg-[var(--surface-2)] p-3.5 shadow-[inset_0_1px_0_oklch(100%_0_0_/_0.04)] transition-colors duration-150 focus-within:border-[var(--line-strong)] focus-within:ring-2 focus-within:ring-[var(--accent-ring)]'
    : 'group relative flex min-h-[7.25rem] flex-col gap-2.5 border border-[var(--line-soft)] bg-[var(--surface-1)] p-3.5 shadow-[inset_0_1px_0_oklch(100%_0_0_/_0.04)] transition-colors duration-150 hover:border-[var(--line)] hover:bg-[var(--surface-2)] focus-within:border-[var(--accent)] focus-within:bg-[var(--surface-2)]'

  const polarity = attribute.polarity

  return (
    <article
      aria-label={`${attribute.name} tile`}
      className={tileClassName}
      onFocusCapture={onFocus}
      onMouseEnter={() => {
        onFocus()
      }}
    >
      <header className="flex items-baseline justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <PolarityGlyph polarity={polarity} />
          <h3 className="min-w-0 truncate text-[13px] font-semibold tracking-tight text-[var(--ink-0)]">
            {/*
              The title is the entry point into the relationship dialog.
              We used to have an explicit "relations" button next to it,
              but the title was the obvious affordance and the button
              was just visual chatter.
            */}
            <button
              aria-label={`Open relationship map for ${attribute.name}`}
              className="block w-full cursor-pointer truncate border-0 bg-transparent p-0 text-left text-inherit transition-colors duration-150 hover:text-[var(--accent-ink)] focus-visible:text-[var(--accent-ink)] focus-visible:underline focus-visible:underline-offset-4 focus-visible:decoration-[var(--accent)] focus-visible:outline-none"
              onClick={(event) => {
                event.stopPropagation()
                setIsDialogOpen(true)
              }}
              title={`Open relationship map for ${attribute.name}`}
              type="button"
            >
              {attribute.name}
            </button>
          </h3>
        </div>
        <TileControls isLocked={isLocked} onRemove={onRemove} onReset={onReset} />
      </header>

      <Fader
        hideLabel
        intent={intent}
        label={attribute.name}
        onChange={onChange}
        polarity={polarity}
        sizes="sm"
        value={value}
      />

      <TileFooter
        attributeName={attribute.name}
        contributions={derivedAtThisTarget?.contributions ?? []}
        equilibrium={value}
        incomingCount={incoming.length}
        intent={intent}
        onOpenRelations={() => setIsDialogOpen(true)}
        outgoingCount={outgoing.length}
        polarity={polarity}
      />

      {isDialogOpen && (
        <RelationsDialog
          attribute={attribute}
          labelledBy={dialogTitleId}
          inboundContributions={derivedAtThisTarget?.contributions ?? []}
          onClose={() => setIsDialogOpen(false)}
          onPromote={onPromoteRelated}
          selectedNames={selectedNames}
          values={values}
        />
      )}
    </article>
  )
}

function TileControls({
  isLocked,
  onReset,
  onRemove,
}: {
  readonly isLocked: boolean
  readonly onReset: () => void
  readonly onRemove: () => void
}) {
  return (
    <div className="ml-auto flex shrink-0 items-center gap-0.5">
      {isLocked ? (
        <span
          aria-label="Locked foundation metric"
          className="inline-flex h-5 w-5 items-center justify-center rounded border border-[var(--line)] text-[var(--ink-3)]"
          role="img"
          title="Affordability, Complexity, and Reliability cannot be removed."
        >
          <svg
            aria-hidden="true"
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
            viewBox="0 0 16 16"
          >
            <rect height="6.5" rx="1.5" width="9" x="3.5" y="7" />
            <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
          </svg>
        </span>
      ) : (
        <span className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
          <TileButton label="Reset to neutral" onClick={onReset}>
            reset
          </TileButton>
          <TileButton label="Remove from rail" onClick={onRemove}>
            remove
          </TileButton>
        </span>
      )}
    </div>
  )
}

type TileButtonProps = {
  readonly children: string
  readonly label: string
  readonly onClick: () => void
}

function TileButton({ children, label, onClick }: TileButtonProps) {
  return (
    <button
      aria-label={label}
      className="rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-2)] transition-colors duration-150 hover:bg-[var(--surface-2)] hover:text-[var(--ink-0)] focus-visible:bg-[var(--accent-soft)] focus-visible:text-[var(--accent-ink)] focus-visible:outline-none"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      type="button"
    >
      {children}
    </button>
  )
}

function PolarityGlyph({ polarity }: { readonly polarity: 'good' | 'bad' | 'neutral' }) {
  const symbol = polarity === 'good' ? '+' : polarity === 'bad' ? '\u2212' : '~'
  const titleByPolarity = {
    good: 'More of this is generally good',
    bad: 'More of this is generally bad',
    neutral: 'Context-dependent; neither inherently good nor bad',
  } as const
  return (
    <span
      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-[var(--line-soft)] font-mono text-[9px] leading-none text-[var(--ink-3)]"
      role="img"
      aria-label={titleByPolarity[polarity]}
      title={titleByPolarity[polarity]}
    >
      {symbol}
    </span>
  )
}

type TileFooterProps = {
  readonly attributeName: string
  readonly contributions: readonly EffectContribution[]
  readonly equilibrium: number
  readonly incomingCount: number
  readonly intent: number
  readonly onOpenRelations: () => void
  readonly outgoingCount: number
  readonly polarity: AttributePolarity
}

/*
  The footer used to spell out "held up / held back by other drivers" on
  almost every tile, which read like noise once the rail had four or five
  drivers. We replace that line with a small interactive gauge that lives
  on the same horizontal axis as the fader: chevron count = pressure
  magnitude, direction = which way the graph is pulling, color =
  polarity-adjusted (graph pulling toward the worse side reads red).
  Hover/focus surfaces the top contributors with signed deltas; click
  opens the relations dialog. The textual fallback only survives for the
  rare disconnected-attribute case so the user knows it is intentional,
  not broken.
*/
function TileFooter({
  attributeName,
  contributions,
  equilibrium,
  incomingCount,
  intent,
  onOpenRelations,
  outgoingCount,
  polarity,
}: TileFooterProps) {
  if (contributions.length > 0) {
    return (
      <PressureGauge
        attributeName={attributeName}
        contributions={contributions}
        equilibrium={equilibrium}
        intent={intent}
        onOpenRelations={onOpenRelations}
        polarity={polarity}
      />
    )
  }
  if (outgoingCount === 0 && incomingCount === 0) {
    return <FooterLine tone="neutral">isolated in graph</FooterLine>
  }
  return <FooterSpacer />
}

function FooterSpacer() {
  // Reserves the same vertical slot the gauge would occupy so tiles in
  // the grid stay aligned even when no contributions are present yet.
  return <div aria-hidden className="h-4" />
}

function FooterLine({
  children,
  tone,
}: {
  readonly children: React.ReactNode
  readonly tone: SignTone
}) {
  const toneColor =
    tone === 'positive'
      ? 'var(--positive)'
      : tone === 'negative'
        ? 'var(--negative)'
        : 'var(--ink-2)'
  return (
    <p className="flex h-4 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)]">
      <span style={{ color: toneColor }}>{children}</span>
    </p>
  )
}

type PressureGaugeProps = {
  readonly attributeName: string
  readonly contributions: readonly EffectContribution[]
  readonly equilibrium: number
  readonly intent: number
  readonly onOpenRelations: () => void
  readonly polarity: AttributePolarity
}

const pressureChevronBuckets = [3, 9, 18] as const

/*
  Net inbound pressure is the sum of every contribution's signed delta.
  We clamp the chevron count to 1..3 so the symbol is always legible at
  small sizes; the popover carries the precise numbers for anyone who
  wants them. Magnitudes below 1 are treated as "balanced" and rendered
  with a single tilde glyph instead of an arrow.
*/
function chevronCountFor(magnitude: number): 0 | 1 | 2 | 3 {
  if (magnitude < pressureChevronBuckets[0]) return 0
  if (magnitude < pressureChevronBuckets[1]) return 1
  if (magnitude < pressureChevronBuckets[2]) return 2
  return 3
}

function PressureGauge({
  attributeName,
  contributions,
  equilibrium,
  intent,
  onOpenRelations,
  polarity,
}: PressureGaugeProps) {
  const [isHovering, setIsHovering] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const popoverId = useId()
  const netDelta = contributions.reduce((sum, contribution) => sum + contribution.delta, 0)
  const magnitude = Math.abs(netDelta)
  const chevrons = chevronCountFor(magnitude)
  /*
    The chevron tone follows the *target's* polarity, not the contribution's
    direction: a positive net delta on a "bad" attribute means the graph
    is making things worse, so the chevrons paint red. This matches the
    fader fill convention.
  */
  const projectedSign = polarityAdjustedSign(polarity, netDelta)
  const tone: SignTone = chevrons === 0 ? 'neutral' : projectedSign
  const toneColor =
    tone === 'positive'
      ? 'var(--positive)'
      : tone === 'negative'
        ? 'var(--negative)'
        : 'var(--ink-3)'
  /*
    The badge rides the equilibrium x so the user sees pressure attached to
    where the fader has actually settled. We inset by the same 7px the
    fader uses so chevrons line up with the fader thumb at extremes.
  */
  const equilibriumPercent = (equilibrium + 100) / 2
  const ridingStyle: CSSProperties = {
    left: `calc(7px + (100% - 14px) * ${(equilibriumPercent / 100).toString()})`,
  }
  const intentDelta = intent === 0 ? 0 : equilibrium - intent
  const ariaSummary = describePressure({
    chevrons,
    direction: netDelta,
    contributors: contributions.length,
    intentDelta,
  })
  const isOpen = isHovering || isFocused
  return (
    <div className="relative h-4">
      <button
        aria-describedby={isOpen ? popoverId : undefined}
        aria-label={`${attributeName} pressure: ${ariaSummary}. Open relationship dialog.`}
        className="-translate-x-1/2 absolute top-0 inline-flex h-4 items-center gap-0.5 rounded px-1 text-[var(--ink-3)] transition-colors duration-150 hover:bg-[var(--surface-3)] hover:text-[var(--ink-1)] focus-visible:bg-[var(--surface-3)] focus-visible:text-[var(--ink-0)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)]"
        onBlur={() => setIsFocused(false)}
        onClick={(event) => {
          event.stopPropagation()
          onOpenRelations()
        }}
        onFocus={() => setIsFocused(true)}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        style={ridingStyle}
        type="button"
      >
        <PressureGlyph chevrons={chevrons} direction={netDelta} tone={toneColor} />
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] leading-none text-[var(--ink-3)]">
          {contributions.length.toString()}
        </span>
      </button>
      {isOpen && (
        <PressurePopover
          contributions={contributions}
          id={popoverId}
          intentDelta={intentDelta}
          netDelta={netDelta}
          polarity={polarity}
        />
      )}
    </div>
  )
}

function describePressure({
  chevrons,
  direction,
  contributors,
  intentDelta,
}: {
  readonly chevrons: 0 | 1 | 2 | 3
  readonly direction: number
  readonly contributors: number
  readonly intentDelta: number
}): string {
  const contributorWord = contributors === 1 ? 'driver' : 'drivers'
  if (chevrons === 0) {
    return `forces from ${contributors.toString()} ${contributorWord} cancel out`
  }
  const intensity = chevrons === 1 ? 'light' : chevrons === 2 ? 'moderate' : 'strong'
  const verb = direction > 0 ? 'pushing higher' : 'pulling lower'
  const fightSuffix =
    Math.abs(intentDelta) >= 5
      ? `, fighting your intent by ${Math.abs(Math.round(intentDelta)).toString()}`
      : ''
  return `${intensity} pressure ${verb} from ${contributors.toString()} ${contributorWord}${fightSuffix}`
}

function PressureGlyph({
  chevrons,
  direction,
  tone,
}: {
  readonly chevrons: 0 | 1 | 2 | 3
  readonly direction: number
  readonly tone: string
}) {
  if (chevrons === 0) {
    return (
      <span aria-hidden className="font-mono text-[11px] leading-none" style={{ color: tone }}>
        {'\u2248'}
      </span>
    )
  }
  const glyph = direction > 0 ? '\u203a' : '\u2039'
  return (
    <span
      aria-hidden
      className="inline-flex font-mono text-[12px] leading-none"
      style={{ color: tone, letterSpacing: '-0.15em' }}
    >
      {glyph.repeat(chevrons)}
    </span>
  )
}

type PressurePopoverProps = {
  readonly contributions: readonly EffectContribution[]
  readonly id: string
  readonly intentDelta: number
  readonly netDelta: number
  readonly polarity: AttributePolarity
}

const pressurePopoverLimit = 4

function PressurePopover({
  contributions,
  id,
  intentDelta,
  netDelta,
  polarity,
}: PressurePopoverProps) {
  // Sort by absolute delta so the strongest pulls surface first; the
  // gauge already tells the user the net story.
  const ordered = contributions.toSorted(
    (a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.source.localeCompare(b.source),
  )
  const visible = ordered.slice(0, pressurePopoverLimit)
  const overflow = ordered.length - visible.length
  return (
    <div
      className="-translate-x-1/2 absolute top-full left-1/2 z-30 mt-1 min-w-[14rem] max-w-[18rem] border border-[var(--line)] bg-[var(--surface-0)] p-2 shadow-[var(--shadow-panel)]"
      id={id}
      role="tooltip"
    >
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--ink-3)]">
        net pull {formatSignedValue(netDelta)}
        {Math.abs(intentDelta) >= 5 && (
          <span className="ml-2 normal-case tracking-normal text-[var(--ink-2)]">
            (vs intent {formatSignedValue(intentDelta)})
          </span>
        )}
      </p>
      <ul className="mt-1.5 flex flex-col gap-0.5">
        {visible.map((contribution) => (
          <PressurePopoverRow
            contribution={contribution}
            key={contribution.source}
            polarity={polarity}
          />
        ))}
      </ul>
      {overflow > 0 && (
        <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--ink-3)]">
          + {overflow.toString()} more
        </p>
      )}
      <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--ink-3)]">
        click for full graph
      </p>
    </div>
  )
}

function PressurePopoverRow({
  contribution,
  polarity,
}: {
  readonly contribution: EffectContribution
  readonly polarity: AttributePolarity
}) {
  const tone = polarityAdjustedSign(polarity, contribution.delta)
  const toneColor =
    tone === 'positive'
      ? 'var(--positive)'
      : tone === 'negative'
        ? 'var(--negative)'
        : 'var(--ink-2)'
  return (
    <li className="flex items-baseline justify-between gap-3 text-[11px] leading-tight">
      <span className="truncate text-[var(--ink-1)]" title={contribution.source}>
        {contribution.source}
      </span>
      <span className="shrink-0 font-mono text-[10px] tabular-nums" style={{ color: toneColor }}>
        {formatSignedValue(contribution.delta)}
      </span>
    </li>
  )
}

type RelationsDialogProps = {
  readonly attribute: QualityAttribute
  readonly labelledBy: string
  readonly inboundContributions: readonly EffectContribution[]
  readonly onClose: () => void
  readonly onPromote: (name: string) => void
  readonly selectedNames: ReadonlySet<string>
  readonly values: ReadonlyMap<string, number>
}

/*
  Relationship details can be huge, so they live in an explicit dialog
  instead of a hover panel that stretches the grid. We still avoid raw
  numeric influences here: direction, notes, and active/in-rail state are
  the useful explanatory layer.
*/
function RelationsDialog({
  attribute,
  labelledBy,
  inboundContributions,
  onClose,
  onPromote,
  selectedNames,
  values,
}: RelationsDialogProps) {
  const incoming = edgesToTarget(attribute.name)
  const outgoing = edgesFromSource(attribute.name)

  const incomingActiveSources = new Set(
    inboundContributions.map((contribution) => contribution.source),
  )

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <button
        aria-label="Close relationship dialog"
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby={labelledBy}
        aria-modal="true"
        className="relative flex max-h-full w-full max-w-3xl flex-col border border-[var(--line)] bg-[var(--surface-0)] shadow-[var(--shadow-panel)]"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--line-soft)] bg-[var(--surface-1)] px-4 py-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-3)]">
              relationship map
            </p>
            <h2
              className="mt-1 text-lg font-semibold tracking-tight text-[var(--ink-0)]"
              id={labelledBy}
            >
              {attribute.name}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink-2)]">
              {attribute.definition}
            </p>
          </div>
          <TileButton label="Close relationship dialog" onClick={onClose}>
            close
          </TileButton>
        </header>
        <div className="grid min-h-0 gap-5 overflow-y-auto p-4 md:grid-cols-2">
          <RelationGroup
            emptyLine="Nothing in the curated graph drives this attribute."
            heading="Driven by"
            items={incoming.map((edge) => ({
              name: edge.source,
              direction: edge.direction,
              note: edge.note,
              isInRail: selectedNames.has(edge.source),
              isActive: incomingActiveSources.has(edge.source),
              driverValue: values.get(edge.source) ?? 0,
            }))}
            onPromote={onPromote}
          />
          <div className="border-t border-[var(--line-soft)] pt-5 md:border-t-0 md:border-l md:pt-0 md:pl-5">
            <RelationGroup
              emptyLine="Nothing in the curated graph reacts to this attribute."
              heading="Drives"
              items={outgoing.map((edge) => ({
                name: edge.target,
                direction: edge.direction,
                note: edge.note,
                isInRail: selectedNames.has(edge.target),
                isActive: false,
                driverValue: 0,
              }))}
              onPromote={onPromote}
            />
          </div>
        </div>
        <p className="border-t border-[var(--line-soft)] px-4 py-3 text-[11px] leading-relaxed text-[var(--ink-3)]">
          Filled dots mark active drivers from the current rail. Click any related attribute to add
          it to the rail and let the equilibrium model include it.
        </p>
      </section>
    </div>
  )
}

type RelationItem = {
  readonly name: string
  readonly direction: 'positive' | 'negative'
  readonly note: string | undefined
  readonly isInRail: boolean
  readonly isActive: boolean
  readonly driverValue: number
}

type RelationGroupProps = {
  readonly heading: string
  readonly items: readonly RelationItem[]
  readonly onPromote: (name: string) => void
  readonly emptyLine: string
}

function RelationGroup({ heading, items, onPromote, emptyLine }: RelationGroupProps) {
  /*
    Sort priority: active drivers (blue dot) first, then attributes
    already in the rail, then alphabetical. The dot indicates a force
    that is currently shaping the equilibrium, so it deserves to surface
    above passive list members.
  */
  const ordered = items.toSorted((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
    if (a.isInRail !== b.isInRail) return a.isInRail ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return (
    <div className="flex flex-col gap-1.5">
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--ink-3)]">
        {heading}
      </p>
      {ordered.length === 0 ? (
        <p className="text-[11px] text-[var(--ink-2)]">{emptyLine}</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {ordered.map((item) => (
            <RelationRow item={item} key={`${heading}-${item.name}`} onPromote={onPromote} />
          ))}
        </ul>
      )}
    </div>
  )
}

function RelationRow({
  item,
  onPromote,
}: {
  readonly item: RelationItem
  readonly onPromote: (name: string) => void
}) {
  const glyph = item.direction === 'positive' ? '+' : '\u2212'
  const glyphColor = item.direction === 'positive' ? 'var(--positive)' : 'var(--negative)'
  return (
    <li className="flex items-baseline gap-2 text-[11px]">
      <span
        aria-hidden
        className="font-mono text-[11px] leading-none"
        style={{ color: glyphColor }}
      >
        {glyph}
      </span>
      <button
        className={`text-left transition-colors duration-100 hover:text-[var(--accent-ink)] focus-visible:text-[var(--accent-ink)] focus-visible:outline-none ${
          item.isInRail ? 'text-[var(--ink-1)]' : 'text-[var(--ink-0)]'
        }`}
        onClick={(event) => {
          event.stopPropagation()
          onPromote(item.name)
        }}
        title={item.isInRail ? 'Already in rail' : 'Add to rail'}
        type="button"
      >
        {item.name}
      </button>
      {item.isActive && (
        <span
          aria-hidden
          className="inline-block h-1 w-1 rounded-full"
          style={{ background: 'var(--accent)' }}
          title="active driver"
        />
      )}
      {item.note !== undefined && (
        <span className="truncate text-[10px] text-[var(--ink-3)]" title={item.note}>
          {': '}
          {item.note}
        </span>
      )}
    </li>
  )
}
