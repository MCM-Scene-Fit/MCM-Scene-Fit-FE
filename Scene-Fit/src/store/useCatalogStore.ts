import { create } from 'zustand'
import {
  ApiError,
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

export type CatalogNotice = {
  tone: 'api' | 'local'
  title: string
  detail: string
}

type CatalogState = {
  products: Product[]
  stores: Store[]
  items: CarryItem[]
  source: 'local' | 'api'
  ready: boolean
  notice: CatalogNotice | null
}

type CatalogActions = {
  getProduct: (id: string) => Product | undefined
  upsertProduct: (product: Product) => void
  ensureProduct: (id: string) => Promise<Product | null>
  refresh: () => Promise<void>
  clearNotice: () => void
}

export type CatalogStore = CatalogState & CatalogActions

function upsert(list: Product[], product: Product) {
  const index = list.findIndex((item) => item.id === product.id)
  if (index === -1) return [...list, product]
  const next = list.slice()
  next[index] = product
  return next
}

function errorMessage(reason: unknown) {
  if (reason instanceof ApiError) {
    return reason.status ? `${reason.message} (${reason.status})` : reason.message
  }
  if (reason instanceof Error) return reason.message
  return '알 수 없는 오류'
}

export const useCatalogStore = create<CatalogStore>()((set, get) => ({
  products: PRODUCTS,
  stores: [...STORES],
  items: CARRY_ITEMS,
  source: 'local',
  ready: false,
  notice: null,

  getProduct: (id) => get().products.find((product) => product.id === id) ?? getLocalProduct(id),

  upsertProduct: (product) => set({ products: upsert(get().products, product) }),

  clearNotice: () => set({ notice: null }),

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
      set({
        ready: true,
        source: 'local',
        notice: {
          tone: 'local',
          title: '목업 모드',
          detail: '서버를 호출하지 않고 로컬 목업 데이터를 사용합니다.',
        },
      })
      return
    }

    const [products, stores, items] = await Promise.allSettled([
      listProducts(),
      listStores(),
      listItems(),
    ])

    const next: Partial<CatalogState> = { ready: true, source: 'local' }
    if (products.status === 'fulfilled' && products.value.length > 0) {
      const detailed = await Promise.all(
        products.value.map((product) =>
          isFullProduct(product) ? Promise.resolve(product) : fetchProduct(product.id).catch(() => product),
        ),
      )
      next.products = detailed
      next.source = 'api'
      next.notice = {
        tone: 'api',
        title: '서버 연결 성공',
        detail: '백엔드 데이터로 화면을 표시합니다.',
      }
    } else {
      const reason =
        products.status === 'rejected'
          ? errorMessage(products.reason)
          : '제품 목록이 비어 있습니다.'
      console.warn('[Scene Fit] 제품 API 실패 — 로컬 데이터로 표시합니다.', reason)
      next.notice = {
        tone: 'local',
        title: '서버 연결 실패',
        detail: `로컬 목업 데이터를 계속 사용합니다. ${reason}`,
      }
    }
    if (stores.status === 'fulfilled' && stores.value.length > 0) {
      next.stores = stores.value
    } else if (stores.status === 'rejected') {
      console.warn('[Scene Fit] 매장 API 실패', stores.reason)
    }
    if (items.status === 'fulfilled' && items.value.length > 0) {
      next.items = items.value
    } else if (items.status === 'rejected') {
      console.warn('[Scene Fit] 소지품 API 실패', items.reason)
    }
    console.info('[Scene Fit] catalog:', next.source)
    set(next)
  },
}))

export const QUICK_DEMO_PRODUCT_ID = 'aren-nova-crossbody'
