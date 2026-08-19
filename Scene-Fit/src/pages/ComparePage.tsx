import { useMemo, useState } from 'react'
import { FitPassRequestModal } from '../components/FitPassRequestModal'
import { ProductMini } from '../components/ProductCard'
import { StepHeader, StickyBar } from '../components/StepHeader'
import { useFlow } from '../context/FlowContext'
import { formatPrice, EVIDENCE_BADGE, EVIDENCE_LABEL, ITEM_LABEL } from '../data/labels'
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

  const rows = [
    ['Scene Match', result.sceneMatch.headline, altResult.sceneMatch.headline],
    ['Carry Check', result.carryCheck.headline, altResult.carryCheck.headline],
    [
      '수납 지표',
      result.carryCheck.score == null ? '—' : `${result.carryCheck.score}/100`,
      altResult.carryCheck.score == null ? '—' : `${altResult.carryCheck.score}/100`,
    ],
    ['Rewear', result.rewearPotential.headline, altResult.rewearPotential.headline],
    [
      '확인 필요',
      result.storeChecks[0] ?? '없음',
      altResult.storeChecks[0] ?? '없음',
    ],
    ['가격', formatPrice(selected.price), formatPrice(alternative.price)],
  ]

  return (
    <main className="page has-sticky">
      <StepHeader
        step={5}
        title="같은 기준으로 비교하세요"
        caption="대표 제품을 억지로 고르지 않습니다. 확인할 점까지 함께 봅니다."
        backTo="/result"
      />

      <div className="compare-heads">
        <ProductMini product={selected} colorId={selectedColorId ?? undefined} />
        <ProductMini product={alternative} />
      </div>

      <table className="compare-table">
        <tbody>
          {rows.map(([label, left, right]) => (
            <tr key={label}>
              <th>{label}</th>
              <td>{left}</td>
              <td>{right}</td>
            </tr>
          ))}
          <tr>
            <th>소지품</th>
            <td>
              {result.carryCheck.items
                .map(
                  (item) =>
                    `${ITEM_LABEL[item.item]} ${EVIDENCE_BADGE[item.level]} ${EVIDENCE_LABEL[item.level]}`,
                )
                .join(', ')}
            </td>
            <td>
              {altResult.carryCheck.items
                .map(
                  (item) =>
                    `${ITEM_LABEL[item.item]} ${EVIDENCE_BADGE[item.level]} ${EVIDENCE_LABEL[item.level]}`,
                )
                .join(', ')}
            </td>
          </tr>
        </tbody>
      </table>

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
