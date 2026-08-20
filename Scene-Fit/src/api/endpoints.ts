import type { CarryItem } from '../data/items'
import type { ProductFilterState } from '../lib/productFilters'
import type {
  Conditions,
  FitPassDraft,
  FitPassExperience,
  FitResult,
  Product,
  Store,
} from '../types'
import { apiJson, apiRequest, clearSessionId, isMockMode, queryString } from './client'
import {
  fromApiConditions,
  normalizeFitPass,
  normalizeFitResult,
  normalizeProduct,
  normalizeStore,
  toApiConditions,
  toIsoVisitTime,
  type ApiConditions,
} from './normalize'

export type SessionData = {
  sessionId: string
  expiresAt?: string
  selectedProductId: string | null
  selectedColorId: string | null
  conditions: ApiConditions | null
  fitPassId: string | null
}

export type ExplainCopy = {
  matches: string[]
  mismatches: string[]
  storeChecks: string[]
  storeQuestions: string[]
}

export type ComparePayload = {
  selected: FitResult
  alternative: FitResult | null
  message: string | null
}

export type RecommendCandidate = {
  productId: string
  fit: FitResult
}

export async function listItems() {
  const data = await apiRequest<CarryItem[]>('/items')
  return Array.isArray(data) ? data : []
}

export async function listProducts(filters?: Partial<ProductFilterState>) {
  const query = queryString({
    wear: filters?.wear,
    color: filters?.color,
    price: filters?.price,
  })
  const data = await apiRequest<unknown[]>(`/products${query}`)
  return (Array.isArray(data) ? data : [])
    .map((item) => normalizeProduct(item as Parameters<typeof normalizeProduct>[0]))
    .filter((item): item is Product => item !== null)
}

export async function getProduct(productId: string) {
  const data = await apiRequest<unknown>(`/products/${encodeURIComponent(productId)}`)
  const product = normalizeProduct(data as Parameters<typeof normalizeProduct>[0])
  if (!product) throw new Error('PRODUCT_NOT_FOUND')
  return product
}

export async function listStores() {
  const data = await apiRequest<unknown[]>('/stores')
  return (Array.isArray(data) ? data : [])
    .map((item) => normalizeStore(item as Store))
    .filter((item): item is Store => item !== null)
}

export function createSession() {
  return apiJson<SessionData>('/sessions', 'POST', {})
}

export function getSessionMe() {
  return apiRequest<SessionData>('/sessions/me')
}

export function patchSessionMe(body: {
  selectedProductId?: string | null
  selectedColorId?: string | null
  conditions?: ApiConditions | null
  fitPassId?: string | null
}) {
  return apiJson<SessionData>('/sessions/me', 'PATCH', body)
}

export function deleteSessionMe() {
  return apiRequest<void>('/sessions/me', { method: 'DELETE' })
}

export async function resetSession() {
  if (isMockMode()) return
  try {
    await deleteSessionMe()
  } catch {
    /* ignore */
  }
  clearSessionId()
  try {
    await createSession()
  } catch {
    /* offline demo still works */
  }
}

export async function postFitCheck(productId: string, conditions: ApiConditions) {
  const data = await apiJson<unknown>('/fit-check', 'POST', { productId, conditions })
  return normalizeFitResult(data as Parameters<typeof normalizeFitResult>[0], productId)
}

export async function postFitCompare(
  productId: string,
  conditions: ApiConditions,
  alternativeId?: string | null,
) {
  const data = await apiJson<{
    selected?: unknown
    alternative?: unknown | null
    message?: string
  }>('/fit-check/compare', 'POST', {
    productId,
    conditions,
    ...(alternativeId ? { alternativeId } : {}),
  })
  return {
    selected: normalizeFitResult(
      (data.selected ?? {}) as Parameters<typeof normalizeFitResult>[0],
      productId,
    ),
    alternative: data.alternative
      ? normalizeFitResult(data.alternative as Parameters<typeof normalizeFitResult>[0])
      : null,
    message: data.message ?? null,
  } satisfies ComparePayload
}

export async function postRecommend(conditions: ApiConditions) {
  const data = await apiJson<{
    candidates?: Array<{ productId?: string; fit?: unknown }>
    emptyReason?: string | null
  }>('/recommend', 'POST', conditions)
  const candidates: RecommendCandidate[] = (data.candidates ?? [])
    .filter((entry): entry is { productId: string; fit?: unknown } => Boolean(entry.productId))
    .map((entry) => ({
      productId: entry.productId,
      fit: normalizeFitResult(
        (entry.fit ?? {}) as Parameters<typeof normalizeFitResult>[0],
        entry.productId,
      ),
    }))
  return {
    candidates,
    emptyReason: data.emptyReason ?? null,
  }
}

export async function postExplain(input: {
  productId: string
  conditions: ApiConditions
  fit?: FitResult
}) {
  const data = await apiJson<Partial<ExplainCopy>>('/ai/explain', 'POST', input)
  return {
    matches: data.matches ?? [],
    mismatches: data.mismatches ?? [],
    storeChecks: data.storeChecks ?? [],
    storeQuestions: data.storeQuestions ?? [],
  } satisfies ExplainCopy
}

export async function createFitPass(input: {
  productId: string
  colorId?: string | null
  alternativeId?: string | null
  fitPass: FitPassDraft
  conditions: Conditions
}) {
  const payload = toApiConditions(input.conditions)
  const data = await apiJson<unknown>('/fit-passes', 'POST', {
    productId: input.productId,
    colorId: input.colorId || undefined,
    alternativeId: input.alternativeId || undefined,
    storeId: input.fitPass.storeId,
    visitTime: toIsoVisitTime(input.fitPass.visitTime),
    experiences: input.fitPass.experiences as FitPassExperience[],
    customNote: input.fitPass.customNote.trim() || undefined,
    conditions: payload ?? undefined,
  })
  const issued = normalizeFitPass(data as Parameters<typeof normalizeFitPass>[0])
  if (!issued) throw new Error('FIT_PASS_CREATE_FAILED')
  return issued
}

export async function getFitPass(fitPassId: string) {
  const data = await apiRequest<unknown>(`/fit-passes/${encodeURIComponent(fitPassId)}`)
  const issued = normalizeFitPass(data as Parameters<typeof normalizeFitPass>[0])
  if (!issued) throw new Error('FIT_PASS_NOT_FOUND')
  return issued
}

export { fromApiConditions, toApiConditions }
