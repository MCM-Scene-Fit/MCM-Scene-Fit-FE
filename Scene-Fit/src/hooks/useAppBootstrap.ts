import { useEffect } from 'react'
import {
  ApiError,
  clearSessionId,
  createSession,
  fromApiConditions,
  getFitPass,
  getSessionId,
  getSessionMe,
  isMockMode,
  patchSessionMe,
  toApiConditions,
} from '../api'
import { selectConditionsReady, useFlowStore } from '../store/useFlowStore'
import { useCatalogStore } from '../store/useCatalogStore'

let syncTimer: number | undefined
let started = false
let hydrating = false

function isPristine() {
  const state = useFlowStore.getState()
  return !state.selectedProduct && !state.conditions.scene && !state.fitPassIssued
}

async function ensureSession() {
  if (isMockMode()) return null
  const existing = getSessionId()
  if (existing) {
    try {
      return await getSessionMe()
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        clearSessionId()
      } else {
        return null
      }
    }
  }
  try {
    return await createSession()
  } catch {
    return null
  }
}

async function hydrateFromSession() {
  if (isMockMode() || !isPristine()) return
  try {
    const session = await getSessionMe()
    if (!isPristine()) return
    hydrating = true
    if (session.selectedProductId) {
      const product = await useCatalogStore.getState().ensureProduct(session.selectedProductId)
      if (product) {
        useFlowStore.getState().selectProduct(product.id, session.selectedColorId ?? undefined)
      }
    }
    if (session.conditions) {
      useFlowStore.getState().setConditions(fromApiConditions(session.conditions))
    }
    if (session.fitPassId) {
      try {
        const issued = await getFitPass(session.fitPassId)
        useFlowStore.setState({
          fitPassIssued: issued,
          fitPassStatus: issued.status ?? 'requested',
        })
      } catch {
        /* keep local flow */
      }
    }
  } catch {
    /* session restore is optional */
  } finally {
    hydrating = false
  }
}

function queueSessionPatch() {
  if (isMockMode() || hydrating || !getSessionId()) return
  window.clearTimeout(syncTimer)
  syncTimer = window.setTimeout(() => {
    const state = useFlowStore.getState()
    const conditions = toApiConditions(state.conditions)
    void patchSessionMe({
      selectedProductId: state.selectedProduct?.id ?? null,
      selectedColorId: state.selectedColorId,
      conditions: selectConditionsReady(state) ? conditions : undefined,
    }).catch(() => {
      /* keep local flow if the session endpoint is down */
    })
  }, 400)
}

export function useAppBootstrap() {
  const refresh = useCatalogStore((state) => state.refresh)

  useEffect(() => {
    if (!started) {
      started = true
      void (async () => {
        await ensureSession()
        await refresh()
        await hydrateFromSession()
      })()
    }

    const unsubCatalog = useCatalogStore.subscribe((state, prev) => {
      if (state.products === prev.products) return
      const selected = useFlowStore.getState().selectedProduct
      if (!selected) return
      const fresh = state.getProduct(selected.id)
      if (fresh) useFlowStore.getState().replaceSelectedProduct(fresh)
    })

    const unsubFlow = useFlowStore.subscribe((state, prev) => {
      if (
        state.selectedProduct?.id === prev.selectedProduct?.id &&
        state.selectedColorId === prev.selectedColorId &&
        state.conditions === prev.conditions
      ) {
        return
      }
      queueSessionPatch()
    })

    return () => {
      unsubCatalog()
      unsubFlow()
    }
  }, [refresh])
}
