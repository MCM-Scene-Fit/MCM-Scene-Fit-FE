import { ITEM_LABEL } from '../data/labels'
import { PRODUCTS } from '../data/products'
import { deriveLikelyStorage } from '../lib/itemFit'
import { toCatalogWearStyle } from '../lib/wearStyle'
import type {
  AxisStatus,
  CarryLoad,
  CatalogWearStyle,
  Conditions,
  EvidenceLevel,
  FitPassExperience,
  FitPassIssued,
  FitPassStatus,
  FitResult,
  ItemId,
  ItemVerdict,
  Mobility,
  Product,
  ProductColor,
  Scene,
  Store,
} from '../types'
import { ITEMS } from '../types'

export type ApiConditions = {
  scene: Scene
  mobility: Mobility
  items: ItemId[]
  wearStyle: CatalogWearStyle
  destination?: string
  rewearScene?: Scene
}

type ApiAxis = {
  headline?: string
  detail?: string
  positive?: boolean
  status?: AxisStatus
}

type ApiVerdict = {
  item?: ItemId
  label?: string
  level?: EvidenceLevel
  message?: string
  fillRatio?: number
}

type ApiFitResult = {
  productId?: string
  sceneMatch?: ApiAxis
  carryCheck?: {
    headline?: string
    items?: ApiVerdict[]
    status?: AxisStatus
    load?: Partial<CarryLoad>
    score?: number | null
  }
  rewearPotential?: ApiAxis
  matches?: string[]
  mismatches?: string[]
  storeChecks?: string[]
  alternativeId?: string | null
  allConditionsMet?: boolean
}

type ApiColor = Partial<ProductColor> & {
  id?: string
  name?: string
  hex?: string
  sku?: string
  image?: string
}

type ApiProduct = Partial<Product> & {
  id?: string
  colors?: ApiColor[]
}

const AXIS_STATUSES: AxisStatus[] = ['match', 'check', 'weak']
const EVIDENCE_LEVELS: EvidenceLevel[] = ['confirmed', 'estimated', 'store-check', 'unlikely']
const FIT_PASS_STATUSES: FitPassStatus[] = ['requested', 'checking', 'confirmed']

function asItemId(value: unknown): ItemId | null {
  return typeof value === 'string' && (ITEMS as readonly string[]).includes(value)
    ? (value as ItemId)
    : null
}

function localColorBySku(sku: string | undefined) {
  if (!sku) return undefined
  for (const product of PRODUCTS) {
    const color = product.colors.find((item) => item.sku === sku)
    if (color) return color
  }
  return undefined
}

function localProductById(id: string | undefined) {
  if (!id) return undefined
  return PRODUCTS.find((product) => product.id === id)
}

function normalizeColor(raw: ApiColor, fallback?: ProductColor): ProductColor {
  const local = fallback ?? localColorBySku(raw.sku)
  return {
    id: raw.id || local?.id || 'default',
    name: raw.name || local?.name || 'Default',
    hex: raw.hex || local?.hex || '#1A1A1A',
    sku: raw.sku || local?.sku || '',
    image: raw.image || local?.image || '',
    imageWidth: raw.imageWidth || local?.imageWidth || 720,
    imageHeight: raw.imageHeight || local?.imageHeight || 720,
    bodyImage: raw.bodyImage || local?.bodyImage,
    bodyImageWidth: raw.bodyImageWidth || local?.bodyImageWidth,
    bodyImageHeight: raw.bodyImageHeight || local?.bodyImageHeight,
    sideImage: raw.sideImage || local?.sideImage,
    sideImageWidth: raw.sideImageWidth || local?.sideImageWidth,
    sideImageHeight: raw.sideImageHeight || local?.sideImageHeight,
  }
}

export function isFullProduct(product: Product) {
  return (
    Number.isFinite(product.widthMm) &&
    product.widthMm > 0 &&
    Array.isArray(product.officialStorage) &&
    Boolean(product.officialUrl)
  )
}

export function normalizeProduct(raw: ApiProduct): Product | null {
  if (!raw.id) return null
  const local = localProductById(raw.id)
  const colors = (raw.colors?.length ? raw.colors : local?.colors ?? []).map((color, index) =>
    normalizeColor(color, local?.colors[index]),
  )
  if (colors.length === 0) return null

  const widthMm = raw.widthMm ?? local?.widthMm ?? 0
  const heightMm = raw.heightMm ?? local?.heightMm ?? 0
  const depthMm = raw.depthMm ?? local?.depthMm ?? 0
  const officialStorage = raw.officialStorage ?? local?.officialStorage ?? []
  const draft = {
    widthMm,
    heightMm,
    depthMm,
    officialStorage,
  }

  return {
    id: raw.id,
    name: raw.name || local?.name || raw.id,
    sku: raw.sku || local?.sku || '',
    category: raw.category || local?.category || '',
    colors,
    price: raw.price ?? local?.price ?? 0,
    officialUrl: raw.officialUrl || local?.officialUrl || '',
    widthMm,
    heightMm,
    depthMm,
    sizeLabel: raw.sizeLabel || local?.sizeLabel || '',
    wearStyles: Array.from(new Set([...(local?.wearStyles ?? []), ...(raw.wearStyles ?? [])])),
    strapAdjustable: raw.strapAdjustable ?? local?.strapAdjustable ?? false,
    hasLongStrap: raw.hasLongStrap ?? local?.hasLongStrap ?? false,
    officialStorage,
    likelyStorage: raw.likelyStorage ?? local?.likelyStorage ?? deriveLikelyStorage(draft),
    pockets: raw.pockets ?? local?.pockets ?? 0,
    material: raw.material || local?.material || '',
    sceneTags: raw.sceneTags ?? local?.sceneTags ?? [],
    mood: raw.mood ?? local?.mood ?? [],
    rewearTags: raw.rewearTags ?? local?.rewearTags ?? [],
    weightG: raw.weightG ?? local?.weightG,
    careNotes: raw.careNotes ?? local?.careNotes,
  }
}

