import type { CSSProperties } from 'react'
import { formatPrice, WEAR_LABEL } from '../data/labels'
import { bagCardScale, getColor } from '../data/products'
import type { Product } from '../types'
import { ProductImage } from './ProductImage'

type ProductCardProps = {
  product: Product
  selected?: boolean
  colorId?: string
  onSelect: (productId: string, colorId?: string) => void
}

export function ProductCard({
  product,
  selected,
  colorId,
  onSelect,
}: ProductCardProps) {
  const activeColorId = colorId ?? product.colors[0].id
  const color = getColor(product, activeColorId)

  return (
    <article className={`product-card ${selected ? 'is-selected' : ''}`}>
      {selected ? <span className="product-card__badge">선택됨</span> : null}

      <button
        type="button"
        className="product-card__hit"
        onClick={() => onSelect(product.id, activeColorId)}
      >
        <div
          className="product-card__visual"
          style={{ '--bag-scale': String(bagCardScale(product)) } as CSSProperties}
        >
          <div className="product-card__bag">
            <ProductImage product={product} colorId={activeColorId} />
          </div>
        </div>
        <div className="product-card__body">
          <p className="eyebrow">{product.category}</p>
          <h3>{product.name}</h3>
          <p className="muted">
            {product.sizeLabel} · {product.widthMm / 10} × {product.heightMm / 10} ×{' '}
            {product.depthMm / 10} cm · {product.sku}
          </p>
          <p className="product-card__wear">
            {product.wearStyles.map((wear) => WEAR_LABEL[wear]).join(' · ')}
          </p>
          <p className="price">{formatPrice(product.price)}</p>
        </div>
      </button>

      <div className="product-card__colors" aria-label={`${product.name} 색상`}>
        {product.colors.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`swatch ${activeColorId === item.id && selected ? 'is-on' : ''}`}
            style={{ background: item.hex }}
            aria-label={item.name}
            onClick={() => onSelect(product.id, item.id)}
          />
        ))}
        <span className="muted">{color.name}</span>
        <a
          className="text-link product-card__official"
          href={product.officialUrl}
          target="_blank"
          rel="noreferrer"
        >
          공식 상세
        </a>
      </div>
    </article>
  )
}

export function ProductMini({ product, colorId }: { product: Product; colorId?: string }) {
  return (
    <div className="product-mini">
      <div className="product-mini__visual">
        <ProductImage product={product} colorId={colorId} />
      </div>
      <div>
        <p className="eyebrow">{product.category}</p>
        <strong>{product.name}</strong>
        <p className="muted">{formatPrice(product.price)}</p>
      </div>
    </div>
  )
}
