import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EvidenceBadge } from '../components/EvidenceBadge'
import { FitCard } from '../components/FitCard'
import { FitPassRequestModal } from '../components/FitPassRequestModal'
import { ItemLoadSummary } from '../components/ItemLoadSummary'
import { ProductMini } from '../components/ProductCard'
import { StorageCanvas } from '../components/StorageCanvas'
import { StepHeader, StickyBar } from '../components/StepHeader'
import { WearPreview } from '../components/WearPreview'
import { useFlow } from '../context/FlowContext'
import { useSceneVisual } from '../hooks/useSceneVisual'
import { useServerFit } from '../hooks/useServerFit'
import { formatOccupancy } from '../lib/itemFit'
import { useCatalogStore } from '../store/useCatalogStore'
import type { ItemVerdict } from '../types'

function SceneVisualCard({
  destination,
  concept,
  place,
  loading,
  onEditDestination,
}: {
  destination: string
  concept: string | null
  place: string | null
  loading: boolean
  onEditDestination: () => void
}) {
  const trimmed = destination.trim()
  if (!trimmed) return null
  return (
    <p className="scene-visual-caption">
      <span className="scene-visual-destination">{trimmed}</span>
      {loading ? <span> · 장면 만드는 중…</span> : null}
      {!loading && concept ? <span> · {concept}</span> : null}
      {!loading && place ? <span className="scene-visual-place">{place}</span> : null}
      {!loading && place ? (
        <a
          className="scene-visual-map"
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place} ${trimmed.split(',')[0]}`)}`}
          target="_blank"
          rel="noreferrer"
        >
          지도에서 보기
        </a>
      ) : null}
      <button type="button" className="scene-visual-edit" onClick={onEditDestination}>
        바꾸기
      </button>
    </p>
  )
}

function NoteCard({
  tone,
  title,
  items,
}: {
  tone: 'match' | 'weak' | 'check'
  title: string
  items: string[]
}) {
  // 할 말이 없는 카드는 아예 안 보여준다 — "불일치 없음" 카드가 세 번째 자리를 차지할
  // 이유가 없다.
  if (!items.length) return null
  return (
    <article className={`note-card note-card--${tone}`}>
      <h4>{title}</h4>
      <ul>
        {items.map((line) => (
          <li key={line}>{line}</li>
        ))}
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
  const {
    selectedProduct,
    selectedColorId,
    conditions,
    conditionsReady,
    startQuickDemo,
    setItemPreset,
    previewMode,
    photoUrl,
    body,
    bag,
    setBag,
  } = useFlow()
  const getCatalogProduct = useCatalogStore((state) => state.getProduct)
  const product = selectedProduct

  const result = useServerFit(product, conditions)
  const sceneVisual = useSceneVisual(conditions, Boolean(photoUrl), body)

  if (!product || !result) return null
  const alternative = result.alternativeId ? getCatalogProduct(result.alternativeId) : null
  const wearStyle = conditions.wearStyle ?? product.wearStyles[0]

  return (
    <main className="page has-sticky page-result">
      <StepHeader
        variant="catalog"
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

      <section className="scene-visual" aria-label="장면 속 내 모습">
        <WearPreview
          product={product}
          colorId={selectedColorId ?? product.colors[0].id}
          mode={previewMode}
          photoUrl={photoUrl}
          body={body}
          wearStyle={wearStyle}
          bag={bag}
          onBagChange={setBag}
          onUploadClick={() => navigate('/preview')}
          onCameraClick={() => navigate('/preview')}
          backgroundUrl={sceneVisual.backgroundUrl}
          portraitUrl={sceneVisual.portraitUrl}
          sceneLoading={sceneVisual.loading}
        />
        <SceneVisualCard
          destination={conditions.destination}
          concept={sceneVisual.concept}
          place={sceneVisual.place}
          loading={sceneVisual.loading}
          onEditDestination={() => navigate('/conditions')}
        />
      </section>

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
        <NoteCard tone="match" title="이 가방을 추천하는 이유" items={result.matches} />
        <NoteCard tone="weak" title="제시한 조건과 낮은 적합성" items={result.mismatches} />
        <NoteCard tone="check" title="매장에서 확인할 점" items={result.storeChecks} />
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
