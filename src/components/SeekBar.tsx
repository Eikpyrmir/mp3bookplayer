import type { CSSProperties } from 'react'

interface SeekBarProps {
  value: number
  max: number
  disabled?: boolean
  onChange: (value: number) => void
}

export function SeekBar({ value, max, disabled, onChange }: SeekBarProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <input
      type="range"
      min={0}
      max={max > 0 ? max : 0.01}
      step={0.1}
      value={Math.min(value, max > 0 ? max : 0.01)}
      disabled={disabled || max <= 0}
      onChange={(e) => onChange(Number(e.target.value))}
      className="seekbar w-full"
      style={{ '--fill': `${pct}%` } as CSSProperties}
      aria-label="再生位置"
    />
  )
}
