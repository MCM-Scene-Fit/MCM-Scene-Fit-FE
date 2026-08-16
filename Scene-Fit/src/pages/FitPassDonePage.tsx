import { useNavigate } from 'react-router-dom'
import { ProductMini } from '../components/ProductCard'
import { useFlow } from '../context/FlowContext'
import { EXPERIENCE_LABEL, STORES } from '../data/labels'
import { getColor } from '../data/products'

export function FitPassDonePage() {
  const navigate = useNavigate()
  const { selectedProduct, selectedColorId, fitPass, fitPassStatus, resetFlow } = useFlow()
  const product = selectedProduct
  const store = STORES.find((item) => item.id === fitPass.storeId)

  if (!product) return null
  const color = getColor(product, selectedColorId ?? product.colors[0].id)

  return (
    <main className="page done">
      <section className="done-copy">
        <p className="brand-mark">STORE FIT PASS</p>
        <h1>확인 요청이 접수되었습니다</h1>
        <p className="lede">
          데모 상태입니다. 실시간 재고를 확정하지 않으며, 매장에서 체험 가능 여부를 확인하는
          요청만 남깁니다.
        </p>
        <div className="status-pill">상태: {fitPassStatus === 'checking' ? '확인 중' : '요청 접수'}</div>
      </section>

      <section className="done-panel">
        <ProductMini product={product} colorId={color.id} />

      <section className="note-card">
        <p>
          <strong>매장</strong> {store?.name ?? '미선택'}
        </p>
        <p>
          <strong>희망 시간</strong> {fitPass.visitTime || '조율 필요'}
        </p>
        <p>
          <strong>체험</strong>
        </p>
        <ul>
          {fitPass.experiences.map((experience) => (
            <li key={experience}>{EXPERIENCE_LABEL[experience]}</li>
          ))}
        </ul>
        {fitPass.customNote ? (
          <p>
            <strong>질문</strong> {fitPass.customNote}
          </p>
        ) : null}
      </section>

      <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
        처음으로
      </button>
      <button
        type="button"
        className="text-btn"
        onClick={() => {
          resetFlow()
          navigate('/')
        }}
      >
        세션 초기화
      </button>
      </section>
    </main>
  )
}
