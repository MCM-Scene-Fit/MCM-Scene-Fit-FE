import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EvidenceBadge } from '../components/EvidenceBadge'
import { FitCard } from '../components/FitCard'
import { FitPassRequestModal } from '../components/FitPassRequestModal'
import { ItemLoadSummary } from '../components/ItemLoadSummary'
import { ProductMini } from '../components/ProductCard'
import { StorageCanvas } from '../components/StorageCanvas'
import { StepHeader, StickyBar } from '../components/StepHeader'
import { useFlow } from '../context/FlowContext'
import { useServerFit } from '../hooks/useServerFit'
import { formatOccupancy } from '../lib/itemFit'
import { useCatalogStore } from '../store/useCatalogStore'
import type { ItemVerdict } from '../types'

function NoteCard({
  tone,
  title,
  empty,
  items,
}: {
  tone: 'match' | 'weak' | 'check'
  title: string
  empty: string
  items: string[]
}) {
  return (
    <article className={`note-card note-card--${tone}`}>
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
  const fill = formatOccupancy(verdict.fillRatio)
  const meta = verdict.level === 'confirmed' ? `공식 지원 · 점유 ${fill}` : `점유 ${fill}`

  return (
    <li className={`verdict-row verdict-row--${verdict.level}`}>
      <div className="verdict-row__copy">
        <span>{verdict.label}</span>
        <small>{meta}</small>
      </div>
      <EvidenceBadge level={verdict.level} />
    </li>
  )
}

export function ResultPage() {
  const navigate = useNavigate()
  const [passOpen, setPassOpen] = useState(false)
  const { selectedProduct, selectedColorId, conditions, conditionsReady, startQuickDemo, setItemPreset } =
    useFlow()
  const getCatalogProduct = useCatalogStore((state) => state.getProduct)
  const product = selectedProduct

  const result = useServerFit(product, conditions)

  if (!product || !result) return null
  const alternative = result.alternativeId ? getCatalogProduct(result.alternativeId) : null

  return (
    <main className="page has-sticky page-result">
      <StepHeader
        step={4}
        title="이 장면에서의 적합 정도"
        caption="총점 대신 세 구간으로 맞는지, 확인할 점을 보여 줍니다."
        backTo="/conditions"
      />

      {!conditionsReady ? (
        <p className="empty-note">
          빠른 체험 미리보기입니다. 조건을 바꾸려면 이전 단계에서 다시 입력할 수 있습니다.
        </p>
      ) : null}

      {!result.allConditionsMet ? (
        <p className="empty-note">
          현재 선택한 조건을 모두 만족하는 제품을 찾지 못했습니다.
        </p>
      ) : null}

      <FitCard product={product} colorId={selectedColorId ?? undefined} result={result}>
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
        <ItemLoadSummary items={conditions.items} presets={conditions.itemPresets} compact />
      </FitCard>

      <StorageCanvas
        product={product}
        colorId={selectedColorId ?? undefined}
        items={conditions.items}
        itemPresets={conditions.itemPresets}
        onSetPreset={setItemPreset}
      />

      <section className="result-notes" aria-label="결과 요약">
        <NoteCard
          tone="match"
          title="이 가방을 추천하는 이유"
          empty="선택한 조건과 강하게 겹치는 공식 근거는 아직 적습니다."
          items={result.matches}
        />
        <NoteCard
          tone="weak"
          title="제시한 조건과 낮은 적합성"
          empty="필수 조건에서 뚜렷한 불일치는 없습니다."
          items={result.mismatches}
        />
        <NoteCard
          tone="check"
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
          <button type="button" className="btn btn-primary" onClick={() => setPassOpen(true)}>
            매장 체험 요청하기
          </button>
        </div>
        {!conditionsReady ? (
          <button type="button" className="text-btn" onClick={() => startQuickDemo()}>
            빠른 체험 조건 유지
          </button>
        ) : null}
      </StickyBar>

      <FitPassRequestModal
        open={passOpen}
        storeChecks={result.storeChecks}
        alternativeId={result.alternativeId}
        onClose={() => setPassOpen(false)}
      />
    </main>
  )
}
