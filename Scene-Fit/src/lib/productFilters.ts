import { WEAR_LABEL } from '../data/labels'
import type { Product, WearStyle } from '../types'

export const WEAR_FILTERS: Array<{ id: 'all' | WearStyle; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'tote', label: WEAR_LABEL.tote },
  { id: 'shoulder', label: WEAR_LABEL.shoulder },
  { id: 'crossbody', label: WEAR_LABEL.crossbody },
  { id: 'backpack', label: WEAR_LABEL.backpack },
]

export const COLOR_FILTERS = [
  { id: 'all', label: '전체', hex: '' },
  { id: 'cognac', label: 'Cognac', hex: '#9A6546' },
  { id: 'black', label: 'Black', hex: '#1A1A1A' },
  { id: 'cream', label: 'Beige', hex: '#E8D9C8' },
  { id: 'pink', label: 'Pink', hex: '#E8A0B4' },
] as const

export const PRICE_FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'under-100', label: '100만 미만', min: 0, max: 999999 },
  { id: '100-130', label: '100~130만', min: 1000000, max: 1300000 },
  { id: 'over-130', label: '130만 이상', min: 1300001, max: Number.POSITIVE_INFINITY },
] as const

export type ProductFilterState = {
  wear: (typeof WEAR_FILTERS)[number]['id']
  color: (typeof COLOR_FILTERS)[number]['id']
  price: (typeof PRICE_FILTERS)[number]['id']
}

export const DEFAULT_PRODUCT_FILTERS: ProductFilterState = {
  wear: 'all',
  color: 'all',
  price: 'all',
}

export function filterProducts(products: Product[], filters: ProductFilterState) {
  return products.filter((product) => {
    const wearOk =
      filters.wear === 'all' || product.wearStyles.includes(filters.wear)
    const colorOk =
      filters.color === 'all' || product.colors.some((color) => color.id === filters.color)

    if (filters.price === 'all') {
      return wearOk && colorOk
    }

    const priceRule = PRICE_FILTERS.find((item) => item.id === filters.price)
    const priceOk =
      priceRule &&
      priceRule.id !== 'all' &&
      product.price >= priceRule.min &&
      product.price <= priceRule.max

    return wearOk && colorOk && priceOk
  })
}

export function hasActiveFilters(filters: ProductFilterState) {
  return (
    filters.wear !== 'all' || filters.color !== 'all' || filters.price !== 'all'
  )
}
