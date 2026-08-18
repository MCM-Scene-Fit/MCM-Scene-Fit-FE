import type { ReactNode } from 'react'

type ChipProps = {
  on: boolean
  onClick: () => void
  icon?: ReactNode
  children: ReactNode
}

export function Chip({ on, onClick, icon, children }: ChipProps) {
  return (
    <button
      type="button"
      className={`chip ${icon ? 'chip-icon' : ''} ${on ? 'is-on' : ''}`}
      aria-pressed={on}
      onClick={onClick}
    >
      {icon ? (
        <span className="chip-icon__glyph" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  )
}
