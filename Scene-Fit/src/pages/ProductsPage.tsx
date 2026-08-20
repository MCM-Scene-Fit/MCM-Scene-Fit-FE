import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { ProductFilters } from '../components/ProductFilters'
import { StepHeader, StickyBar } from '../components/StepHeader'
import { formatPrice } from '../data/labels'
import {
  DEFAULT_PRODUCT_FILTERS,
  filterProducts,
  type ProductFilterState,
} from '../lib/productFilters'
import { useCatalogStore } from '../store/useCatalogStore'
import { useFlowStore } from '../store/useFlowStore'

type ProductLayout = 'list' | 'grid2' | 'grid4'

const PRODUCT_LAYOUTS: Array<{
  id: ProductLayout
  label: string
  icon: 'list' | 'grid2' | 'grid4'
}> = [
  { id: 'list', label: '1열', icon: 'list' },
  { id: 'grid2', label: '2열', icon: 'grid2' },
  { id: 'grid4', label: '4열', icon: 'grid4' },
]

function LayoutIcon({ icon }: { icon: 'list' | 'grid2' | 'grid4' }) {
  if (icon === 'list') {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M2 3.5h12M2 8h12M2 12.5h12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  if (icon === 'grid2') {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <rect x="2" y="2" width="5.5" height="5.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <rect x="8.5" y="2" width="5.5" height="5.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <rect x="2" y="8.5" width="5.5" height="5.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1.5" y="1.5" width="3.2" height="3.2" rx="0.6" fill="currentColor" />
      <rect x="6.4" y="1.5" width="3.2" height="3.2" rx="0.6" fill="currentColor" />
      <rect x="11.3" y="1.5" width="3.2" height="3.2" rx="0.6" fill="currentColor" />
      <rect x="1.5" y="6.4" width="3.2" height="3.2" rx="0.6" fill="currentColor" />
      <rect x="6.4" y="6.4" width="3.2" height="3.2" rx="0.6" fill="currentColor" />
      <rect x="11.3" y="6.4" width="3.2" height="3.2" rx="0.6" fill="currentColor" />
      <rect x="1.5" y="11.3" width="3.2" height="3.2" rx="0.6" fill="currentColor" />
      <rect x="6.4" y="11.3" width="3.2" height="3.2" rx="0.6" fill="currentColor" />
      <rect x="11.3" y="11.3" width="3.2" height="3.2" rx="0.6" fill="currentColor" />
    </svg>
  )
}

export function ProductsPage() {
  const navigate = useNavigate()
  const catalogProducts = useCatalogStore((state) => state.products)
  const selectedProduct = useFlowStore((state) => state.selectedProduct)
  const selectedColorId = useFlowStore((state) => state.selectedColorId)
  const selectProduct = useFlowStore((state) => state.selectProduct)
  const [filters, setFilters] = useState<ProductFilterState>(DEFAULT_PRODUCT_FILTERS)
  const [layout, setLayout] = useState<ProductLayout>('grid4')

  const products = useMemo(
    () => filterProducts(catalogProducts, filters),
    [catalogProducts, filters],
  )

  const selectedInView = products.some((product) => product.id === selectedProduct?.id)

  const goPreview = () => {
    if (!selectedProduct) return
    navigate('/preview')
  }

  return (
    <main className="page has-sticky page-products">
      <StepHeader
        variant="catalog"
        step={1}
        title="원하는 제품을 선택하세요"
        caption="공식몰에서 검수한 MCM 가방 10개입니다. 형태·색상·가격으로 좁힌 뒤 한 개를 고르세요."
        backTo="/"
      />

      <ProductFilters
        filters={filters}
        total={catalogProducts.length}
        shown={products.length}
        onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
        onReset={() => setFilters(DEFAULT_PRODUCT_FILTERS)}
      />

      <div className="product-toolbar">
        <p className="product-toolbar__label">보기</p>
        <div className="product-layout" role="group" aria-label="제품 정렬">
          {PRODUCT_LAYOUTS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`product-layout__btn${layout === item.id ? ' is-on' : ''}`}
              aria-pressed={layout === item.id}
              aria-label={item.label}
              title={item.label}
              onClick={() => setLayout(item.id)}
            >
              <LayoutIcon icon={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {products.length === 0 ? (
        <p className="empty-note">
          현재 선택한 조건을 모두 만족하는 제품을 찾지 못했습니다. 형태나 가격 조건을 넓혀 보세요.
        </p>
      ) : (
        <div className={`product-grid is-${layout}`}>
          {products.map((product) => {
            const isSelected = selectedProduct?.id === product.id
            return (
              <ProductCard
                key={product.id}
                product={product}
                variant="catalog"
                selected={isSelected}
                colorId={isSelected ? selectedColorId ?? undefined : undefined}
                onSelect={selectProduct}
              />
            )
          })}
        </div>
      )}

      <StickyBar>
        <div className="sticky-select">
          <p className="sticky-select__info">
            {selectedProduct ? (
              <>
                <strong>{selectedProduct.name}</strong>
                <span className="muted">
                  {' '}
                  {formatPrice(selectedProduct.price)}
                  {selectedInView ? '' : ' · 현재 필터 밖'}
                </span>
              </>
            ) : (
              <span className="muted">가방을 하나 선택하면 미리보기로 이동합니다.</span>
            )}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!selectedProduct}
            onClick={goPreview}
          >
            내 모습에서 미리 보기
          </button>
        </div>
      </StickyBar>
    </main>
  )
}
