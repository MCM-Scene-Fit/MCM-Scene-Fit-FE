import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackButton } from '../components/BackButton'
import { BrandLogo } from '../components/BrandLogo'
import { ConditionsWizard } from '../components/ConditionsWizard'
import { ProductCard } from '../components/ProductCard'
import { StickyBar } from '../components/StepHeader'
import { useFlow } from '../context/FlowContext'
import { applyItemToggle, applyPresetChange, type PresetKind } from '../data/itemPresets'
import { CONDITION_STEPS, initialWizardStep } from '../lib/conditionsWizard'
import { isMockMode, postRecommend, toApiConditions } from '../api'
import { runFitCheck } from '../lib/fitCheck'
import { useCatalogStore } from '../store/useCatalogStore'
import { type Conditions, type ItemId, type Product } from '../types'

export function RecommendPage() {
  const navigate = useNavigate()
  const { selectProduct, setConditions } = useFlow()
  const catalog = useCatalogStore((state) => state.products)
  const getCatalogProduct = useCatalogStore((state) => state.getProduct)
  const ensureProduct = useCatalogStore((state) => state.ensureProduct)
  const [draft, setDraft] = useState<Conditions>({
    scene: null,
    mobility: null,
    items: ['phone', 'wallet'],
    itemPresets: {},
    wearStyle: null,
    destination: '',
    rewearScene: null,
  })
  const [step, setStep] = useState(() => initialWizardStep(draft))
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [candidates, setCandidates] = useState<Product[]>([])
  const [emptyReason, setEmptyReason] = useState<string | null>(null)
  const current = CONDITION_STEPS[step - 1]

  const ready = Boolean(draft.scene && draft.mobility && draft.items.length && draft.wearStyle)

  const localCandidates = () =>
    catalog
      .map((product) => {
        const result = runFitCheck(product, draft, catalog)
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
      .map((entry) => entry.product)

  const loadCandidates = async () => {
    const payload = toApiConditions(draft)
    if (!payload) return
    setSubmitted(true)
    setLoading(true)
    setEmptyReason(null)
    if (isMockMode()) {
      const next = localCandidates()
      setCandidates(next)
      setEmptyReason(next.length ? null : '현재 선택한 조건을 모두 만족하는 제품을 찾지 못했습니다.')
      setLoading(false)
      return
    }
    try {
      const data = await postRecommend(payload)
      const resolved = (
        await Promise.all(
          data.candidates.map(async (entry) => {
            return (await ensureProduct(entry.productId)) ?? getCatalogProduct(entry.productId) ?? null
          }),
        )
      ).filter((product): product is Product => product !== null)
      setCandidates(resolved)
      setEmptyReason(
        resolved.length
          ? null
          : data.emptyReason ?? '현재 선택한 조건을 모두 만족하는 제품을 찾지 못했습니다.',
      )
    } catch {
      const next = localCandidates()
      setCandidates(next)
      setEmptyReason(next.length ? null : '현재 선택한 조건을 모두 만족하는 제품을 찾지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const toggleItem = (item: ItemId) => {
    setDraft((prev) => ({
      ...prev,
      items: applyItemToggle(prev.items, item, prev.itemPresets),
    }))
  }

  const setPreset = (kind: PresetKind, presetId: string) => {
    setDraft((prev) => {
      const next = applyPresetChange(prev.items, prev.itemPresets, kind, presetId)
      return { ...prev, items: next.items, itemPresets: next.itemPresets }
    })
  }

  return (
    <main className={`page ${step >= 3 ? 'has-sticky' : ''}`}>
      <header className="step-header">
        <BrandLogo compact />
        <div className="step-header__top">
          <BackButton onClick={() => (step === 1 ? navigate('/') : setStep(step - 1))} />
          <p className="eyebrow">보조 진입 · 필수 {step}/4</p>
        </div>
        <h1>{current.title}</h1>
        <p className="muted">{current.caption}</p>
      </header>

      <ConditionsWizard
        value={draft}
        step={step}
        onStepChange={setStep}
        onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
        onToggleItem={toggleItem}
        onSetPreset={setPreset}
      />

      {step === 4 && submitted && !loading && candidates.length === 0 ? (
        <p className="empty-note">
          {emptyReason ??
            '현재 선택한 조건을 모두 만족하는 제품을 찾지 못했습니다. 착용 방식이나 소지품을 바꿔 보거나, 매장에서 확인할 내용으로 남겨 주세요.'}
        </p>
      ) : null}

      {step === 4 && loading ? (
        <p className="empty-note">조건에 맞는 후보를 찾고 있습니다...</p>
      ) : null}

      {step === 4 && candidates.length > 0 ? (
        <div className="product-grid" style={{ marginTop: 8 }}>
          {candidates.map((product) => (
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

      {step === 3 ? (
        <StickyBar>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!draft.items.length}
            onClick={() => setStep(4)}
          >
            다음
          </button>
        </StickyBar>
      ) : null}

      {step === 4 ? (
        <StickyBar>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!ready || loading}
            onClick={() => void loadCandidates()}
          >
            후보 3개 보기
          </button>
        </StickyBar>
      ) : null}
    </main>
  )
}
