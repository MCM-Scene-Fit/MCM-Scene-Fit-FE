import type { CatalogWearStyle, Product, WearStyle } from '../types'

export function supportsLongStrap(product: Product) {
  return product.hasLongStrap
}

export function previewWearStyles(product: Product): WearStyle[] {
  const styles = product.wearStyles.filter((wear) => wear !== 'long-strap')
  if (!supportsLongStrap(product)) return styles

  const afterShoulder = styles.indexOf('shoulder')
  const afterTote = styles.indexOf('tote')
  const insertAt =
    afterShoulder >= 0
      ? afterShoulder + 1
      : afterTote >= 0
        ? afterTote + 1
        : Math.max(0, styles.length - (styles.includes('backpack') ? 1 : 0))

  return [...styles.slice(0, insertAt), 'long-strap', ...styles.slice(insertAt)]
}

export function productSupportsWear(product: Product, wear: WearStyle) {
  if (wear === 'long-strap') return supportsLongStrap(product)
  return product.wearStyles.includes(wear)
}

export function toCatalogWearStyle(wear: WearStyle): CatalogWearStyle {
  return wear === 'long-strap' ? 'shoulder' : wear
}

export function resolveWearStyle(product: Product, prev: WearStyle | null): WearStyle {
  const options = previewWearStyles(product)
  if (prev && options.includes(prev)) return prev
  return product.wearStyles[0]
}
