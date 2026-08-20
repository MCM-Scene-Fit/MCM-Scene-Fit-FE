import { useState, type FormEvent } from 'react'
import { ApiError, createFitPass, isMockMode, patchSessionMe } from '../api'
import { useFlow } from '../context/FlowContext'
import type { FitPassDraft, FitPassIssued } from '../types'

export function isFitPassReady(fitPass: FitPassDraft) {
  return Boolean(fitPass.storeId && fitPass.experiences.length)
}

function localIssued(storeChecks: string[]): FitPassIssued {
  return {
    id: `fp_${Date.now().toString(36)}`,
    storeChecks,
    createdAt: new Date().toISOString(),
    status: 'requested',
    demo: true,
    disclaimer: '실시간 재고를 확정하지 않습니다. 재고 및 체험 가능 여부 확인 요청만 접수했습니다.',
  }
}

export function useFitPassSubmit(
  storeChecks: string[],
  onSubmitted: () => void,
  options?: { productId?: string; colorId?: string; alternativeId?: string | null },
) {
  const { fitPass, submitFitPass, selectProduct, selectedProduct, selectedColorId, conditions } =
    useFlow()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ready = isFitPassReady(fitPass)

  const onSubmit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!ready || submitting) return
    const productId = options?.productId ?? selectedProduct?.id
    if (!productId) return
    if (options?.productId && options.productId !== selectedProduct?.id) {
      selectProduct(options.productId, options.colorId)
    }

    setSubmitting(true)
    setError(null)
    try {
      if (isMockMode()) {
        submitFitPass(localIssued(storeChecks))
        onSubmitted()
        return
      }
      const issued = await createFitPass({
        productId,
        colorId: options?.colorId ?? selectedColorId,
        alternativeId: options?.alternativeId,
        fitPass,
        conditions,
      })
      submitFitPass({
        ...issued,
        storeChecks: issued.storeChecks.length ? issued.storeChecks : storeChecks,
      })
      void patchSessionMe({ fitPassId: issued.id }).catch(() => {
        /* session snapshot is optional */
      })
      onSubmitted()
    } catch (caught) {
      if (caught instanceof ApiError && caught.status >= 400 && caught.status < 500 && caught.status !== 0) {
        setError(caught.message)
        return
      }
      submitFitPass(localIssued(storeChecks))
      onSubmitted()
    } finally {
      setSubmitting(false)
    }
  }

  return { ready: ready && !submitting, submitting, error, onSubmit }
}
