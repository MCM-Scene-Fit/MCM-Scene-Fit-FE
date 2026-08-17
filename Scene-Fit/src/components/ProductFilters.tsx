import type { ReactNode } from 'react'
import {
  COLOR_FILTERS,
  hasActiveFilters,
  PRICE_FILTERS,
  WEAR_FILTERS,
  type ProductFilterState,
} from '../lib/productFilters'

type ProductFiltersProps = {
  filters: ProductFilterState
  total: number
  shown: number
  onChange: (patch: Partial<ProductFilterState>) => void
  onReset: () => void
}

export function ProductFilters({
  filters,
  total,
  shown,
  onChange,
  onReset,
}: ProductFiltersProps) {
  const active = hasActiveFilters(filters)

  return (
    <section className="filters" aria-label="제품 필터">
      <div className="filters__meta">
        <p>
          MCM P0 가방 <strong>{total}개</strong> 중 <strong>{shown}개</strong> 표시
        </p>
        {active ? (
          <button type="button" className="text-btn filters__reset" onClick={onReset}>
            필터 초기화
          </button>
        ) : null}
      </div>

      <FilterRow label="형태">
        {WEAR_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`chip ${filters.wear === item.id ? 'is-on' : ''}`}
            onClick={() => onChange({ wear: item.id })}
          >
            {item.label}
          </button>
        ))}
      </FilterRow>

      <FilterRow label="색상">
        {COLOR_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`chip chip-color ${filters.color === item.id ? 'is-on' : ''}`}
            onClick={() => onChange({ color: item.id })}
          >
            {item.hex ? (
              <span className="chip-dot" style={{ background: item.hex }} />
            ) : null}
            {item.label}
          </button>
        ))}
      </FilterRow>

      <FilterRow label="가격">
        {PRICE_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`chip ${filters.price === item.id ? 'is-on' : ''}`}
            onClick={() => onChange({ price: item.id })}
          >
            {item.label}
          </button>
        ))}
      </FilterRow>
    </section>
  )
}

function FilterRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="filter-row">
      <p className="field-label">{label}</p>
      <div className="chip-row filter-chips">{children}</div>
    </div>
  )
}
