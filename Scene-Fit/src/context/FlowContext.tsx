import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { PRODUCTS } from '../data/products'
import type {
  Conditions,
  FitPassDraft,
  FitPassStatus,
  ItemId,
  PreviewMode,
  WearStyle,
} from '../types'

type BagTransform = {
  x: number
  y: number
  scale: number
}

type FlowState = {
  selectedProductId: string | null
  selectedColorId: string | null
  previewMode: PreviewMode
  photoUrl: string | null
  silhouetteId: string
  bag: BagTransform
  conditions: Conditions
  fitPass: FitPassDraft
  fitPassStatus: FitPassStatus | null
}

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

const initialState: FlowState = {
  selectedProductId: null,
  selectedColorId: null,
  previewMode: 'silhouette',
  photoUrl: null,
  silhouetteId: 's165',
  bag: { x: 18, y: 42, scale: 1 },
  conditions: defaultConditions,
  fitPass: defaultFitPass,
  fitPassStatus: null,
}

type FlowContextValue = FlowState & {
  selectProduct: (productId: string, colorId?: string) => void
  setColor: (colorId: string) => void
  setPreviewMode: (mode: PreviewMode) => void
  setPhotoUrl: (url: string | null) => void
  setSilhouetteId: (id: string) => void
  setBag: (bag: Partial<BagTransform>) => void
  setConditions: (patch: Partial<Conditions>) => void
  toggleItem: (item: ItemId) => void
  setFitPass: (patch: Partial<FitPassDraft>) => void
  toggleExperience: (experience: FitPassDraft['experiences'][number]) => void
  submitFitPass: () => void
  startQuickDemo: () => void
  conditionsReady: boolean
  resetFlow: () => void
}

const FlowContext = createContext<FlowContextValue | null>(null)

function wearDefaultBag(wear: WearStyle | null): BagTransform {
  if (wear === 'backpack') return { x: 28, y: 28, scale: 1.05 }
  if (wear === 'tote') return { x: 8, y: 46, scale: 1.15 }
  if (wear === 'shoulder') return { x: 22, y: 34, scale: 1 }
  return { x: 18, y: 42, scale: 1 }
}

export function FlowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FlowState>(initialState)

  const selectProduct = useCallback((productId: string, colorId?: string) => {
    const product = PRODUCTS.find((item) => item.id === productId)
    if (!product) return
    const color = colorId ?? product.colors[0].id
    setState((prev) => ({
      ...prev,
      selectedProductId: productId,
      selectedColorId: color,
      bag: wearDefaultBag(product.wearStyles[0]),
      conditions: {
        ...prev.conditions,
        wearStyle: prev.conditions.wearStyle ?? product.wearStyles[0],
      },
    }))
  }, [])

  const setColor = useCallback((colorId: string) => {
    setState((prev) => ({ ...prev, selectedColorId: colorId }))
  }, [])

  const setPreviewMode = useCallback((mode: PreviewMode) => {
    setState((prev) => ({ ...prev, previewMode: mode }))
  }, [])

  const setPhotoUrl = useCallback((url: string | null) => {
    setState((prev) => {
      if (prev.photoUrl && prev.photoUrl !== url) {
        URL.revokeObjectURL(prev.photoUrl)
      }
      return { ...prev, photoUrl: url, previewMode: url ? 'photo' : prev.previewMode }
    })
  }, [])

  const setSilhouetteId = useCallback((id: string) => {
    setState((prev) => ({ ...prev, silhouetteId: id, previewMode: 'silhouette' }))
  }, [])

  const setBag = useCallback((bag: Partial<BagTransform>) => {
    setState((prev) => ({ ...prev, bag: { ...prev.bag, ...bag } }))
  }, [])

  const setConditions = useCallback((patch: Partial<Conditions>) => {
    setState((prev) => ({
      ...prev,
      conditions: { ...prev.conditions, ...patch },
    }))
  }, [])

  const toggleItem = useCallback((item: ItemId) => {
    setState((prev) => {
      const has = prev.conditions.items.includes(item)
      return {
        ...prev,
        conditions: {
          ...prev.conditions,
          items: has
            ? prev.conditions.items.filter((value) => value !== item)
            : [...prev.conditions.items, item],
        },
      }
    })
  }, [])

  const setFitPass = useCallback((patch: Partial<FitPassDraft>) => {
    setState((prev) => ({ ...prev, fitPass: { ...prev.fitPass, ...patch } }))
  }, [])

  const toggleExperience = useCallback(
    (experience: FitPassDraft['experiences'][number]) => {
      setState((prev) => {
        const has = prev.fitPass.experiences.includes(experience)
        return {
          ...prev,
          fitPass: {
            ...prev.fitPass,
            experiences: has
              ? prev.fitPass.experiences.filter((value) => value !== experience)
              : [...prev.fitPass.experiences, experience],
          },
        }
      })
    },
    [],
  )

  const submitFitPass = useCallback(() => {
    setState((prev) => ({ ...prev, fitPassStatus: 'checking' }))
  }, [])

  const startQuickDemo = useCallback(() => {
    const product = PRODUCTS[0]
    setState({
      selectedProductId: product.id,
      selectedColorId: product.colors[0].id,
      previewMode: 'silhouette',
      photoUrl: null,
      silhouetteId: 's165',
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
  }, [])

  const resetFlow = useCallback(() => {
    setState((prev) => {
      if (prev.photoUrl) URL.revokeObjectURL(prev.photoUrl)
      return initialState
    })
  }, [])

  const conditionsReady = Boolean(
    state.conditions.scene &&
      state.conditions.mobility &&
      state.conditions.items.length > 0 &&
      state.conditions.wearStyle,
  )

  const value = useMemo(
    () => ({
      ...state,
      selectProduct,
      setColor,
      setPreviewMode,
      setPhotoUrl,
      setSilhouetteId,
      setBag,
      setConditions,
      toggleItem,
      setFitPass,
      toggleExperience,
      submitFitPass,
      startQuickDemo,
      conditionsReady,
      resetFlow,
    }),
    [
      state,
      selectProduct,
      setColor,
      setPreviewMode,
      setPhotoUrl,
      setSilhouetteId,
      setBag,
      setConditions,
      toggleItem,
      setFitPass,
      toggleExperience,
      submitFitPass,
      startQuickDemo,
      conditionsReady,
      resetFlow,
    ],
  )

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>
}

// Context hook lives next to the provider for a small flow store.
// eslint-disable-next-line react-refresh/only-export-components
export function useFlow() {
  const context = useContext(FlowContext)
  if (!context) {
    throw new Error('useFlow must be used within FlowProvider')
  }
  return context
}
