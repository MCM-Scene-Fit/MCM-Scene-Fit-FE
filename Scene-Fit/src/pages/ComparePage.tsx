import { useMemo, useState } from 'react'
import { CompareCard } from '../components/CompareCard'
import { FitPassRequestModal } from '../components/FitPassRequestModal'
import { StepHeader, StickyBar } from '../components/StepHeader'
import { useFlow } from '../context/FlowContext'
import { getProduct } from '../data/products'
import { runFitCheck } from '../lib/fitCheck'

export function ComparePage() {
  const [passTarget, setPassTarget] = useState<'selected' | 'alternative' | null>(null)
  const { selectedProduct, selectedColorId, conditions } = useFlow()
  const selected = selectedProduct

  const result = useMemo(() => {
    if (!selected) return null
    return runFitCheck(selected, conditions)
  }, [selected, conditions])

  const alternative = result?.alternativeId ? getProduct(result.alternativeId) : null
  const altResult = useMemo(() => {
    if (!alternative) return null
    return runFitCheck(alternative, conditions)
  }, [alternative, conditions])

  if (!selected || !result || !alternative || !altResult) {
    return (
      <main className="page">
        <StepHeader step={5} title="비교" backTo="/result" />
        <p className="empty-note">비교할 대안 제품이 없습니다. 결과 화면으로 돌아가 주세요.</p>
      </main>
    )
  }

  return (
    <main className="page has-sticky">
      <StepHeader
        step={5}
        title="같은 기준으로 비교하세요"
        caption="대표 제품을 억지로 고르지 않습니다. 확인할 점까지 함께 봅니다."
        backTo="/result"
      />

      <CompareCard
        selected={{
          badge: '지금 선택',
          product: selected,
          colorId: selectedColorId ?? undefined,
          result,
        }}
        alternative={{
          badge: '대안',
          product: alternative,
          result: altResult,
        }}
      />

      <StickyBar>
        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={() => setPassTarget('selected')}>
            지금 가방으로 Fit Pass
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setPassTarget('alternative')}
          >
            대안으로 Fit Pass
          </button>
        </div>
      </StickyBar>

      <FitPassRequestModal
        open={passTarget !== null}
        product={passTarget === 'alternative' ? alternative : selected}
        colorId={
          passTarget === 'alternative'
            ? alternative.colors[0].id
            : (selectedColorId ?? undefined)
        }
        storeChecks={passTarget === 'alternative' ? altResult.storeChecks : result.storeChecks}
        onClose={() => setPassTarget(null)}
      />
    </main>
  )
}
