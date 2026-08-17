import { create } from 'zustand'
import { getProduct, PRODUCTS } from '../data/products'
import { silhouetteBagAnchor } from '../lib/wearAnchor'
import type {
  BodyProfile,
  Conditions,
  FitPassDraft,
  FitPassExperience,
  FitPassStatus,
  ItemId,
  PreviewMode,
  Product,
  WearStyle,
} from '../types'

type BagTransform = {
  x: number
  y: number
}

type FlowState = {
  selectedProduct: Product | null
  selectedColorId: string | null
  previewMode: PreviewMode
  photoUrl: string | null
  body: BodyProfile
  bag: BagTransform
  conditions: Conditions
  fitPass: FitPassDraft
  fitPassStatus: FitPassStatus | null
}

type FlowActions = {
  selectProduct: (productId: string, colorId?: string) => void
  setColor: (colorId: string) => void
  setPreviewMode: (mode: PreviewMode) => void
  setPhotoUrl: (url: string | null) => void
  setBody: (body: Partial<BodyProfile>) => void
  setBag: (bag: Partial<BagTransform>) => void
  setConditions: (patch: Partial<Conditions>) => void
  toggleItem: (item: ItemId) => void
  setFitPass: (patch: Partial<FitPassDraft>) => void
  toggleExperience: (experience: FitPassExperience) => void
  submitFitPass: () => void
  startQuickDemo: () => void
  resetFlow: () => void
}

export type FlowStore = FlowState & FlowActions

const defaultConditions: Conditions = {
  scene: null,
  mobility: null,
  items: [],
  wearStyle: null,
  destination: '',
  rewearScene: null,
}

const defaultFitPass: FitPassDraft = {
  storeId: '',
  visitTime: '',
  experiences: [],
  customNote: '',
}

function wearDefaultBag(wear: WearStyle | null) {
  const { x, y } = silhouetteBagAnchor(wear ?? 'crossbody')
  return { x, y }
}

const defaultBody: BodyProfile = {
  heightCm: 165,
  build: 'standard',
}

const initialState: FlowState = {
  selectedProduct: null,
  selectedColorId: null,
  previewMode: 'photo',
  photoUrl: null,
  body: defaultBody,
  bag: { x: 18, y: 42 },
  conditions: defaultConditions,
  fitPass: defaultFitPass,
  fitPassStatus: null,
}

export const useFlowStore = create<FlowStore>()((set, get) => ({
  ...initialState,

  selectProduct: (productId, colorId) => {
    const product = getProduct(productId)
    if (!product) return
    const nextColor = colorId ?? product.colors[0].id
    const prev = get()
    set({
      selectedProduct: product,
      selectedColorId: nextColor,
      bag: wearDefaultBag(product.wearStyles[0]),
      conditions: {
        ...prev.conditions,
        wearStyle: prev.conditions.wearStyle ?? product.wearStyles[0],
      },
    })
  },

  setColor: (colorId) => set({ selectedColorId: colorId }),

  setPreviewMode: (mode) => set({ previewMode: mode }),

  setPhotoUrl: (url) => {
    const current = get().photoUrl
    if (current && current !== url) URL.revokeObjectURL(current)
    set({ photoUrl: url, previewMode: url ? 'photo' : get().previewMode })
  },

  setBody: (body) => set({ body: { ...get().body, ...body } }),

  setBag: (bag) => set({ bag: { ...get().bag, ...bag } }),

  setConditions: (patch) =>
    set({ conditions: { ...get().conditions, ...patch } }),

  toggleItem: (item) => {
    const items = get().conditions.items
    set({
      conditions: {
        ...get().conditions,
        items: items.includes(item)
          ? items.filter((value) => value !== item)
          : [...items, item],
      },
    })
  },

  setFitPass: (patch) => set({ fitPass: { ...get().fitPass, ...patch } }),

  toggleExperience: (experience) => {
    const experiences = get().fitPass.experiences
    set({
      fitPass: {
        ...get().fitPass,
        experiences: experiences.includes(experience)
          ? experiences.filter((value) => value !== experience)
          : [...experiences, experience],
      },
    })
  },

  submitFitPass: () => set({ fitPassStatus: 'checking' }),

  startQuickDemo: () => {
    const product = PRODUCTS[0]
    const current = get().photoUrl
    if (current) URL.revokeObjectURL(current)
    set({
      selectedProduct: product,
      selectedColorId: product.colors[0].id,
      previewMode: 'silhouette',
      photoUrl: null,
      body: defaultBody,
      bag: wearDefaultBag('crossbody'),
      conditions: {
        scene: 'travel',
        mobility: 'light-walk',
        items: ['phone', 'wallet', 'camera'],
        wearStyle: 'crossbody',
        destination: '도쿄, 10월',
        rewearScene: 'daily',
      },
      fitPass: defaultFitPass,
      fitPassStatus: null,
    })
  },

  resetFlow: () => {
    const current = get().photoUrl
    if (current) URL.revokeObjectURL(current)
    set(initialState)
  },
}))

export function selectSelectedProductId(state: FlowStore) {
  return state.selectedProduct?.id ?? null
}

export function selectConditionsReady(state: FlowStore) {
  const { scene, mobility, items, wearStyle } = state.conditions
  return Boolean(scene && mobility && items.length > 0 && wearStyle)
}
