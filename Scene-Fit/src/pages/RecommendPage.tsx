import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { useFlow } from '../context/FlowContext'
import {
  ITEM_LABEL,
  MOBILITY_LABEL,
  SCENE_LABEL,
  WEAR_LABEL,
} from '../data/labels'
import { PRODUCTS } from '../data/products'
import { runFitCheck } from '../lib/fitCheck'
import { ITEMS, MOBILITY, SCENES, WEAR_STYLES, type Conditions, type ItemId } from '../types'

export function RecommendPage() {
  const navigate = useNavigate()
  const { selectProduct, setConditions } = useFlow()
  const [draft, setDraft] = useState<Conditions>({
    scene: null,
    mobility: null,
    items: ['phone', 'wallet'],
    wearStyle: null,
    destination: '',
    rewearScene: null,
  })
  const [submitted, setSubmitted] = useState(false)

  const ready = Boolean(draft.scene && draft.mobility && draft.items.length && draft.wearStyle)

  const candidates = useMemo(() => {
    if (!submitted || !ready) return []
    return PRODUCTS.map((product) => {
      const result = runFitCheck(product, draft)
      const score =
        (result.sceneMatch.positive ? 3 : 0) +
        result.carryCheck.items.filter((item) => item.level === 'confirmed').length +
        (result.rewearPotential.positive ? 1 : 0) -
        result.carryCheck.items.filter((item) => item.level === 'unlikely').length * 4 -
        (draft.wearStyle && !product.wearStyles.includes(draft.wearStyle) ? 6 : 0)
      return { product, score }
    })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }, [draft, ready, submitted])

  const toggleItem = (item: ItemId) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.includes(item)
        ? prev.items.filter((value) => value !== item)
        : [...prev.items, item],
    }))
  }

  return (
    <main className="page">
      <header className="step-header">
        <div className="step-header__top">
          <button type="button" className="icon-btn" onClick={() => navigate('/')} aria-label="뒤로">
            ←
          </button>
          <p className="eyebrow">보조 진입</p>
        </div>
        <h1>조건에 맞는 후보를 찾아볼게요</h1>
        <p className="muted">추천은 시작점입니다. 선택한 가방은 다시 장면과 조건으로 검증합니다.</p>
      </header>

      <section className="stack form-grid">
        <Field label="장면">
          {SCENES.map((scene) => (
            <Chip
              key={scene}
              on={draft.scene === scene}
              onClick={() => setDraft((prev) => ({ ...prev, scene }))}
            >
              {SCENE_LABEL[scene]}
            </Chip>
          ))}
        </Field>
        <Field label="이동량">
          {MOBILITY.map((mobility) => (
            <Chip
              key={mobility}
              on={draft.mobility === mobility}
              onClick={() => setDraft((prev) => ({ ...prev, mobility }))}
            >
              {MOBILITY_LABEL[mobility]}
            </Chip>
          ))}
        </Field>
        <Field label="소지품" wide>
          {ITEMS.map((item) => (
            <Chip key={item} on={draft.items.includes(item)} onClick={() => toggleItem(item)}>
              {ITEM_LABEL[item]}
            </Chip>
          ))}
        </Field>
        <Field label="선호 착용 방식">
          {WEAR_STYLES.map((wear) => (
            <Chip
              key={wear}
              on={draft.wearStyle === wear}
              onClick={() => setDraft((prev) => ({ ...prev, wearStyle: wear }))}
            >
              {WEAR_LABEL[wear]}
            </Chip>
          ))}
        </Field>
      </section>

      <button
        type="button"
        className="btn btn-primary btn-fit"
        disabled={!ready}
        onClick={() => setSubmitted(true)}
      >
        후보 3개 보기
      </button>

      {submitted && candidates.length === 0 ? (
        <p className="empty-note">
          현재 선택한 조건을 모두 만족하는 제품을 찾지 못했습니다. 착용 방식이나 소지품을 바꿔 보거나,
          매장에서 확인할 내용으로 남겨 주세요.
        </p>
      ) : null}

      {candidates.length > 0 ? (
        <div className="product-grid" style={{ marginTop: 20 }}>
          {candidates.map(({ product }) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={(productId, colorId) => {
                selectProduct(productId, colorId)
                setConditions(draft)
                navigate('/preview')
              }}
            />
          ))}
        </div>
      ) : null}
    </main>
  )
}

function Field({
  label,
  wide,
  children,
}: {
  label: string
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div className={wide ? 'span-2' : undefined}>
      <p className="field-label">{label}</p>
      <div className="chip-row">{children}</div>
    </div>
  )
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button type="button" className={`chip ${on ? 'is-on' : ''}`} onClick={onClick}>
      {children}
    </button>
  )
}
