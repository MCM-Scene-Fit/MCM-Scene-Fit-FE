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

export function ProductsPage() {
  const navigate = useNavigate()
  const catalogProducts = useCatalogStore((state) => state.products)
  const selectedProduct = useFlowStore((state) => state.selectedProduct)
  const selectedColorId = useFlowStore((state) => state.selectedColorId)
  const selectProduct = useFlowStore((state) => state.selectProduct)
  const [filters, setFilters] = useState<ProductFilterState>(DEFAULT_PRODUCT_FILTERS)

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
    <main className="page has-sticky">
      <StepHeader
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

      {products.length === 0 ? (
        <p className="empty-note">
          현재 선택한 조건을 모두 만족하는 제품을 찾지 못했습니다. 형태나 가격 조건을 넓혀 보세요.
        </p>
      ) : (
        <div className="product-grid">
          {products.map((product) => {
            const isSelected = selectedProduct?.id === product.id
            return (
              <ProductCard
                key={product.id}
                product={product}
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
