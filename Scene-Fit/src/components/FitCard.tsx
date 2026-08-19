import type { CSSProperties, ReactNode } from 'react'
import { AXIS_CODE, AXIS_STATUS_LABEL, EVIDENCE_LABEL, formatPrice } from '../data/labels'
import { bagImageRatio, getColor } from '../data/products'
import { resultEvidence } from '../lib/fitCheck'
import type { AxisStatus, EvidenceLevel, FitResult, Product } from '../types'
import { AxisMeter, AxisPill } from './AxisMeter'
import { EvidenceStamp } from './EvidenceBadge'
import { ProductImage } from './ProductImage'

const AXIS_META = [
  { key: 'sceneMatch', code: AXIS_CODE.sceneMatch, name: 'Scene Match' },
  { key: 'carryCheck', code: AXIS_CODE.carryCheck, name: 'Carry Check' },
  { key: 'rewearPotential', code: AXIS_CODE.rewearPotential, name: 'Rewear Potential' },
] as const

function axisStatus(result: FitResult, key: (typeof AXIS_META)[number]['key']): AxisStatus {
  return result[key].status
}

function axisHeadline(result: FitResult, key: (typeof AXIS_META)[number]['key']) {
  return result[key].headline
}

export function FitCard({
  product,
  colorId,
  result,
  passId,
  children,
}: {
  product: Product
  colorId?: string
  result: FitResult
  passId?: string
  children?: ReactNode
}) {
  const color = getColor(product, colorId ?? product.colors[0].id)
  const evidence: EvidenceLevel = resultEvidence(result)
  const ticketNo = passId ?? `SF-${product.sku.slice(-6)}`

  return (
    <article className="fit-card" aria-label="Scene Fit Card">
      <span className="fit-card__punch" aria-hidden="true" />
      <EvidenceStamp level={evidence} />

      <div className="fit-card__main">
        <header className="fit-card__head">
          <p className="fit-card__mark">SCENE FIT</p>
          <p className="fit-card__no">{ticketNo}</p>
        </header>

        <div className="fit-card__product">
          <div
            className="fit-card__visual"
            style={{ '--bag-ratio': bagImageRatio(product, color.id) } as CSSProperties}
          >
            <ProductImage product={product} colorId={color.id} decorative />
          </div>
          <div className="fit-card__copy">
            <p className="eyebrow">{product.category}</p>
            <h2>{product.name}</h2>
            <p className="fit-card__meta">
              {color.name} · {product.sizeLabel}
              <span className="price"> {formatPrice(product.price)}</span>
            </p>
            <p className="fit-card__dims">
              {product.widthMm / 10} × {product.heightMm / 10} × {product.depthMm / 10} cm
            </p>
          </div>
        </div>

        <ol className="fit-route" aria-label="적합 구간">
          {AXIS_META.map((axis, index) => (
            <li key={axis.code}>
              {index > 0 ? (
                <span className="fit-route__sep" aria-hidden="true">
                  →
                </span>
              ) : null}
              <span className="fit-route__code">{axis.code}</span>
              <span className="fit-route__name">{axis.name}</span>
              <strong>{AXIS_STATUS_LABEL[axisStatus(result, axis.key)]}</strong>
            </li>
          ))}
        </ol>

        <p className="fit-card__evidence muted">
          근거 수준 {EVIDENCE_LABEL[evidence]}. 단정이 아니라 확인된 범위만 보여 줍니다.
        </p>

        <div className="fit-swipe" aria-label="축별 결과">
          {AXIS_META.map((axis) => (
            <section key={axis.code} className="fit-swipe__panel">
              <div className="fit-swipe__top">
                <p className="fit-swipe__code">{axis.code}</p>
                <AxisPill status={axisStatus(result, axis.key)} />
              </div>
              <p className="eyebrow">{axis.name}</p>
              <AxisMeter status={axisStatus(result, axis.key)} label={axis.name} />
              <h3>{axisHeadline(result, axis.key)}</h3>
              {axis.key === 'sceneMatch' ? (
                <p className="muted">{result.sceneMatch.detail}</p>
              ) : null}
              {axis.key === 'carryCheck' ? children : null}
              {axis.key === 'rewearPotential' ? (
                <p className="muted">{result.rewearPotential.detail}</p>
              ) : null}
            </section>
          ))}
        </div>
      </div>

      <div className="fit-card__perf" aria-hidden="true" />

      <aside className="fit-card__stub">
        <p className="fit-card__stub-kicker">STUB</p>
        <p className="fit-card__stub-gate">GATE</p>
        <p className="fit-card__stub-code">FIT</p>
        <ul>
          {AXIS_META.map((axis) => (
            <li key={axis.code}>
              <span>{axis.code}</span>
              <b>{AXIS_STATUS_LABEL[axisStatus(result, axis.key)]}</b>
            </li>
          ))}
        </ul>
      </aside>
    </article>
  )
}
