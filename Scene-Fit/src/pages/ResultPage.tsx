import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ItemLoadSummary } from '../components/ItemLoadSummary'
import { ProductMini } from '../components/ProductCard'
import { StepHeader, StickyBar } from '../components/StepHeader'
import { useFlow } from '../context/FlowContext'
import { AXIS_STATUS_LABEL, EVIDENCE_BADGE, EVIDENCE_LABEL, ITEM_LABEL } from '../data/labels'
import { getProduct } from '../data/products'
import { evidenceTone, runFitCheck } from '../lib/fitCheck'
import { formatOccupancy } from '../lib/itemFit'
import type { AxisStatus, ItemVerdict } from '../types'

const METER_FILL: Record<AxisStatus, number> = {
  weak: 1,
  check: 2,
  match: 3,
}

function AxisMeter({ status, label }: { status: AxisStatus; label: string }) {
  const fill = METER_FILL[status]
  return (
    <div
      className={`axis-meter axis-meter--${status}`}
      role="meter"
      aria-label={`${label} ${AXIS_STATUS_LABEL[status]}`}
      aria-valuemin={1}
      aria-valuemax={3}
      aria-valuenow={fill}
      aria-valuetext={AXIS_STATUS_LABEL[status]}
    >
      {[1, 2, 3].map((step) => (
        <span key={step} className={step <= fill ? 'is-on' : undefined} />
      ))}
    </div>
  )
}

function AxisCard({
  label,
  status,
  headline,
  children,
}: {
  label: string
  status: AxisStatus
  headline: string
  children: ReactNode
}) {
  return (
    <article className={`axis-card axis-card--${status}`}>
      <div className="axis-card__top">
        <p className="eyebrow">{label}</p>
        <span className={`axis-pill axis-pill--${status}`}>{AXIS_STATUS_LABEL[status]}</span>
      </div>
      <AxisMeter status={status} label={label} />
      <h3>{headline}</h3>
      {children}
    </article>
  )
}

function NoteCard({
  tone,
  eyebrow,
  title,
  empty,
  items,
}: {
  tone: 'ok' | 'bad' | 'info'
  eyebrow: string
  title: string
  empty: string
  items: string[]
}) {
  return (
    <article className={`note-card note-card--${tone}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h4>{title}</h4>
      <ul>
        {items.length ? items.map((line) => <li key={line}>{line}</li>) : <li>{empty}</li>}
      </ul>
    </article>
  )
}

function CarryScore({ score }: { score: number | null }) {
  if (score == null) return null
  return (
    <p className="carry-score" aria-label={`수납 지표 ${score}점`}>
      <span className="eyebrow">수납 지표</span>
      <strong>{score}</strong>
      <span className="carry-score__max">/100</span>
    </p>
  )
}

function VerdictTag({ verdict }: { verdict: ItemVerdict }) {
  const tone = evidenceTone(verdict.level)
  const fill = formatOccupancy(verdict.fillRatio)
  const meta = verdict.level === 'confirmed' ? `공식 지원 · 점유 ${fill}` : `점유 ${fill}`

  return (
    <li className={`verdict-row verdict-row--${tone}`}>
      <div className="verdict-row__copy">
        <span>{ITEM_LABEL[verdict.item]}</span>
        <small>{meta}</small>
      </div>
      <span className={`verdict-badge verdict-badge--${tone}`}>
        <span aria-hidden="true">{EVIDENCE_BADGE[verdict.level]}</span>
        {EVIDENCE_LABEL[verdict.level]}
      </span>
    </li>
  )
}

export function ResultPage() {
  const navigate = useNavigate()
  const { selectedProduct, selectedColorId, conditions, conditionsReady, startQuickDemo } =
    useFlow()
  const product = selectedProduct

  const result = useMemo(() => {
    if (!product) return null
    return runFitCheck(product, conditions)
  }, [product, conditions])

  if (!product || !result) return null
  const alternative = result.alternativeId ? getProduct(result.alternativeId) : null

  return (
    <main className="page has-sticky">
      <StepHeader
        step={4}
        title="Scene Fit Card"
        caption="총점 대신 세 축으로 맞는지, 확인할 점을 보여 줍니다."
        backTo="/conditions"
      />

      <ProductMini product={product} colorId={selectedColorId ?? undefined} />

      {!conditionsReady ? (
        <p className="empty-note">
          빠른 체험 미리보기입니다. 조건을 바꾸려면 이전 단계에서 다시 입력할 수 있습니다.
        </p>
      ) : null}

      <section className="fit-axes" aria-label="3축 적합도">
        <AxisCard
          label="Scene Match"
          status={result.sceneMatch.status}
          headline={result.sceneMatch.headline}
        >
          <p className="muted">{result.sceneMatch.detail}</p>
        </AxisCard>
        <AxisCard
          label="Carry Check"
          status={result.carryCheck.status}
          headline={result.carryCheck.headline}
        >
          {result.carryCheck.score != null ? <CarryScore score={result.carryCheck.score} /> : null}
          {result.carryCheck.items.length ? (
            <ul className="verdicts">
              {result.carryCheck.items.map((item) => (
                <VerdictTag key={item.item} verdict={item} />
              ))}
            </ul>
          ) : (
            <p className="muted">선택한 소지품이 없으면 매장에서 수납을 확인해 주세요.</p>
          )}
          <ItemLoadSummary items={conditions.items} compact />
        </AxisCard>
        <AxisCard
          label="Rewear Potential"
          status={result.rewearPotential.status}
          headline={result.rewearPotential.headline}
        >
          <p className="muted">{result.rewearPotential.detail}</p>
        </AxisCard>
      </section>

      <section className="result-notes" aria-label="결과 요약">
        <NoteCard
          tone="ok"
          eyebrow="잘 맞음"
          title="이 가방이 잘 맞는 이유"
          empty="선택한 조건과 강하게 겹치는 공식 근거는 아직 적습니다."
          items={result.matches}
        />
        <NoteCard
          tone="bad"
          eyebrow="안 맞음"
          title="가장 안 맞는 조건"
          empty="필수 조건에서 뚜렷한 불일치는 없습니다."
          items={result.mismatches}
        />
        <NoteCard
          tone="info"
          eyebrow="매장 확인"
          title="매장에서 확인할 점"
          empty="지금 단계에서 따로 확인할 항목은 없습니다."
          items={result.storeChecks}
        />
      </section>

      {alternative ? (
        <section className="alt-card">
          <p className="eyebrow">조건을 바꿨을 때의 대안</p>
          <ProductMini product={alternative} />
        </section>
      ) : null}

      <StickyBar>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={!alternative}
            onClick={() => navigate('/compare')}
          >
            대안과 비교
          </button>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/fit-pass')}>
            Fit Pass 만들기
          </button>
        </div>
        {!conditionsReady ? (
          <button type="button" className="text-btn" onClick={() => startQuickDemo()}>
            빠른 체험 조건 유지
          </button>
        ) : null}
      </StickyBar>
    </main>
  )
}
