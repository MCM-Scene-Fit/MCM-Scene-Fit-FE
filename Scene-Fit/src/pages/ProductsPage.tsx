import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { StepHeader, StickyBar } from '../components/StepHeader'
import { useFlow } from '../context/FlowContext'
import { WEAR_LABEL } from '../data/labels'
import { PRODUCTS } from '../data/products'
import type { WearStyle } from '../types'

const FILTERS: Array<{ id: 'all' | WearStyle; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'crossbody', label: WEAR_LABEL.crossbody },
  { id: 'tote', label: WEAR_LABEL.tote },
  { id: 'shoulder', label: WEAR_LABEL.shoulder },
  { id: 'backpack', label: WEAR_LABEL.backpack },
]

export function ProductsPage() {
  const navigate = useNavigate()
  const { selectedProductId, selectProduct } = useFlow()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all')

  const products = useMemo(() => {
    if (filter === 'all') return PRODUCTS
    return PRODUCTS.filter((product) => product.wearStyles.includes(filter))
  }, [filter])

  return (
    <main className="page has-sticky">
      <StepHeader
        step={1}
        title="원하는 제품을 선택하세요"
        caption="공식 정보가 있는 가방 10개로 시작합니다."
        backTo="/"
      />

      <div className="chip-row">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`chip ${filter === item.id ? 'is-on' : ''}`}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="product-grid">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            selected={selectedProductId === product.id}
            onSelect={() => selectProduct(product.id)}
          />
        ))}
      </div>

      <StickyBar>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!selectedProductId}
          onClick={() => navigate('/preview')}
        >
          내 모습에서 미리 보기
        </button>
      </StickyBar>
    </main>
  )
}
