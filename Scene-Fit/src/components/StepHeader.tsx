import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

type StepHeaderProps = {
  step: number
  title: string
  caption?: string
  backTo?: string
  onBack?: () => void
}

export function StepHeader({ step, title, caption, backTo, onBack }: StepHeaderProps) {
  const navigate = useNavigate()
  const total = 6

  return (
    <header className="step-header">
      <div className="step-header__top">
        <button
          type="button"
          className="icon-btn"
          onClick={() => {
            if (onBack) onBack()
            else if (backTo) navigate(backTo)
            else navigate(-1)
          }}
          aria-label="뒤로"
        >
          ←
        </button>
        <p className="eyebrow">STEP {step} / {total}</p>
      </div>
      <h1>{title}</h1>
      {caption ? <p className="muted">{caption}</p> : null}
      <div className="progress" aria-hidden="true">
        <span style={{ width: `${(step / total) * 100}%` }} />
      </div>
    </header>
  )
}

export function StickyBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky-bar">
      <div className="sticky-bar__inner">{children}</div>
    </div>
  )
}
