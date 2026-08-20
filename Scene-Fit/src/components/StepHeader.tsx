import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { FLOW_STEPS } from '../data/labels'
import { BackButton } from './BackButton'
import { BrandLogo } from './BrandLogo'

type StepHeaderProps = {
  step?: number
  title: string
  caption?: string
  backTo?: string
  onBack?: () => void
  variant?: 'flow' | 'catalog'
}

export function StepHeader({
  step,
  title,
  caption,
  backTo,
  onBack,
  variant = 'catalog',
}: StepHeaderProps) {
  const navigate = useNavigate()
  const catalog = variant !== 'flow'
  const current = catalog ? undefined : FLOW_STEPS.find((item) => item.step === step)

  const goBack = () => {
    if (onBack) onBack()
    else if (backTo) navigate(backTo)
    else navigate(-1)
  }

  return (
    <header className={`step-header${catalog ? ' step-header--catalog' : ''}`}>
      {catalog ? (
        <>
          <div className="step-header__nav">
            <BackButton onClick={goBack} />
            <BrandLogo compact showMcm={false} />
          </div>
          <div className="step-header__copy">
            <h1>{title}</h1>
            {caption ? <p className="muted">{caption}</p> : null}
          </div>
        </>
      ) : (
        <>
          <div className="step-header__brand">
            <BrandLogo compact />
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
            <BackButton onClick={goBack} />
            <p className="eyebrow">
              {current?.code ?? `STEP ${step}`} · {step} / {FLOW_STEPS.length}
            </p>
          </div>
          <h1>{title}</h1>
          {caption ? <p className="muted">{caption}</p> : null}
        </>
      )}
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
