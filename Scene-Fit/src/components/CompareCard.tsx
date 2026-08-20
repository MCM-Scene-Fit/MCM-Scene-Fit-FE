import type { CSSProperties, ReactNode } from 'react'
import { WEAR_LABEL, formatPrice } from '../data/labels'
import { bagCardScale, bagImageRatio, getColor } from '../data/products'
import { formatOccupancy } from '../lib/itemFit'
import { useCatalogStore } from '../store/useCatalogStore'
import type { AxisStatus, FitResult, ItemVerdict, Product } from '../types'
import { AxisMeter, AxisPill } from './AxisMeter'
import { EvidenceBadge } from './EvidenceBadge'
import { ProductImage } from './ProductImage'

export type CompareSide = {
  badge: string
  product: Product
  colorId?: string
  result: FitResult
}

type CompareCardProps = {
  selected: CompareSide
  alternative: CompareSide
}

function ComparePreview({ badge, product, colorId }: Omit<CompareSide, 'result'>) {
  const catalog = useCatalogStore((state) => state.products)
  const color = getColor(product, colorId ?? product.colors[0].id)

  return (
    <div className="compare-preview">
      <span className="compare-preview__badge">{badge}</span>
      <div
        className="compare-preview__visual"
        style={
          {
              '--bag-scale': String(bagCardScale(product, catalog)),
            '--bag-ratio': bagImageRatio(product, color.id),
          } as CSSProperties
        }
      >
        <div className="compare-preview__bag">
          <ProductImage product={product} colorId={color.id} decorative />
        </div>
      </div>
      <p className="eyebrow">{product.category}</p>
      <strong>{product.name}</strong>
      <p className="muted">
        {product.sizeLabel} · {product.widthMm / 10} × {product.heightMm / 10} ×{' '}
        {product.depthMm / 10} cm
      </p>
      <p className="compare-preview__wear">
        {product.wearStyles.map((wear) => WEAR_LABEL[wear]).join(' · ')}
      </p>
      <p className="muted">{color.name}</p>
    </div>
  )
}

function CompareRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="compare-row" aria-label={label}>
      <p className="compare-row__label eyebrow">{label}</p>
      {children}
    </section>
  )
}

function AxisCell({
  label,
  status,
  headline,
  differ,
  children,
}: {
  label: string
  status: AxisStatus
  headline: string
  differ?: boolean
  children?: ReactNode
}) {
  return (
    <div className={`compare-cell compare-cell--${status}${differ ? ' is-diff' : ''}`}>
      <div className="compare-cell__top">
        <AxisPill status={status} />
      </div>
      <AxisMeter status={status} label={label} />
      <p className="compare-cell__headline">{headline}</p>
      {children}
    </div>
  )
}

function CarryScore({ score }: { score: number | null }) {
  if (score == null) return null
  return (
    <p className="compare-score" aria-label={`수납 지표 ${score}점`}>
      <strong>{score}</strong>
      <span>/100</span>
    </p>
  )
}

function ItemBadges({ items }: { items: ItemVerdict[] }) {
  if (!items.length) {
    return <p className="muted">선택한 소지품이 없습니다.</p>
  }

  return (
    <ul className="compare-items">
      {items.map((item) => (
        <li key={item.item} className={`compare-item compare-item--${item.level}`}>
          <span>{item.label}</span>
          <EvidenceBadge level={item.level} />
          <small>점유 {formatOccupancy(item.fillRatio)}</small>
        </li>
      ))}
    </ul>
  )
}

function StoreChecks({ items }: { items: string[] }) {
  if (!items.length) {
    return <p className="muted">지금 단계에서 따로 확인할 항목은 없습니다.</p>
  }

  return (
    <ul className="compare-checks">
      {items.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  )
}

function PriceCell({ product }: { product: Product }) {
  return (
    <div className="compare-price">
      <strong>{formatPrice(product.price)}</strong>
      {product.officialUrl ? (
        <a className="text-link" href={product.officialUrl} target="_blank" rel="noreferrer">
          공식 상세
        </a>
      ) : null}
    </div>
  )
}

export function CompareCard({ selected, alternative }: CompareCardProps) {
  const sides = [selected, alternative]
  const sceneDiff = selected.result.sceneMatch.status !== alternative.result.sceneMatch.status
  const carryDiff =
    selected.result.carryCheck.status !== alternative.result.carryCheck.status ||
    selected.result.carryCheck.score !== alternative.result.carryCheck.score
  const rewearDiff =
    selected.result.rewearPotential.status !== alternative.result.rewearPotential.status
  const priceDiff = selected.product.price !== alternative.product.price

  return (
    <article className="compare-card">
      <div className="compare-card__heads">
        {sides.map((side) => (
          <ComparePreview
            key={side.product.id}
            badge={side.badge}
            product={side.product}
            colorId={side.colorId}
          />
        ))}
      </div>

      <CompareRow label="Scene Match">
        {sides.map((side) => (
          <AxisCell
            key={side.product.id}
            label="Scene Match"
            status={side.result.sceneMatch.status}
            headline={side.result.sceneMatch.headline}
            differ={sceneDiff}
          />
        ))}
      </CompareRow>

      <CompareRow label="Carry Check">
        {sides.map((side) => (
          <AxisCell
            key={side.product.id}
            label="Carry Check"
            status={side.result.carryCheck.status}
            headline={side.result.carryCheck.headline}
            differ={carryDiff}
          >
            <CarryScore score={side.result.carryCheck.score} />
          </AxisCell>
        ))}
      </CompareRow>

      <CompareRow label="Rewear Potential">
        {sides.map((side) => (
          <AxisCell
            key={side.product.id}
            label="Rewear Potential"
            status={side.result.rewearPotential.status}
            headline={side.result.rewearPotential.headline}
            differ={rewearDiff}
          />
        ))}
      </CompareRow>

      <CompareRow label="소지품">
        {sides.map((side) => (
          <ItemBadges key={side.product.id} items={side.result.carryCheck.items} />
        ))}
      </CompareRow>

      <CompareRow label="매장 확인">
        {sides.map((side) => (
          <StoreChecks key={side.product.id} items={side.result.storeChecks} />
        ))}
      </CompareRow>

      <CompareRow label="가격">
        {sides.map((side) => (
          <div
            key={side.product.id}
            className={priceDiff ? 'compare-price-wrap is-diff' : 'compare-price-wrap'}
          >
            <PriceCell product={side.product} />
          </div>
        ))}
      </CompareRow>
    </article>
  )
}
