import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { FLOW_STEPS } from '../data/labels'

type StepHeaderProps = {
  step: number
  title: string
  caption?: string
  backTo?: string
  onBack?: () => void
}

export function StepHeader({ step, title, caption, backTo, onBack }: StepHeaderProps) {
  const navigate = useNavigate()
  const current = FLOW_STEPS.find((item) => item.step === step)

  return (
    <header className="step-header">
      <div className="step-header__brand">
        <p className="brand-mark">SCENE FIT</p>
        <ol className="step-tags" aria-label="진행 단계">
          {FLOW_STEPS.map((item) => {
            const state = item.step === step ? 'is-current' : item.step < step ? 'is-done' : ''
            return (
              <li key={item.step} className={state}>
                <span className="step-tags__code">{item.code}</span>
              </li>
            )
          })}
        </ol>
      </div>

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
        <p className="eyebrow">
          {current?.code ?? `STEP ${step}`} · {step} / {FLOW_STEPS.length}
        </p>
      </div>
      <h1>{title}</h1>
      {caption ? <p className="muted">{caption}</p> : null}
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
