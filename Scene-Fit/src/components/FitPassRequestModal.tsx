import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useFlow } from '../context/FlowContext'
import { getColor } from '../data/products'
import { useFitPassSubmit } from '../lib/fitPass'
import type { Product } from '../types'
import { FitPassFields } from './FitPassForm'
import { ProductMini } from './ProductCard'

type FitPassRequestModalProps = {
  open: boolean
  storeChecks: string[]
  product?: Product
  colorId?: string
  alternativeId?: string | null
  onClose: () => void
}

export function FitPassRequestModal({
  open,
  storeChecks,
  product: productProp,
  colorId: colorIdProp,
  alternativeId,
  onClose,
}: FitPassRequestModalProps) {
  const navigate = useNavigate()
  const { selectedProduct, selectedColorId } = useFlow()
  const product = productProp ?? selectedProduct
  const colorId = colorIdProp ?? selectedColorId ?? product?.colors[0].id
  const { ready, error, onSubmit } = useFitPassSubmit(
    storeChecks,
    () => {
      onClose()
      navigate('/fit-pass/done')
    },
    product ? { productId: product.id, colorId, alternativeId } : undefined,
  )

  useEffect(() => {
    if (!open) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open || !product) return null
  const color = getColor(product, colorId ?? product.colors[0].id)

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fit-pass-modal-title"
      >
        <header className="modal-sheet__head">
          <div>
            <p className="eyebrow">Store Fit Pass</p>
            <h2 id="fit-pass-modal-title">매장 체험 신청</h2>
            <p className="muted">확인하고 싶은 경험과 방문 정보를 매장에 전달합니다.</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </header>

        <ProductMini product={product} colorId={color.id} />

        <form className="modal-sheet__form" onSubmit={(event) => void onSubmit(event)}>
          <FitPassFields />
          <p className="disclaimer">
            실제 예약 확정이나 실시간 재고 차감은 하지 않습니다. 재고 및 체험 가능 여부 확인
            요청만 접수합니다.
          </p>
          {error ? <p className="empty-note">{error}</p> : null}
          <button type="submit" className="btn btn-primary" disabled={!ready}>
            매장 체험 요청하기
          </button>
        </form>
      </div>
    </div>,
    document.body,
  )
}
