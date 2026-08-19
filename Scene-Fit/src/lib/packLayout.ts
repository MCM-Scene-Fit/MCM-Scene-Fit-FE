import { resolveCarryItem } from '../data/itemPresets'
import type { ItemId, ItemPresets } from '../types'

export type PackSize = {
  widthMm: number
  heightMm: number
  depthMm?: number
}

export type PackBag = {
  widthMm: number
  heightMm: number
  depthMm: number
}

export type PackOri = 0 | 1 | 2 | 3 | 4 | 5

export type PackPose = {
  x: number
  y: number
  z: number
  ori: PackOri
}

export type PackRect = {
  x: number
  y: number
  w: number
  h: number
}

export type PackBox = PackRect & {
  z: number
  d: number
}

export type PackPlacement = Record<ItemId, PackPose>

const PACK_GAP_MM = 6
const EDGE_EPS_MM = 0.75

/** AABB 축 정렬 6방향. 값은 [width, height, depth] 인덱스. */
const AABB_ORIS: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [1, 0, 2],
  [0, 2, 1],
  [2, 1, 0],
  [1, 2, 0],
  [2, 0, 1],
]

export function packScale(bag: PackSize, bounds: { width: number; height: number }) {
  if (bag.widthMm <= 0 || bag.heightMm <= 0 || bounds.width <= 0 || bounds.height <= 0) {
    return 0
  }
  return Math.min(bounds.width / bag.widthMm, bounds.height / bag.heightMm)
}

export function nextOri(ori: PackOri): PackOri {
  return ((ori + 1) % 6) as PackOri
}

export function orientedBox(
  item: { widthMm: number; heightMm: number; depthMm: number },
  ori: number,
) {
  const dims = [item.widthMm, item.heightMm, item.depthMm]
  const perm = AABB_ORIS[((ori % 6) + 6) % 6]
  return { w: dims[perm[0]], h: dims[perm[1]], d: dims[perm[2]] }
}

export function faceSize(
  item: { widthMm: number; heightMm: number; depthMm: number },
  ori: number,
) {
  const box = orientedBox(item, ori)
  return { w: box.w, h: box.h }
}

export function layoutItems(
  ids: ItemId[],
  bag: PackSize,
  presets: ItemPresets = {},
): PackPlacement {
  return layoutItems3d(
    ids,
    { widthMm: bag.widthMm, heightMm: bag.heightMm, depthMm: bag.depthMm ?? 80 },
    presets,
  )
}

export function layoutItems3d(
  ids: ItemId[],
  bag: PackBag,
  presets: ItemPresets = {},
): PackPlacement {
  const next = {} as PackPlacement
  let x = 0
  let y = 0
  let z = 0
  let rowH = 0
  let layerD = 0

  for (const id of ids) {
    const size = orientedBox(resolveCarryItem(id, presets), 0)
    if (x > 0 && x + size.w > bag.widthMm) {
      x = 0
      y += rowH + PACK_GAP_MM
      rowH = 0
    }
    if (y > 0 && y + size.h > bag.heightMm) {
      x = 0
      y = 0
      z += layerD + PACK_GAP_MM
      rowH = 0
      layerD = 0
    }
    next[id] = { x, y, z, ori: 0 }
    x += size.w + PACK_GAP_MM
    rowH = Math.max(rowH, size.h)
    layerD = Math.max(layerD, size.d)
  }

  return next
}

export function itemRect(id: ItemId, pose: PackPose, presets: ItemPresets = {}): PackRect {
  const { w, h } = orientedBox(resolveCarryItem(id, presets), pose.ori)
  return { x: pose.x, y: pose.y, w, h }
}

export function itemBox(id: ItemId, pose: PackPose, presets: ItemPresets = {}): PackBox {
  const { w, h, d } = orientedBox(resolveCarryItem(id, presets), pose.ori)
  return { x: pose.x, y: pose.y, z: pose.z, w, h, d }
}

export function isOutsideBag(rect: PackRect, bag: PackSize) {
  return (
    rect.x < -EDGE_EPS_MM ||
    rect.y < -EDGE_EPS_MM ||
    rect.x + rect.w > bag.widthMm + EDGE_EPS_MM ||
    rect.y + rect.h > bag.heightMm + EDGE_EPS_MM
  )
}

export function isOutsideBag3d(box: PackBox, bag: PackBag) {
  return (
    isOutsideBag(box, bag) ||
    box.z < -EDGE_EPS_MM ||
    box.z + box.d > bag.depthMm + EDGE_EPS_MM
  )
}

export function rectsOverlap(a: PackRect, b: PackRect) {
  return (
    a.x < b.x + b.w - EDGE_EPS_MM &&
    a.x + a.w > b.x + EDGE_EPS_MM &&
    a.y < b.y + b.h - EDGE_EPS_MM &&
    a.y + a.h > b.y + EDGE_EPS_MM
  )
}

export function boxesOverlap3d(a: PackBox, b: PackBox) {
  return rectsOverlap(a, b) && a.z < b.z + b.d - EDGE_EPS_MM && a.z + a.d > b.z + EDGE_EPS_MM
}

export function overlapIds(
  ids: ItemId[],
  placement: PackPlacement,
  presets: ItemPresets = {},
) {
  const hit = new Set<ItemId>()
  for (let i = 0; i < ids.length; i += 1) {
    const a = ids[i]
    const poseA = placement[a]
    if (!poseA) continue
    const rectA = itemRect(a, poseA, presets)
    for (let j = i + 1; j < ids.length; j += 1) {
      const b = ids[j]
      const poseB = placement[b]
      if (!poseB) continue
      if (rectsOverlap(rectA, itemRect(b, poseB, presets))) {
        hit.add(a)
        hit.add(b)
      }
    }
  }
  return hit
}

export function overlapIds3d(
  ids: ItemId[],
  placement: PackPlacement,
  presets: ItemPresets = {},
) {
  const hit = new Set<ItemId>()
  for (let i = 0; i < ids.length; i += 1) {
    const a = ids[i]
    const poseA = placement[a]
    if (!poseA) continue
    const boxA = itemBox(a, poseA, presets)
    for (let j = i + 1; j < ids.length; j += 1) {
      const b = ids[j]
      const poseB = placement[b]
      if (!poseB) continue
      if (boxesOverlap3d(boxA, itemBox(b, poseB, presets))) {
        hit.add(a)
        hit.add(b)
      }
    }
  }
  return hit
}

export function toWorldCenter(box: PackBox, bag: PackBag) {
  return {
    x: box.x + box.w / 2 - bag.widthMm / 2,
    y: bag.heightMm / 2 - (box.y + box.h / 2),
    z: box.z + box.d / 2 - bag.depthMm / 2,
  }
}
