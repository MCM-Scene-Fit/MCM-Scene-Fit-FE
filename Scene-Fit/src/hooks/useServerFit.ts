import { useEffect, useMemo, useState } from 'react'
import {
  isMockMode,
  postExplain,
  postFitCheck,
  postFitCompare,
  toApiConditions,
} from '../api'
import { runFitCheck } from '../lib/fitCheck'
import { useCatalogStore } from '../store/useCatalogStore'
import type { Conditions, FitResult, Product } from '../types'

function fitRequestKey(productId: string, conditions: Conditions) {
  const payload = toApiConditions(conditions)
  return `${productId}:${JSON.stringify(
    payload ?? {
      scene: conditions.scene,
      mobility: conditions.mobility,
      items: conditions.items,
      wearStyle: conditions.wearStyle,
    },
  )}`
}

export function useServerFit(product: Product | null, conditions: Conditions) {
  const catalog = useCatalogStore((state) => state.products)
  const local = useMemo(
    () => (product ? runFitCheck(product, conditions, catalog) : null),
    [product, conditions, catalog],
  )
  const requestKey = product ? fitRequestKey(product.id, conditions) : ''
  const [remote, setRemote] = useState<{ key: string; result: FitResult } | null>(null)

  useEffect(() => {
    if (!product) return undefined
    const payload = toApiConditions(conditions)
    if (isMockMode() || !payload) return undefined
    const key = fitRequestKey(product.id, conditions)
    let cancelled = false

    void (async () => {
      try {
        const fit = await postFitCheck(product.id, payload)
        let next = fit
        try {
          const copy = await postExplain({ productId: product.id, conditions: payload, fit })
          next = {
            ...fit,
            matches: copy.matches.length ? copy.matches : fit.matches,
            mismatches: copy.mismatches.length ? copy.mismatches : fit.mismatches,
            storeChecks: copy.storeChecks.length ? copy.storeChecks : fit.storeChecks,
          }
        } catch {
          /* 규칙 결과 문장을 그대로 쓴다 */
        }
        if (!cancelled) setRemote({ key, result: next })
      } catch {
        /* 로컬 규칙 엔진으로 이어간다 */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [product, conditions])

  return remote?.key === requestKey ? remote.result : local
}

export function useServerCompare(product: Product | null, conditions: Conditions) {
  const catalog = useCatalogStore((state) => state.products)
  const ensureProduct = useCatalogStore((state) => state.ensureProduct)
  const localSelected = useMemo(
    () => (product ? runFitCheck(product, conditions, catalog) : null),
    [product, conditions, catalog],
  )
  const localAlternative = useMemo(() => {
    if (!localSelected?.alternativeId) return null
    const alt = catalog.find((item) => item.id === localSelected.alternativeId)
    if (!alt) return null
    return { product: alt, result: runFitCheck(alt, conditions, catalog) }
  }, [catalog, conditions, localSelected])

  const requestKey = product ? fitRequestKey(product.id, conditions) : ''
  const [remote, setRemote] = useState<{
    key: string
    selected: FitResult
    alternative: { product: Product; result: FitResult } | null
    message: string | null
  } | null>(null)

  useEffect(() => {
    if (!product) return undefined
    const payload = toApiConditions(conditions)
    if (isMockMode() || !payload) return undefined
    const key = fitRequestKey(product.id, conditions)
    const alternativeId = localSelected?.alternativeId
    let cancelled = false

    void (async () => {
      try {
        const data = await postFitCompare(product.id, payload, alternativeId)
        const alternativeProduct = data.alternative
          ? await ensureProduct(data.alternative.productId)
          : null
        if (cancelled) return
        setRemote({
          key,
          selected: data.selected,
          alternative:
            data.alternative && alternativeProduct
              ? { product: alternativeProduct, result: data.alternative }
              : null,
          message: data.message,
        })
      } catch {
        /* 로컬 비교로 이어간다 */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [conditions, ensureProduct, localSelected?.alternativeId, product])

  if (!product || !localSelected) {
    return { selected: null, alternative: null, message: null as string | null }
  }

  if (remote?.key === requestKey) {
    return {
      selected: remote.selected,
      alternative: remote.alternative,
      message: remote.message,
    }
  }

  return {
    selected: localSelected,
    alternative: localAlternative,
    message: localAlternative ? null : '현재 선택한 조건을 모두 만족하는 제품을 찾지 못했습니다.',
  }
}
