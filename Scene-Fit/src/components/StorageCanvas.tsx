import { motion, useMotionValue, type PanInfo } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ItemPresetRow } from './ItemPresetRow'
import { PackStage3D } from './PackStage3D'
import { getColor } from '../data/products'
import { resolveCarryItem, presetKindOf, type PresetKind } from '../data/itemPresets'
import { bagSilhouetteFromImage, type BagPhotoLayout } from '../lib/bagSilhouette'
import {
  faceSize,
  isOutsideBag,
  isOutsideBag3d,
  itemBox,
  itemRect,
  layoutItems,
  nextOri,
  overlapIds,
  overlapIds3d,
  packScale,
  type PackBag,
  type PackPlacement,
  type PackPose,
} from '../lib/packLayout'
import type { ItemId, ItemPresets, Product } from '../types'

type StorageCanvasProps = {
  product: Product
  colorId?: string
  items: ItemId[]
  itemPresets: ItemPresets
  onSetPreset: (kind: PresetKind, presetId: string) => void
}

type ViewMode = '2d' | '3d'

type DragLive = {
  id: ItemId
  dxPx: number
  dyPx: number
}

const PACK_FRAME_MAX_H = 380

export function StorageCanvas({
  product,
  colorId,
  items,
  itemPresets,
  onSetPreset,
}: StorageCanvasProps) {
  const bag = useMemo<PackBag>(
    () => ({
      widthMm: product.widthMm,
      heightMm: product.heightMm,
      depthMm: product.depthMm,
    }),
    [product.depthMm, product.heightMm, product.widthMm],
  )
  const slotRef = useRef<HTMLDivElement>(null)
  const [hostW, setHostW] = useState(0)
  const [mode, setMode] = useState<ViewMode>('3d')
  const layoutKey = `${product.id}|${items.join('|')}|${bag.widthMm}x${bag.heightMm}x${bag.depthMm}`
  const [appliedKey, setAppliedKey] = useState(layoutKey)
  const [positions, setPositions] = useState<PackPlacement>(() =>
    layoutItems(items, bag, itemPresets),
  )
  const [drag, setDrag] = useState<DragLive | null>(null)
  const [picked, setPicked] = useState<ItemId | null>(null)

  if (appliedKey !== layoutKey) {
    setAppliedKey(layoutKey)
    setPositions(layoutItems(items, bag, itemPresets))
    setDrag(null)
    setPicked(null)
  }

  useEffect(() => {
    const slot = slotRef.current
    if (!slot) return

    const measure = () => setHostW(slot.clientWidth)
    const observer = new ResizeObserver(measure)
    observer.observe(slot)
    measure()
    return () => observer.disconnect()
  }, [])

  const plotW = Math.min(hostW, 520)
  const scale = packScale(bag, {
    width: plotW,
    height: Math.min(
      plotW * (bag.heightMm / Math.max(bag.widthMm, 1)),
      PACK_FRAME_MAX_H,
    ),
  })

  const livePositions = useMemo(() => {
    if (!drag || !scale) return positions
    const origin = positions[drag.id]
    if (!origin) return positions
    return {
      ...positions,
      [drag.id]: {
        ...origin,
        x: origin.x + drag.dxPx / scale,
        y: origin.y + drag.dyPx / scale,
      },
    }
  }, [drag, positions, scale])

  const overlapping = useMemo(
    () =>
      mode === '3d'
        ? overlapIds3d(items, livePositions, itemPresets)
        : overlapIds(items, livePositions, itemPresets),
    [itemPresets, items, livePositions, mode],
  )
  const outsideIds = useMemo(() => {
    const hit = new Set<ItemId>()
    for (const id of items) {
      const pose = livePositions[id]
      if (!pose) continue
      const out =
        mode === '3d'
          ? isOutsideBag3d(itemBox(id, pose, itemPresets), bag)
          : isOutsideBag(itemRect(id, pose, itemPresets), bag)
      if (out) hit.add(id)
    }
    return hit
  }, [bag, itemPresets, items, livePositions, mode])

  const frameW = bag.widthMm * scale
  const frameH = bag.heightMm * scale
  const stageH = Math.round((scale > 0 ? frameH : PACK_FRAME_MAX_H) + 40)
  const outside = outsideIds.size > 0
  const overlap = overlapping.size > 0
  const selected = picked && items.includes(picked) ? picked : null
  const selectedKind = selected ? presetKindOf(selected) : null

  const moveItem = (id: ItemId, info: PanInfo, commit: boolean) => {
    if (commit) {
      const current = scale || 1
      setPositions((prev) => {
        const origin = prev[id]
        if (!origin) return prev
        return {
          ...prev,
          [id]: {
            ...origin,
            x: origin.x + info.offset.x / current,
            y: origin.y + info.offset.y / current,
          },
        }
      })
      setDrag(null)
      return
    }
    setDrag({ id, dxPx: info.offset.x, dyPx: info.offset.y })
  }

  const rotateItem = (id: ItemId) => {
    setPicked(id)
    setPositions((prev) => {
      const pose = prev[id]
      if (!pose) return prev
      return { ...prev, [id]: { ...pose, ori: nextOri(pose.ori) } }
    })
  }

  return (
    <section className="pack-section" aria-label="소지품 수납 배치">
      <div className="pack-section__head">
        <div className="pack-section__copy">
          <p className="eyebrow">수납 배치</p>
          <h3>가방 안에 옮겨 보기</h3>
          <p className="muted">
            {mode === '3d'
              ? `선택한 ${product.name} 정면 컷으로 몸통 실루엣을 만들고, 옆면 컷으로 깊이를 맞췄습니다. 수납 판정은 공식 치수 ${product.widthMm / 10} × ${product.heightMm / 10} × ${product.depthMm / 10} cm 박스 기준입니다.`
              : `정면 단면(${product.widthMm / 10} × ${product.heightMm / 10} cm)입니다. 태블릿처럼 넓은 물건은 앞면이 크게 보입니다. 2D에서 겹침은 앞뒤 적재일 수 있습니다.`}
          </p>
        </div>
        <div className="pack-section__tools">
          <div className="segment pack-segment">
            <button type="button" className={mode === '3d' ? 'is-on' : ''} onClick={() => setMode('3d')}>
              3D
            </button>
            <button type="button" className={mode === '2d' ? 'is-on' : ''} onClick={() => setMode('2d')}>
              2D
            </button>
          </div>
          {items.length ? (
            <button
              type="button"
              className="btn btn-ghost pack-reset"
              onClick={() => {
                setPositions(layoutItems(items, bag, itemPresets))
                setDrag(null)
              }}
            >
              다시 맞추기
            </button>
          ) : null}
        </div>
      </div>

      <p className="pack-banner" role="note">
        실제 가방 형태 및 재질 유연성에 따라 수납 느낌이 다를 수 있습니다
      </p>

      {items.length ? (
        <>
          <div className="pack-legend" aria-live="polite">
            <span className={outside ? 'is-out' : ''}>가방 밖 {outsideIds.size}</span>
            <span className={overlap ? 'is-overlap' : ''}>
              {mode === '3d' ? '부피 겹침' : '겹침'} {overlapping.size}
            </span>
            <span>
              안에 있음 {items.length - outsideIds.size}/{items.length}
            </span>
          </div>

          <div ref={slotRef} className="pack-stage-slot" style={{ height: stageH }}>
          {mode === '3d' ? (
            <PackStage3D
              bag={bag}
              product={product}
              colorId={colorId}
              items={items}
              presets={itemPresets}
              positions={livePositions}
              selected={selected}
              outsideIds={outsideIds}
              overlapping={overlapping}
              onSelect={setPicked}
              onMove={(id, next) =>
                setPositions((prev) => {
                  const pose = prev[id]
                  if (!pose) return prev
                  return { ...prev, [id]: { ...pose, ...next } }
                })
              }
            />
          ) : (
            <div className="pack-stage">
              <div className="pack-stage__plot">
                {scale > 0 ? (
                  <div
                    className={`pack-frame ${outside ? 'is-out' : ''} ${overlap ? 'is-overlap' : ''}`}
                    style={{ width: frameW, height: frameH }}
                  >
                    <PackBagPhoto product={product} colorId={colorId} bag={bag} />
                    <div className="pack-guides" aria-hidden="true">
                      <span className="pack-guides__fill" />
                      <span className="pack-guides__corner pack-guides__corner--tl" />
                      <span className="pack-guides__corner pack-guides__corner--tr" />
                      <span className="pack-guides__corner pack-guides__corner--bl" />
                      <span className="pack-guides__corner pack-guides__corner--br" />
                    </div>
                    {items.map((id) => {
                      const pose = positions[id]
                      if (!pose) return null
                      return (
                        <PackPiece
                          key={id}
                          id={id}
                          pose={pose}
                          presets={itemPresets}
                          scale={scale}
                          outside={outsideIds.has(id)}
                          overlapping={overlapping.has(id)}
                          dragging={drag?.id === id}
                          selected={selected === id}
                          onSelect={() => setPicked(id)}
                          onRotate={() => rotateItem(id)}
                          onDragStart={() => setDrag({ id, dxPx: 0, dyPx: 0 })}
                          onDrag={(info) => moveItem(id, info, false)}
                          onDragEnd={(info) => moveItem(id, info, true)}
                        />
                      )
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          )}
          </div>

          {selected ? (
            <div className="pack-selected">
              <button
                type="button"
                className="btn btn-ghost pack-reset"
                onClick={() => rotateItem(selected)}
              >
                90도 회전
              </button>
              {selectedKind ? (
                <ItemPresetRow kind={selectedKind} presets={itemPresets} onChange={onSetPreset} />
              ) : (
                <p className="muted pack-hint">선택한 품목은 축을 바꿔 가방 안에 맞춰 볼 수 있습니다.</p>
              )}
            </div>
          ) : (
            <p className="muted pack-hint">
              {mode === '3d'
                ? '빈 화면을 드래그하면 가방을 돌려 보고, 소지품을 잡아 옮길 수 있습니다. 고르면 90도 회전과 크기 프리셋이 나옵니다.'
                : '아이콘을 고르면 크기를 바꿀 수 있고, 90도씩 돌릴 수 있습니다.'}
            </p>
          )}
        </>
      ) : (
        <p className="empty-note">소지품을 고르면 가방 안에 아이콘을 옮겨 볼 수 있습니다.</p>
      )}
    </section>
  )
}

function PackBagPhoto({
  product,
  colorId,
  bag,
}: {
  product: Product
  colorId?: string
  bag: PackBag
}) {
  const color = getColor(product, colorId ?? product.colors[0].id)
  const [crop, setCrop] = useState<{ url: string; src: string; layout: BagPhotoLayout } | null>(null)
  const matched = crop?.url === color.image ? crop : null
  const src = matched?.src ?? color.image
  const layout = matched?.layout

  useEffect(() => {
    let cancelled = false
    bagSilhouetteFromImage(color.image, bag)
      .then((profile) => {
        if (cancelled) return
        setCrop({ url: color.image, src: profile.canvas.toDataURL(), layout: profile.photoLayout })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [bag, color.image])

  return (
    <img
      src={src}
      alt=""
      className="pack-frame__bag"
      draggable={false}
      aria-hidden
      style={
        layout
          ? {
              inset: 'auto',
              width: `${layout.widthPct * 100}%`,
              height: `${layout.heightPct * 100}%`,
              left: `${layout.leftPct * 100}%`,
              top: `${layout.topPct * 100}%`,
            }
          : undefined
      }
    />
  )
}

function PackPiece({
  id,
  pose,
  presets,
  scale,
  outside,
  overlapping,
  dragging,
  selected,
  onSelect,
  onRotate,
  onDragStart,
  onDrag,
  onDragEnd,
}: {
  id: ItemId
  pose: PackPose
  presets: ItemPresets
  scale: number
  outside: boolean
  overlapping: boolean
  dragging: boolean
  selected: boolean
  onSelect: () => void
  onRotate: () => void
  onDragStart: () => void
  onDrag: (info: PanInfo) => void
  onDragEnd: (info: PanInfo) => void
}) {
  const item = resolveCarryItem(id, presets)
  const { w, h } = faceSize(item, pose.ori)
  const width = Math.max(8, w * scale)
  const height = Math.max(8, h * scale)
  const x = useMotionValue(pose.x * scale)
  const y = useMotionValue(pose.y * scale)

  useEffect(() => {
    if (dragging) return
    x.set(pose.x * scale)
    y.set(pose.y * scale)
  }, [dragging, pose.x, pose.y, scale, x, y])

  return (
    <motion.div
      className={`pack-item ${outside ? 'is-out' : ''} ${overlapping ? 'is-overlap' : ''} ${dragging ? 'is-dragging' : ''} ${selected ? 'is-selected' : ''}`}
      drag
      dragMomentum={false}
      dragElastic={0}
      style={{ x, y, width, height }}
      onTap={onSelect}
      onDragStart={onDragStart}
      onDrag={(_, info) => onDrag(info)}
      onDragEnd={(_, info) => onDragEnd(info)}
      aria-label={`${item.label}${outside ? ', 가방 밖' : ''}${overlapping ? ', 겹침' : ''}`}
    >
      <span className="pack-item__face">
        <img src={item.icon} alt="" draggable={false} />
      </span>
      {Math.min(width, height) >= 36 ? <span className="pack-item__name">{item.label}</span> : null}
      <button
        type="button"
        className="pack-rotate"
        aria-label={`${item.label} 90도 회전`}
        onPointerDown={(event) => {
          event.stopPropagation()
        }}
        onClick={(event) => {
          event.stopPropagation()
          onRotate()
        }}
      >
        ↻
      </button>
    </motion.div>
  )
}
