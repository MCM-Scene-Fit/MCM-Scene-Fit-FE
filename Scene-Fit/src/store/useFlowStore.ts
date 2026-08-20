import { create } from 'zustand'
import { resetSession } from '../api'
import { applyItemToggle, applyPresetChange, type PresetKind } from '../data/itemPresets'
import { silhouetteBagAnchor } from '../lib/wearAnchor'
import type {
  BodyProfile,
  Conditions,
  FitPassDraft,
  FitPassExperience,
  FitPassIssued,
  FitPassStatus,
  ItemId,
  PreviewMode,
  Product,
  WearStyle,
} from '../types'
import { QUICK_DEMO_PRODUCT_ID, useCatalogStore } from './useCatalogStore'

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
  fitPassIssued: FitPassIssued | null
  fitPassStatus: FitPassStatus | null
}

type FlowActions = {
  selectProduct: (productId: string, colorId?: string) => void
  replaceSelectedProduct: (product: Product) => void
  setColor: (colorId: string) => void
  setPreviewMode: (mode: PreviewMode) => void
  setPhotoUrl: (url: string | null) => void
  setBody: (body: Partial<BodyProfile>) => void
  setBag: (bag: Partial<BagTransform>) => void
  setConditions: (patch: Partial<Conditions>) => void
  toggleItem: (item: ItemId) => void
  setItemPreset: (kind: PresetKind, presetId: string) => void
  setFitPass: (patch: Partial<FitPassDraft>) => void
  toggleExperience: (experience: FitPassExperience) => void
  submitFitPass: (issued: FitPassIssued) => void
  setFitPassIssued: (issued: FitPassIssued) => void
  setFitPassStatus: (status: FitPassStatus) => void
  startQuickDemo: () => void
  resetFlow: () => void
}

export type FlowStore = FlowState & FlowActions

const defaultConditions: Conditions = {
  scene: null,
  mobility: null,
  items: [],
  itemPresets: {},
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
  sex: 'female',
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
  fitPassIssued: null,
  fitPassStatus: null,
}

export const useFlowStore = create<FlowStore>()((set, get) => ({
  ...initialState,

  selectProduct: (productId, colorId) => {
    const product = useCatalogStore.getState().getProduct(productId)
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
    void useCatalogStore.getState().ensureProduct(productId)
  },

  replaceSelectedProduct: (product) => {
    const current = get()
    if (!current.selectedProduct || current.selectedProduct.id !== product.id) return
    const colorStillValid = product.colors.some((color) => color.id === current.selectedColorId)
    set({
      selectedProduct: product,
      selectedColorId: colorStillValid ? current.selectedColorId : product.colors[0].id,
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
    const { items, itemPresets } = get().conditions
    set({
      conditions: {
        ...get().conditions,
        items: applyItemToggle(items, item, itemPresets),
      },
    })
  },

  setItemPreset: (kind, presetId) => {
    const { items, itemPresets } = get().conditions
    const next = applyPresetChange(items, itemPresets, kind, presetId)
    set({
      conditions: {
        ...get().conditions,
        items: next.items,
        itemPresets: next.itemPresets,
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

  submitFitPass: (issued) =>
    set({
      fitPassStatus: issued.status ?? 'requested',
      fitPassIssued: issued,
    }),

  setFitPassIssued: (issued) =>
    set({
      fitPassIssued: issued,
      fitPassStatus: issued.status ?? get().fitPassStatus,
    }),

  setFitPassStatus: (status) => set({ fitPassStatus: status }),

  startQuickDemo: () => {
    const catalog = useCatalogStore.getState()
    const product =
      catalog.getProduct(QUICK_DEMO_PRODUCT_ID) ?? catalog.products[0]
    if (!product) return
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
        itemPresets: {},
        wearStyle: 'crossbody',
        destination: '도쿄, 10월',
        rewearScene: 'daily',
      },
      fitPass: defaultFitPass,
      fitPassIssued: null,
      fitPassStatus: null,
    })
    void catalog.ensureProduct(product.id)
  },

  resetFlow: () => {
    const current = get().photoUrl
    if (current) URL.revokeObjectURL(current)
    set(initialState)
    void resetSession()
  },
}))

export function selectSelectedProductId(state: FlowStore) {
  return state.selectedProduct?.id ?? null
}

export function selectConditionsReady(state: FlowStore) {
  const { scene, mobility, items, wearStyle } = state.conditions
  return Boolean(scene && mobility && items.length > 0 && wearStyle)
}
