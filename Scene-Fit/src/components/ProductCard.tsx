import { formatPrice } from '../data/labels'
import { getColor } from '../data/products'
import type { Product } from '../types'
import { BagIllustration } from './BagIllustration'

type ProductCardProps = {
  product: Product
  selected?: boolean
  colorId?: string
  onSelect?: () => void
}

export function ProductCard({
  product,
  selected,
  colorId,
  onSelect,
}: ProductCardProps) {
  const color = getColor(product, colorId ?? product.colors[0].id)

  return (
    <button
      type="button"
      className={`product-card ${selected ? 'is-selected' : ''}`}
      onClick={onSelect}
    >
      <div className="product-card__visual" style={{ background: `${color.hex}22` }}>
        <BagIllustration wear={product.wearStyles[0]} color={color.hex} />
      </div>
      <div className="product-card__body">
        <p className="eyebrow">{product.category}</p>
        <h3>{product.name}</h3>
        <p className="muted">
          {product.sizeLabel} · {product.widthMm / 10} × {product.heightMm / 10} ×{' '}
          {product.depthMm / 10} cm
        </p>
        <p className="price">{formatPrice(product.price)}</p>
      </div>
    </button>
  )
}

export function ProductMini({ product, colorId }: { product: Product; colorId?: string }) {
  const color = getColor(product, colorId ?? product.colors[0].id)
  return (
    <div className="product-mini">
      <div className="product-mini__visual" style={{ background: `${color.hex}22` }}>
        <BagIllustration wear={product.wearStyles[0]} color={color.hex} />
      </div>
      <div>
        <p className="eyebrow">{product.category}</p>
        <strong>{product.name}</strong>
        <p className="muted">{formatPrice(product.price)}</p>
      </div>
    </div>
  )
}

