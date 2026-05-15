import { type CSSProperties, useId } from 'react'

import type { AttributePolarity } from './data.ts'
import { formatSignedValue } from './tradeoff.ts'

export type SignTone = 'neutral' | 'positive' | 'negative'

type FaderProps = {
  /*
    Two distinct quantities on the same track:
      - `intent` is the thumb position. It is exactly what the user last
        requested. Only the slider being dragged ever moves its own
        thumb. This is what `aria-valuenow` exposes.
      - `value` is the equilibrium the graph settled on for this
        attribute given everyone's intents. It rides the SAME track as a
        ghost tick so the user can see "you asked for X, the network
        pulled it to Y". Other tiles' equilibria DO move when one
        slider is dragged — that coupling is the whole pedagogical
        point.
    When `value` is omitted the fader is single-track (settings forms,
    detached previews); when present the ghost tick appears whenever
    intent and equilibrium have diverged enough to be legible.
  */
  readonly intent: number
  readonly value?: number
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

/*
  Minimum visual gap between intent and equilibrium ticks before we
  bother drawing the ghost. Below this they're indistinguishable on a
  ~200px track, so showing the tick would just look like noise.
*/
const equilibriumGhostMinGap = 3

export function Fader({
  intent,
  value,
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
  const snappedIntent = snapToStep(intent)
  const tone = polarityAdjustedSign(polarity, snappedIntent)
  const trackColor = trackTokenByTone[tone]
  const percent = (snappedIntent + 100) / 2 // 0..100
  const start = Math.min(50, percent)
  const end = Math.max(50, percent)

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
    Equilibrium ghost: the value the graph settled on, rendered as a
    secondary tick on the same track. Only drawn when it diverges from
    the user's intent, so calm tiles stay quiet. The tick lives inside
    the same 7px inset the thumb travels in, so its position aligns with
    where the thumb would sit at that value.
  */
  const equilibriumValue = value === undefined ? undefined : snapToStep(value)
  const showEquilibriumTick =
    equilibriumValue !== undefined &&
    Math.abs(equilibriumValue - snappedIntent) >= equilibriumGhostMinGap
  const equilibriumPercent = equilibriumValue === undefined ? 50 : (equilibriumValue + 100) / 2

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
        {showEquilibriumTick && (
          <span
            aria-hidden
            className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 h-3 w-[2px] rounded-sm bg-[var(--ink-1)]/60 ring-1 ring-[var(--surface-0)]"
            data-testid="fader-equilibrium-tick"
            data-value={equilibriumValue?.toString()}
            style={{ left: `calc(7px + (100% - 14px) * ${(equilibriumPercent / 100).toString()})` }}
            title={`Equilibrium: ${formatSignedValue(equilibriumValue ?? 0)}`}
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
