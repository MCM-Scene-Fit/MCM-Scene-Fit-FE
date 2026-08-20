import { useState } from 'react'
import { CompareCard } from '../components/CompareCard'
import { FitPassRequestModal } from '../components/FitPassRequestModal'
import { StepHeader, StickyBar } from '../components/StepHeader'
import { useFlow } from '../context/FlowContext'
import { useServerCompare } from '../hooks/useServerFit'

export function ComparePage() {
  const [passTarget, setPassTarget] = useState<'selected' | 'alternative' | null>(null)
  const { selectedProduct, selectedColorId, conditions } = useFlow()
  const selected = selectedProduct
  const compared = useServerCompare(selected, conditions)

  if (!selected || !compared.selected || !compared.alternative) {
    return (
      <main className="page">
        <StepHeader step={5} title="비교" backTo="/result" />
        <p className="empty-note">
          {compared.message ?? '비교할 대안 제품이 없습니다. 결과 화면으로 돌아가 주세요.'}
        </p>
      </main>
    )
  }

  const { product: alternative, result: altResult } = compared.alternative
  const result = compared.selected

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
        {/* 버튼에 "Fit Pass"까지 넣으면 좁은 화면에서 한쪽만 두 줄로 접힌다.
            공통 맥락은 캡션으로 올리고 버튼에는 선택지만 남긴다. */}
        <p className="sticky-caption">매장 체험(Fit Pass) 요청</p>
        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={() => setPassTarget('selected')}>
            지금 가방으로
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setPassTarget('alternative')}
          >
            대안으로
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
        alternativeId={passTarget === 'alternative' ? selected.id : alternative.id}
        onClose={() => setPassTarget(null)}
      />
    </main>
  )
}