function normalizeAxis(
  raw: ApiAxis | undefined,
  fallback: { headline: string; detail: string; positive: boolean; status: AxisStatus },
) {
  const status = raw?.status && AXIS_STATUSES.includes(raw.status) ? raw.status : fallback.status
  return {
    headline: raw?.headline || fallback.headline,
    detail: raw?.detail ?? fallback.detail,
    positive: raw?.positive ?? (status === 'match'),
    status,
  }
}

function normalizeVerdict(raw: ApiVerdict): ItemVerdict | null {
  const item = asItemId(raw.item)
  if (!item || !raw.level || !EVIDENCE_LEVELS.includes(raw.level)) return null
  return {
    item,
    label: raw.label || ITEM_LABEL[item] || item,
    level: raw.level,
    message: raw.message || '',
    fillRatio: Number.isFinite(raw.fillRatio) ? Number(raw.fillRatio) : 0,
  }
}

export function normalizeFitResult(raw: ApiFitResult, fallbackProductId = ''): FitResult {
  const items = (raw.carryCheck?.items ?? [])
    .map(normalizeVerdict)
    .filter((item): item is ItemVerdict => item !== null)
  const mismatches = raw.mismatches ?? []

  return {
    productId: raw.productId || fallbackProductId,
    sceneMatch: normalizeAxis(raw.sceneMatch, {
      headline: '',
      detail: '',
      positive: false,
      status: 'check',
    }),
    carryCheck: {
      headline: raw.carryCheck?.headline || '',
      items,
      status:
        raw.carryCheck?.status && AXIS_STATUSES.includes(raw.carryCheck.status)
          ? raw.carryCheck.status
          : 'check',
      load: {
        count: raw.carryCheck?.load?.count ?? items.length,
        volumeMl: raw.carryCheck?.load?.volumeMl ?? 0,
        weightG: raw.carryCheck?.load?.weightG ?? 0,
      },
      score: raw.carryCheck?.score ?? null,
    },
    rewearPotential: normalizeAxis(raw.rewearPotential, {
      headline: '',
      detail: '',
      positive: false,
      status: 'check',
    }),
    matches: raw.matches ?? [],
    mismatches,
    storeChecks: raw.storeChecks ?? [],
    alternativeId: raw.alternativeId ?? null,
    allConditionsMet: raw.allConditionsMet ?? mismatches.length === 0,
  }
}

export function toApiConditions(conditions: Conditions): ApiConditions | null {
  if (!conditions.scene || !conditions.mobility || !conditions.wearStyle || conditions.items.length === 0) {
    return null
  }
  return {
    scene: conditions.scene,
    mobility: conditions.mobility,
    items: conditions.items,
    wearStyle: toCatalogWearStyle(conditions.wearStyle),
    destination: conditions.destination.trim() || undefined,
    rewearScene: conditions.rewearScene ?? undefined,
  }
}

export function fromApiConditions(raw: Partial<ApiConditions> | null | undefined): Partial<Conditions> {
  if (!raw) return {}
  return {
    scene: raw.scene ?? null,
    mobility: raw.mobility ?? null,
    items: (raw.items ?? []).filter((item): item is ItemId => asItemId(item) !== null),
    wearStyle: raw.wearStyle ?? null,
    destination: raw.destination ?? '',
    rewearScene: raw.rewearScene ?? null,
  }
}

export function toIsoVisitTime(value: string) {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  const pad = (n: number) => String(n).padStart(2, '0')
  const offsetMin = -date.getTimezoneOffset()
  const sign = offsetMin >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMin)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
}

export function normalizeStore(raw: Partial<Store>): Store | null {
  if (!raw.id || !raw.name) return null
  return { id: raw.id, name: raw.name }
}

export function normalizeFitPass(raw: {
  id?: string
  status?: FitPassStatus
  demo?: boolean
  disclaimer?: string
  productId?: string
  colorId?: string | null
  alternativeId?: string | null
  store?: Partial<Store>
  visitTime?: string | null
  experiences?: FitPassExperience[]
  customNote?: string
  snapshot?: {
    matches?: string[]
    storeChecks?: string[]
    storeQuestions?: string[]
  }
  createdAt?: string
}): FitPassIssued | null {
  if (!raw.id) return null
  const snapshot = {
    matches: raw.snapshot?.matches ?? [],
    storeChecks: raw.snapshot?.storeChecks ?? [],
    storeQuestions: raw.snapshot?.storeQuestions ?? [],
  }
  return {
    id: raw.id,
    storeChecks: snapshot.storeChecks,
    createdAt: raw.createdAt || new Date().toISOString(),
    status: raw.status && FIT_PASS_STATUSES.includes(raw.status) ? raw.status : 'requested',
    demo: raw.demo ?? true,
    disclaimer: raw.disclaimer,
    productId: raw.productId,
    colorId: raw.colorId,
    alternativeId: raw.alternativeId,
    store: raw.store ? normalizeStore(raw.store) ?? undefined : undefined,
    visitTime: raw.visitTime,
    experiences: raw.experiences ?? [],
    customNote: raw.customNote,
    snapshot,
  }
}
