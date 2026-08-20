import { useNavigate } from 'react-router-dom'
import { FitPassFields } from '../components/FitPassForm'
import { ProductMini } from '../components/ProductCard'
import { StepHeader, StickyBar } from '../components/StepHeader'
import { useFlow } from '../context/FlowContext'
import { useServerFit } from '../hooks/useServerFit'
import { useFitPassSubmit } from '../lib/fitPass'
import { useCatalogStore } from '../store/useCatalogStore'

export function FitPassPage() {
  const navigate = useNavigate()
  const { selectedProduct, selectedColorId, conditions } = useFlow()
  const getCatalogProduct = useCatalogStore((state) => state.getProduct)
  const product = selectedProduct
  const result = useServerFit(product, conditions)
  const alternative = result?.alternativeId ? getCatalogProduct(result.alternativeId) : null
  const { ready, error, onSubmit } = useFitPassSubmit(
    result?.storeChecks ?? [],
    () => {
      navigate('/fit-pass/done')
    },
    product
      ? { productId: product.id, colorId: selectedColorId ?? undefined, alternativeId: result?.alternativeId }
      : undefined,
  )

  if (!product) return null

  return (
    <main className="page has-sticky">
      <StepHeader
        step={6}
        title="Store Fit Pass"
        caption="매장에 “이 제품을 보여 주세요”가 아니라, 확인하고 싶은 질문을 전달합니다."
        backTo="/result"
      />

      <form onSubmit={(event) => void onSubmit(event)}>
        <div className="fitpass-layout">
          <div>
            <ProductMini product={product} colorId={selectedColorId ?? undefined} />
            {alternative ? (
              <p className="muted" style={{ marginTop: 8 }}>
                비교 제품: {alternative.name}
              </p>
            ) : null}
            <div style={{ marginTop: 16 }}>
              <FitPassFields />
            </div>
          </div>

          <aside className="fitpass-aside">
            {result ? (
              <section className="note-card">
                <h4>Fit Pass에 함께 담기는 내용</h4>
                <ul>
                  {result.matches.slice(0, 2).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                  {result.storeChecks.slice(0, 2).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <p className="disclaimer">
              실제 예약 확정이나 실시간 재고 차감은 하지 않습니다. 재고 및 체험 가능 여부 확인
              요청만 접수합니다.
            </p>
            {error ? <p className="empty-note">{error}</p> : null}
          </aside>
        </div>

        <StickyBar>
          <button type="submit" className="btn btn-primary" disabled={!ready}>
            매장 체험 요청하기
          </button>
        </StickyBar>
      </form>
    </main>
  )
}
