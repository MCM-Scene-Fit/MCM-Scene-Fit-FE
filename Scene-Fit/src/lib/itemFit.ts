import { CARRY_ITEM_MAP } from '../data/items'
import { ITEMS, type ItemId, type Product } from '../types'

type Box = {
  widthMm: number
  heightMm: number
  depthMm: number
}

function sortedDims(box: Box) {
  return [box.widthMm, box.heightMm, box.depthMm].sort((a, b) => a - b)
}

/** 축 정렬 회전만 허용. 가방 외형 AABB보다 크면 명백히 불가. */
export function boxFitsIn(item: Box, bag: Box) {
  const inner = sortedDims(item)
  const outer = sortedDims(bag)
  return inner[0] <= outer[0] && inner[1] <= outer[1] && inner[2] <= outer[2]
}

export function itemFitsProduct(itemId: ItemId, product: Box) {
  return boxFitsIn(CARRY_ITEM_MAP[itemId], product)
}

export function deriveLikelyStorage(product: Pick<Product, 'widthMm' | 'heightMm' | 'depthMm' | 'officialStorage'>) {
  return ITEMS.filter(
    (id) => !product.officialStorage.includes(id) && itemFitsProduct(id, product),
  )
}
