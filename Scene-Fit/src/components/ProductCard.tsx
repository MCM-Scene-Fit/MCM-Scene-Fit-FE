import type { CSSProperties } from 'react'
import { formatPrice, WEAR_LABEL } from '../data/labels'
import { bagCardScale, bagImageRatio, getColor } from '../data/products'
import { useCatalogStore } from '../store/useCatalogStore'
import type { Product } from '../types'
import { ProductImage } from './ProductImage'

type ProductCardProps = {
  product: Product
  selected?: boolean
  colorId?: string
  variant?: 'default' | 'catalog'
  onSelect: (productId: string, colorId?: string) => void
}

export function ProductCard({
  product,
  selected,
  colorId,
  variant = 'default',
  onSelect,
}: ProductCardProps) {
  const catalog = useCatalogStore((state) => state.products)
  const activeColorId = colorId ?? product.colors[0].id
  const color = getColor(product, activeColorId)
  const catalogLayout = variant === 'catalog'
  const dims =
    product.widthMm && product.heightMm && product.depthMm
      ? `${product.sizeLabel} · ${product.widthMm / 10} × ${product.heightMm / 10} × ${product.depthMm / 10} cm · ${product.sku}`
      : `${product.sizeLabel}${product.sku ? ` · ${product.sku}` : ''}`

  return (
    <article
      className={`product-card${catalogLayout ? ' product-card--catalog' : ''}${selected ? ' is-selected' : ''}`}
    >
      {selected ? <span className="product-card__badge">선택됨</span> : null}

      <button
        type="button"
        className="product-card__hit"
        onClick={() => onSelect(product.id, activeColorId)}
      >
        <div
          className="product-card__visual"
          style={
            {
              '--bag-scale': String(bagCardScale(product, catalog)),
              '--bag-ratio': bagImageRatio(product, activeColorId),
            } as CSSProperties
          }
        >
          <div className="product-card__bag">
            <ProductImage product={product} colorId={activeColorId} />
          </div>
        </div>
        <div className="product-card__body">
          <p className="eyebrow">{product.category}</p>
          <h3>{product.name}</h3>
          {catalogLayout ? null : (
            <>
              <p className="muted">{dims}</p>
              <p className="product-card__wear">
                {product.wearStyles.map((wear) => WEAR_LABEL[wear]).join(' · ')}
              </p>
            </>
          )}
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
        {product.officialUrl ? (
          <a
            className="text-link product-card__official"
            href={product.officialUrl}
            target="_blank"
            rel="noreferrer"
          >
            공식 상세
          </a>
        ) : null}
      </div>
    </article>
  )
}

export function ProductMini({ product, colorId }: { product: Product; colorId?: string }) {
  return (
    <div className="product-mini">
      <div
        className="product-mini__visual"
        style={{ '--bag-ratio': bagImageRatio(product, colorId) } as CSSProperties}
      >
        <ProductImage product={product} colorId={colorId} decorative />
      </div>
      <div className="product-mini__copy">
        <p className="eyebrow">{product.category}</p>
        <strong>{product.name}</strong>
        <p className="price">{formatPrice(product.price)}</p>
      </div>
    </div>
  )
}
