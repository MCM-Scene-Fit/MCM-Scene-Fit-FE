import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProductMini } from '../components/ProductCard'
import { StepHeader, StickyBar } from '../components/StepHeader'
import { useFlow } from '../context/FlowContext'
import { EVIDENCE_LABEL, ITEM_LABEL } from '../data/labels'
import { getProduct } from '../data/products'
import { evidenceTone, runFitCheck } from '../lib/fitCheck'

export function ResultPage() {
  const navigate = useNavigate()
  const { selectedProduct, selectedColorId, conditions, conditionsReady, startQuickDemo } =
    useFlow()
  const product = selectedProduct

  const result = useMemo(() => {
    if (!product) return null
    return runFitCheck(product, conditions)
  }, [product, conditions])

  if (!product || !result) return null
  const alternative = result.alternativeId ? getProduct(result.alternativeId) : null

  return (
    <main className="page has-sticky">
      <StepHeader
        step={4}
        title="Scene Fit Card"
        caption="총점 대신 세 축으로 맞는지, 확인할 점을 보여 줍니다."
        backTo="/conditions"
      />

      <ProductMini product={product} colorId={selectedColorId ?? undefined} />

      {!conditionsReady ? (
        <p className="empty-note">
          빠른 체험 미리보기입니다. 조건을 바꾸려면 이전 단계에서 다시 입력할 수 있습니다.
        </p>
      ) : null}

      <section className="fit-axes">
        <article>
          <p className="eyebrow">Scene Match</p>
          <h3>{result.sceneMatch.headline}</h3>
          <p className="muted">{result.sceneMatch.detail}</p>
        </article>
        <article>
          <p className="eyebrow">Carry Check</p>
          <h3>{result.carryCheck.headline}</h3>
          <ul className="verdicts">
            {result.carryCheck.items.map((item) => (
              <li key={item.item} className={evidenceTone(item.level)}>
                <span>{ITEM_LABEL[item.item]}</span>
                <b>{EVIDENCE_LABEL[item.level]}</b>
              </li>
            ))}
          </ul>
        </article>
        <article>
          <p className="eyebrow">Rewear Potential</p>
          <h3>{result.rewearPotential.headline}</h3>
          <p className="muted">{result.rewearPotential.detail}</p>
        </article>
      </section>

      <div className="result-bottom">
        <section className="note-card">
        <h4>이 가방이 잘 맞는 이유</h4>
        <ul>
          {result.matches.length ? result.matches.map((line) => <li key={line}>{line}</li>) : (
            <li>선택한 조건과 강하게 겹치는 공식 근거는 아직 적습니다.</li>
          )}
        </ul>
        <h4>가장 잘 맞지 않는 조건</h4>
        <ul>
          {result.mismatches.length ? result.mismatches.map((line) => <li key={line}>{line}</li>) : (
            <li>필수 조건에서 뚜렷한 불일치는 없습니다.</li>
          )}
        </ul>
        <h4>구매 전에 확인할 점</h4>
        <ul>
          {result.storeChecks.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

        {alternative ? (
          <section className="alt-card">
            <p className="eyebrow">조건을 바꿨을 때의 대안</p>
            <ProductMini product={alternative} />
          </section>
        ) : null}
      </div>

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
          <button type="button" className="btn btn-primary" onClick={() => navigate('/fit-pass')}>
            Fit Pass 만들기
          </button>
        </div>
        {!conditionsReady ? (
          <button type="button" className="text-btn" onClick={() => startQuickDemo()}>
            빠른 체험 조건 유지
          </button>
        ) : null}
      </StickyBar>
    </main>
  )
}
