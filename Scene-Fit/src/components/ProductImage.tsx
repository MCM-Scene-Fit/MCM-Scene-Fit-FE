import { getColor } from '../data/products'
import type { Product } from '../types'

type ProductImageProps = {
  product: Product
  colorId?: string
  className?: string
  decorative?: boolean
}

export function ProductImage({
  product,
  colorId,
  className,
  decorative,
}: ProductImageProps) {
  const color = getColor(product, colorId ?? product.colors[0].id)
  return (
    <img
      src={color.image}
      alt={decorative ? '' : `${product.name} ${color.name}`}
      width={color.imageWidth}
      height={color.imageHeight}
      className={className}
      draggable={false}
      aria-hidden={decorative || undefined}
      style={{ objectFit: 'contain', objectPosition: 'center' }}
    />
  )
}
