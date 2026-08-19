import type { FormEvent } from 'react'
import { useFlow } from '../context/FlowContext'
import type { FitPassDraft } from '../types'

export function isFitPassReady(fitPass: FitPassDraft) {
  return Boolean(fitPass.storeId && fitPass.experiences.length)
}

export function useFitPassSubmit(
  storeChecks: string[],
  onSubmitted: () => void,
  options?: { productId?: string; colorId?: string },
) {
  const { fitPass, submitFitPass, selectProduct, selectedProduct } = useFlow()
  const ready = isFitPassReady(fitPass)

  const onSubmit = (event?: FormEvent) => {
    event?.preventDefault()
    if (!ready) return
    if (options?.productId && options.productId !== selectedProduct?.id) {
      selectProduct(options.productId, options.colorId)
    }
    submitFitPass(storeChecks)
    onSubmitted()
  }

  return { ready, onSubmit }
}
