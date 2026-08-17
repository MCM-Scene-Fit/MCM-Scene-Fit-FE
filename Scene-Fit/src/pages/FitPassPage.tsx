import { useNavigate } from 'react-router-dom'
import { ProductMini } from '../components/ProductCard'
import { StepHeader, StickyBar } from '../components/StepHeader'
import { useFlow } from '../context/FlowContext'
import { EXPERIENCE_LABEL, STORES } from '../data/labels'
import { getProduct } from '../data/products'
import { runFitCheck } from '../lib/fitCheck'
import type { FitPassExperience } from '../types'

const EXPERIENCES = Object.keys(EXPERIENCE_LABEL) as FitPassExperience[]

export function FitPassPage() {
  const navigate = useNavigate()
  const {
    selectedProduct,
    selectedColorId,
    conditions,
    fitPass,
    setFitPass,
    toggleExperience,
    submitFitPass,
  } = useFlow()
  const product = selectedProduct
  const result = product ? runFitCheck(product, conditions) : null
  const alternative = result?.alternativeId ? getProduct(result.alternativeId) : null
  const ready = Boolean(fitPass.storeId && fitPass.experiences.length)

  if (!product) return null

  return (
    <main className="page has-sticky">
      <StepHeader
        step={6}
        title="Store Fit Pass"
        caption="매장에 “이 제품을 보여 주세요”가 아니라, 확인하고 싶은 질문을 전달합니다."
        backTo="/result"
      />

      <div className="fitpass-layout">
        <div>
          <ProductMini product={product} colorId={selectedColorId ?? undefined} />
          {alternative ? (
            <p className="muted" style={{ marginTop: 8 }}>
              비교 제품: {alternative.name}
            </p>
          ) : null}

          <section className="stack form-grid" style={{ marginTop: 16 }}>
        <label className="text-field">
          <span>희망 매장</span>
          <select
            value={fitPass.storeId}
            onChange={(event) => setFitPass({ storeId: event.target.value })}
          >
            <option value="">매장을 선택하세요</option>
            {STORES.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-field">
          <span>방문 희망 시간</span>
          <input
            type="datetime-local"
            value={fitPass.visitTime}
            onChange={(event) => setFitPass({ visitTime: event.target.value })}
          />
        </label>

        <div className="span-2">
          <p className="field-label">매장에서 받고 싶은 경험</p>
          <div className="stack tight">
            {EXPERIENCES.map((experience) => (
              <button
                key={experience}
                type="button"
                className={`choice ${fitPass.experiences.includes(experience) ? 'is-on' : ''}`}
                onClick={() => toggleExperience(experience)}
              >
                {EXPERIENCE_LABEL[experience]}
              </button>
            ))}
          </div>
        </div>

        <label className="text-field span-2">
          <span>직접 확인하고 싶은 항목</span>
          <textarea
            rows={3}
            placeholder="예: 카메라와 물병이 함께 들어가는지, 제 키에서 크로스바디 길이가 맞는지"
            value={fitPass.customNote}
            onChange={(event) => setFitPass({ customNote: event.target.value })}
          />
        </label>
          </section>
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
        실제 예약 확정이나 실시간 재고 차감은 하지 않습니다. 재고 및 체험 가능 여부 확인 요청만
        접수합니다.
      </p>
        </aside>
      </div>

      <StickyBar>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!ready}
          onClick={() => {
            submitFitPass()
            navigate('/fit-pass/done')
          }}
        >
          매장 체험 요청하기
        </button>
      </StickyBar>
    </main>
  )
}
