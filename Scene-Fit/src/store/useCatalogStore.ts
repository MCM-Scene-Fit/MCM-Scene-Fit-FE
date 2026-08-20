import { create } from 'zustand'
import {
  getProduct as fetchProduct,
  isFullProduct,
  isMockMode,
  listItems,
  listProducts,
  listStores,
} from '../api'
import { CARRY_ITEMS, type CarryItem } from '../data/items'
import { STORES } from '../data/labels'
import { PRODUCTS, getProduct as getLocalProduct } from '../data/products'
import type { Product, Store } from '../types'

type CatalogState = {
  products: Product[]
  stores: Store[]
  items: CarryItem[]
  source: 'local' | 'api'
  ready: boolean
}

type CatalogActions = {
  getProduct: (id: string) => Product | undefined
  upsertProduct: (product: Product) => void
  ensureProduct: (id: string) => Promise<Product | null>
  refresh: () => Promise<void>
}

export type CatalogStore = CatalogState & CatalogActions

function upsert(list: Product[], product: Product) {
  const index = list.findIndex((item) => item.id === product.id)
  if (index === -1) return [...list, product]
  const next = list.slice()
  next[index] = product
  return next
}

export const useCatalogStore = create<CatalogStore>()((set, get) => ({
  products: PRODUCTS,
  stores: [...STORES],
  items: CARRY_ITEMS,
  source: 'local',
  ready: false,

  getProduct: (id) => get().products.find((product) => product.id === id) ?? getLocalProduct(id),

  upsertProduct: (product) => set({ products: upsert(get().products, product) }),

  ensureProduct: async (id) => {
    const cached = get().getProduct(id)
    if (cached && isFullProduct(cached)) return cached
    if (isMockMode()) return cached ?? null
    try {
      const product = await fetchProduct(id)
      get().upsertProduct(product)
      return product
    } catch {
      return cached ?? null
    }
  },

  refresh: async () => {
    if (isMockMode()) {
      set({ ready: true, source: 'local' })
      return
    }

    const [products, stores, items] = await Promise.allSettled([
      listProducts(),
      listStores(),
      listItems(),
    ])

    const next: Partial<CatalogState> = { ready: true }
    if (products.status === 'fulfilled' && products.value.length > 0) {
      const detailed = await Promise.all(
        products.value.map((product) =>
          isFullProduct(product) ? Promise.resolve(product) : fetchProduct(product.id).catch(() => product),
        ),
      )
      next.products = detailed
      next.source = 'api'
    }
    if (stores.status === 'fulfilled' && stores.value.length > 0) {
      next.stores = stores.value
    }
    if (items.status === 'fulfilled' && items.value.length > 0) {
      next.items = items.value
    }
    set(next)
  },
}))

export const QUICK_DEMO_PRODUCT_ID = 'aren-nova-crossbody'
