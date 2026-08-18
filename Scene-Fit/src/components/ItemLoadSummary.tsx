import { formatCarryLoad, sumCarryLoad } from '../data/items'
import type { ItemId } from '../types'

type ItemLoadSummaryProps = {
  items: ItemId[]
  compact?: boolean
}

export function ItemLoadSummary({ items, compact = false }: ItemLoadSummaryProps) {
  const load = sumCarryLoad(items)

  return (
    <aside className={`item-load ${compact ? 'item-load--compact' : ''}`}>
      <strong>{formatCarryLoad(load)}</strong>
      <p className="muted">
        {load.count > 0
          ? '고른 소지품의 겉보기 합이며, 가방이 얼마나 찼는지는 아닙니다.'
          : '대표 치수 기준의 간이값입니다.'}
      </p>
    </aside>
  )
}
