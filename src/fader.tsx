import { type CSSProperties, useId } from 'react'

import type { AttributePolarity } from './data.ts'
import { formatSignedValue } from './tradeoff.ts'

export type SignTone = 'neutral' | 'positive' | 'negative'

type FaderProps = {
  /*
    `value` is the actual delivered equilibrium. `intent` is the user's
    requested handle position. When they diverge, the actual value renders
    as a small tick so the draggable control stays under the user's hand.
  */
  readonly value: number
  readonly intent?: number
  readonly onChange?: (value: number) => void
  readonly label: string
  readonly polarity: AttributePolarity
  readonly disabled?: boolean
  readonly readonly?: boolean
  readonly hideLabel?: boolean
  readonly sizes?: 'sm' | 'md'
}

/*
  Polarity-adjusted sign: a positive raw value on a "bad" attribute is
  experienced as a loss, so the track must paint red. The thumb is
  always neutral; only the fill encodes good/bad.
*/
export function polarityAdjustedSign(polarity: AttributePolarity, value: number): SignTone {
  if (value === 0 || polarity === 'neutral') return 'neutral'
  const positiveValue = value > 0
  if (polarity === 'good') return positiveValue ? 'positive' : 'negative'
  return positiveValue ? 'negative' : 'positive'
}

const trackTokenByTone: Record<SignTone, string> = {
  neutral: 'var(--accent)',
  positive: 'var(--positive)',
  negative: 'var(--negative)',
}

const faderStep = 5

function snapToStep(value: number): number {
  return Math.round(value / faderStep) * faderStep
}

/*
  A bipolar fader. Center is 0, range is -100..100. The fill is drawn as
  a CSS gradient anchored at center, so the "filled" area visually leaves
  center toward the current value. No numeric value is rendered: this is
  an instrument, the position IS the reading.
*/
const intentGhostMinGap = 5

export function Fader({
  value,
  intent,
  onChange,
  label,
  polarity,
  disabled = false,
  readonly = false,
  hideLabel = false,
  sizes = 'md',
}: FaderProps) {
  const reactId = useId()
  const inputId = `${reactId}-fader`
  const snappedActual = snapToStep(value)
  const snappedIntent = snapToStep(intent ?? value)
  const showActualTick = Math.abs(snappedActual - snappedIntent) >= intentGhostMinGap
  const tone = polarityAdjustedSign(polarity, snappedActual)
  const trackColor = trackTokenByTone[tone]
  const percent = (snappedActual + 100) / 2 // 0..100
  const start = Math.min(50, percent)
  const end = Math.max(50, percent)
  const actualPercent = (snappedActual + 100) / 2

  const trackStyle: CSSProperties = {
    background: `linear-gradient(
      to right,
      var(--line-soft) 0%,
      var(--line-soft) ${start.toString()}%,
      ${trackColor} ${start.toString()}%,
      ${trackColor} ${end.toString()}%,
      var(--line-soft) ${end.toString()}%,
      var(--line-soft) 100%
    )`,
  }

  const isInteractive = !(readonly || disabled)
  const accessibleValue = formatSignedValue(snappedIntent)
  const heightClass = sizes === 'sm' ? 'h-4' : 'h-5'

  /*
    The native range thumb's center travels from the input's left edge to
    its right edge. To keep the visible track aligned with the thumb's
    center at every position (so the fill ends exactly under the thumb at
    extremes), we inset the painted track by half the thumb width on
    each side. The input itself spans the full container so the thumb's
    travel range is unchanged.
  */
  return (
    <div className="flex flex-col gap-1">
      {!hideLabel && (
        <label
          className="truncate font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--ink-1)]"
          htmlFor={inputId}
          title={label}
        >
          {label}
        </label>
      )}
      <div className={`relative ${heightClass}`}>
        <div
          className="-translate-y-1/2 absolute top-1/2 right-[7px] left-[7px] h-1 rounded-full"
          style={trackStyle}
        />
        <span
          aria-hidden
          className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 h-2.5 w-px bg-[var(--line-strong)]"
        />
        {showActualTick && (
          <span
            aria-hidden
            className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute top-1/2 h-3 w-px bg-[var(--ink-3)]"
            style={{
              left: `calc(7px + (100% - 14px) * ${(actualPercent / 100).toString()})`,
            }}
            title="actual delivered position"
          />
        )}
        <input
          aria-label={label}
          aria-valuemax={100}
          aria-valuemin={-100}
          aria-valuenow={snappedIntent}
          aria-valuetext={accessibleValue}
          className="fader absolute inset-0"
          disabled={disabled || readonly}
          id={inputId}
          max={100}
          min={-100}
          onChange={
            isInteractive && onChange !== undefined
              ? (event) => onChange(snapToStep(Number(event.currentTarget.value)))
              : undefined
          }
          step={faderStep}
          type="range"
          value={snappedIntent}
        />
      </div>
    </div>
  )
}
