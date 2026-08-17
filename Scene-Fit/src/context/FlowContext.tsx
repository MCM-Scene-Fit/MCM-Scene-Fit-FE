import { useFlowStore } from '../store/useFlowStore'

export function useFlow() {
  const store = useFlowStore()
  return {
    ...store,
    selectedProductId: store.selectedProduct?.id ?? null,
    conditionsReady: Boolean(
      store.conditions.scene &&
        store.conditions.mobility &&
        store.conditions.items.length > 0 &&
        store.conditions.wearStyle,
    ),
  }
}
