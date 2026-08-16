export const SCENES = ['travel', 'work', 'culture', 'meetup', 'daily'] as const
export type Scene = (typeof SCENES)[number]

export const MOBILITY = ['indoor', 'light-walk', 'long-walk'] as const
export type Mobility = (typeof MOBILITY)[number]

export const WEAR_STYLES = ['tote', 'shoulder', 'crossbody', 'backpack'] as const
export type WearStyle = (typeof WEAR_STYLES)[number]

export const ITEMS = [
  'phone',
  'wallet',
  'pouch',
  'tablet',
  'laptop13',
  'camera',
  'bottle',
] as const
export type ItemId = (typeof ITEMS)[number]

export const EVIDENCE = [
  'confirmed',
  'estimated',
  'store-check',
  'unlikely',
] as const
export type EvidenceLevel = (typeof EVIDENCE)[number]

export type ProductColor = {
  id: string
  name: string
  hex: string
  sku: string
  image: string
  imageWidth: number
  imageHeight: number
}

export type Product = {
  id: string
  name: string
  sku: string
  category: string
  colors: ProductColor[]
  price: number
  officialUrl: string
  widthMm: number
  heightMm: number
  depthMm: number
  sizeLabel: string
  wearStyles: WearStyle[]
  strapAdjustable: boolean
  officialStorage: ItemId[]
  likelyStorage: ItemId[]
  pockets: number
  material: string
  sceneTags: Scene[]
  mood: string[]
  rewearTags: Scene[]
  weightG?: number
}

export type Conditions = {
  scene: Scene | null
  mobility: Mobility | null
  items: ItemId[]
  wearStyle: WearStyle | null
  destination: string
  rewearScene: Scene | null
}

export type PreviewMode = 'photo' | 'silhouette'

export type ItemVerdict = {
  item: ItemId
  level: EvidenceLevel
  message: string
}

export type FitResult = {
  sceneMatch: { headline: string; detail: string; positive: boolean }
  carryCheck: { headline: string; items: ItemVerdict[] }
  rewearPotential: { headline: string; detail: string; positive: boolean }
  matches: string[]
  mismatches: string[]
  storeChecks: string[]
  alternativeId: string | null
}

export type FitPassExperience =
  | 'fit-ratio'
  | 'storage-test'
  | 'styling'
  | 'color-compare'
  | 'care'

export type FitPassDraft = {
  storeId: string
  visitTime: string
  experiences: FitPassExperience[]
  customNote: string
}

export type FitPassStatus = 'requested' | 'checking' | 'confirmed'
