import { useEffect, useRef, type ReactNode } from 'react'
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
  const currentTagRef = useRef<HTMLLIElement>(null)

  // 좁은 화면에서는 탭이 다 안 들어와 가로 스크롤이 생긴다 — 지금 단계가 화면 밖으로
  // 밀려나 있으면 안 되니, 단계가 바뀔 때마다 보이는 위치로 당겨온다.
  useEffect(() => {
    currentTagRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [step])

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
                const isCurrent = item.step === step
                const state = isCurrent ? 'is-current' : step != null && item.step < step ? 'is-done' : ''
                return (
                  <li key={item.step} className={state} ref={isCurrent ? currentTagRef : null}>
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
