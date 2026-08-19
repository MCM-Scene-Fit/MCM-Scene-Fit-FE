import { formatCarryLoad, sumCarryLoad } from '../data/items'
import { resolveCarryItem } from '../data/itemPresets'
import type { ItemId, ItemPresets } from '../types'

type ItemLoadSummaryProps = {
  items: ItemId[]
  presets?: ItemPresets
  compact?: boolean
}

export function ItemLoadSummary({
  items,
  presets = {},
  compact = false,
}: ItemLoadSummaryProps) {
  const load = sumCarryLoad(items, (id) => resolveCarryItem(id, presets))

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
