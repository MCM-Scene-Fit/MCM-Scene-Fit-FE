import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from 'react'
import {
  analyzeBody,
  drawPersonCutout,
  type BodyAnalysis,
} from '../lib/bodyAnalysis'
import { bagBoxPx, containedSize, HEIGHT_MAX_CM, personHeightPx } from '../lib/previewFit'
import { silhouetteBagAnchor, wearAnchorFromPose } from '../lib/wearAnchor'
import type { BodyProfile, PreviewMode, Product, WearStyle } from '../types'
import { ProductImage } from './ProductImage'

type BagTransform = {
  x: number
  y: number
}

type WearPreviewProps = {
  product: Product
  colorId: string
  mode: PreviewMode
  photoUrl: string | null
  body: BodyProfile
  wearStyle: WearStyle
  bag: BagTransform
  onBagChange: (bag: Partial<BagTransform>) => void
  onUploadClick: () => void
}

type SizeBox = { width: number; height: number }

const BAG_X_MIN = 4
const BAG_X_MAX = 96
const BAG_Y_MIN = 4
const BAG_Y_MAX = 86
const EMPTY_BOX: SizeBox = { width: 0, height: 0 }

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function sameBox(a: SizeBox, b: SizeBox) {
  return Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5
}

export function WearPreview({
  product,
  colorId,
  mode,
  photoUrl,
  body,
  wearStyle,
  bag,
  onBagChange,
  onUploadClick,
}: WearPreviewProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const figureRef = useRef<HTMLDivElement>(null)
  const photoRef = useRef<HTMLImageElement>(null)
  const silhouetteRef = useRef<SVGSVGElement>(null)
  const cutoutRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [photoBagBox, setPhotoBagBox] = useState<SizeBox>(EMPTY_BOX)
  const [silhouetteBagBox, setSilhouetteBagBox] = useState<SizeBox>(EMPTY_BOX)
  const [figure, setFigure] = useState<SizeBox & { url: string | null }>({
    url: null,
    width: 0,
    height: 0,
  })
  const [analysis, setAnalysis] = useState<{ url: string; body: BodyAnalysis } | null>(null)
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  const activeAnalysis =
    mode === 'photo' && analysis?.url === photoUrl ? analysis.body : null
  const status =
    mode !== 'photo' || !photoUrl
      ? 'idle'
      : loadingUrl === photoUrl
        ? 'loading'
        : failedUrl === photoUrl
          ? 'fallback'
          : activeAnalysis
            ? 'ready'
            : 'idle'
  const activeFigure =
    mode === 'photo' && figure.url === photoUrl ? figure : EMPTY_BOX
  const bagBox = mode === 'photo' ? photoBagBox : silhouetteBagBox
  const showBag = mode === 'silhouette' || Boolean(photoUrl)
  const bagBehind = Boolean(
    activeAnalysis && wearAnchorFromPose(wearStyle, activeAnalysis.landmarks).behindPerson,
  )

  const measureBag = useEffectEvent(() => {
    const stage = stageRef.current
    if (!stage) return

    if (mode === 'photo') {
      const photo = photoRef.current
      if (!photo || photo.naturalWidth <= 0 || !photoUrl) return

      const nextFigure = containedSize(
        photo.naturalWidth,
        photo.naturalHeight,
        stage.clientWidth,
        stage.clientHeight,
      )
      setFigure((prev) =>
        prev.url === photoUrl && sameBox(prev, nextFigure)
          ? prev
          : { url: photoUrl, width: nextFigure.width, height: nextFigure.height },
      )

      const ratio = analysis?.url === photoUrl ? analysis.body.personHeightRatio : null
      const avatarPx = nextFigure.height * (ratio ?? 0.9)
      if (avatarPx <= 0) return
      const nextBox = bagBoxPx(product, avatarPx, body.heightCm)
      setPhotoBagBox((prev) => (sameBox(prev, nextBox) ? prev : nextBox))
      return
    }

    const avatarPx = personHeightPx({
      mode: 'silhouette',
      heightCm: body.heightCm,
      stageHeight: stage.clientHeight,
      photo: null,
      silhouette: silhouetteRef.current,
    })
    if (avatarPx <= 0) return
    const nextBox = bagBoxPx(product, avatarPx, body.heightCm)
    setSilhouetteBagBox((prev) => (sameBox(prev, nextBox) ? prev : nextBox))
  })

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const observer = new ResizeObserver(() => measureBag())
    observer.observe(stage)
    if (photoRef.current) observer.observe(photoRef.current)
    if (silhouetteRef.current) observer.observe(silhouetteRef.current)
    const frame = requestAnimationFrame(() => measureBag())
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [mode, photoUrl, product, body.heightCm, activeAnalysis])

  useEffect(() => {
    if (mode === 'silhouette') {
      const anchor = silhouetteBagAnchor(wearStyle)
      onBagChange({ x: anchor.x, y: anchor.y })
      return
    }
    if (!activeAnalysis) return
    const anchor = wearAnchorFromPose(wearStyle, activeAnalysis.landmarks)
    onBagChange({
      x: clamp(anchor.x, BAG_X_MIN, BAG_X_MAX),
      y: clamp(anchor.y, BAG_Y_MIN, BAG_Y_MAX),
    })
  }, [mode, wearStyle, activeAnalysis, onBagChange])

  useEffect(() => {
    const canvas = cutoutRef.current
    const photo = photoRef.current
    if (!canvas || !photo || !activeAnalysis?.mask) return
    drawPersonCutout(canvas, photo, activeAnalysis.mask)
  }, [activeAnalysis, mode, photoUrl])

  const onPhotoReady = () => {
    const photo = photoRef.current
    if (!photo || !photoUrl) return

    // 같은 사진은 다시 분석하지 않아, 실루엣 왕복 후 비율이 흔들리지 않게 한다.
    if (analysis?.url === photoUrl) return

    const url = photoUrl
    setLoadingUrl(url)
    setFailedUrl((current) => (current === url ? null : current))
    void analyzeBody(photo)
      .then((next) => {
        if (photoRef.current?.src !== photo.src) return
        if (!next) {
          setFailedUrl(url)
          return
        }
        setAnalysis({ url, body: next })
      })
      .catch(() => {
        if (photoRef.current?.src !== photo.src) return
        setFailedUrl(url)
      })
      .finally(() => {
        setLoadingUrl((current) => (current === url ? null : current))
      })
  }

  const moveBag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    const frame = figureRef.current ?? stageRef.current
    if (!drag || !frame || event.pointerId !== drag.pointerId) return
    const rect = frame.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const x = drag.originX + ((event.clientX - drag.startX) / rect.width) * 100
    const y = drag.originY + ((event.clientY - drag.startY) / rect.height) * 100
    onBagChange({ x: clamp(x, BAG_X_MIN, BAG_X_MAX), y: clamp(y, BAG_Y_MIN, BAG_Y_MAX) })
  }

  const onBagPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: bag.x,
      originY: bag.y,
    }
    setDragging(true)
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    setDragging(false)
  }

  const onBagKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 4 : 1.6
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      onBagChange({ x: clamp(bag.x - step, BAG_X_MIN, BAG_X_MAX) })
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      onBagChange({ x: clamp(bag.x + step, BAG_X_MIN, BAG_X_MAX) })
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      onBagChange({ y: clamp(bag.y - step, BAG_Y_MIN, BAG_Y_MAX) })
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      onBagChange({ y: clamp(bag.y + step, BAG_Y_MIN, BAG_Y_MAX) })
    }
  }

  const bagNode =
    showBag && bagBox.width > 0 ? (
      <div
        className={`bag-layer ${dragging ? 'is-dragging' : ''} ${bagBehind ? 'is-behind' : ''}`}
        style={{
          left: `${bag.x}%`,
          top: `${bag.y}%`,
          width: `${bagBox.width}px`,
          height: `${bagBox.height}px`,
        }}
      >
        <div
          className="bag-layer__item"
          role="button"
          tabIndex={0}
          aria-label="가방 위치 옮기기"
          onPointerDown={onBagPointerDown}
          onPointerMove={moveBag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          onKeyDown={onBagKeyDown}
        >
          <ProductImage product={product} colorId={colorId} decorative />
        </div>
      </div>
    ) : null

  return (
    <div className="preview-stage-wrap">
      <div ref={stageRef} className="preview-stage">
        {mode === 'photo' && photoUrl ? (
          <div
            ref={figureRef}
            className={`preview-figure ${activeFigure.width ? 'is-sized' : ''}`}
            style={
              activeFigure.width
                ? { width: activeFigure.width, height: activeFigure.height }
                : { width: '100%', height: '100%' }
            }
          >
            <img
              ref={photoRef}
              src={photoUrl}
              alt="업로드한 전신 사진"
              className="preview-photo"
              onLoad={onPhotoReady}
            />
            {bagBehind ? bagNode : null}
            {activeAnalysis?.mask ? (
              <canvas ref={cutoutRef} className="preview-cutout" aria-hidden="true" />
            ) : null}
            {!bagBehind ? bagNode : null}
            {status === 'loading' ? (
              <p className="preview-status">이 기기에서 자세를 읽는 중</p>
            ) : null}
          </div>
        ) : null}
        {mode === 'silhouette' ? (
          <div ref={figureRef} className="preview-figure is-full">
            <SilhouetteAvatar
              svgRef={silhouetteRef}
              heightCm={body.heightCm}
              build={body.build}
              sex={body.sex}
            />
            {bagNode}
          </div>
        ) : null}
        {mode === 'photo' && !photoUrl ? (
          <button type="button" className="preview-empty" onClick={onUploadClick}>
            <strong>내 전신 사진을 올려 주세요</strong>
            <span>이 기기에서 자세를 읽어, 가방을 어깨·손·허리에 올립니다.</span>
          </button>
        ) : null}
        <p className="preview-sticker">미리보기</p>
      </div>
      {status === 'fallback' ? (
        <p className="preview-hint">자세를 찾지 못했습니다. 가방을 직접 옮겨 주세요.</p>
      ) : null}
      {showBag && status !== 'fallback' ? (
        <p className="preview-hint">
          {status === 'ready'
            ? '자세에 맞춰 올렸습니다. 위치를 살짝 옮겨도 됩니다.'
            : '가방을 눌러 원하는 위치로 옮기세요'}
        </p>
      ) : null}
    </div>
  )
}

function SilhouetteAvatar({
  svgRef,
  heightCm,
  build,
  sex,
}: {
  svgRef: Ref<SVGSVGElement>
  heightCm: number
  build: BodyProfile['build']
  sex: BodyProfile['sex']
}) {
  const widthScale = build === 'slim' ? 0.82 : build === 'broad' ? 1.18 : 1
  const heightScale = heightCm / HEIGHT_MAX_CM
  const female = sex === 'female'

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 160 280"
      preserveAspectRatio="xMidYMid meet"
      className={`silhouette${female ? ' is-female' : ' is-male'}`}
      aria-hidden="true"
    >
      <ellipse cx="80" cy="268" rx="36" ry="6" className="silhouette-ground" />
      <g
        transform={`translate(80 262) scale(${widthScale} ${heightScale}) translate(-80 -262)`}
      >
        {female ? (
          <>
            <ellipse cx="80" cy="33" rx="15" ry="17" />
            <rect x="75.5" y="47" width="9" height="16" rx="4" />
            <path d="M58 64C56 80 68 90 71 102C74 116 62 128 60 144h40C98 128 86 116 89 102C92 90 104 80 102 64c-8-8-32-8-44 0Z" />
            <path d="M58 72c-12 14-17 38-15 62 3 3 8 0 8-7 0-18 5-40 13-52Z" />
            <path d="M102 72c12 14 17 38 15 62-3 3-8 0-8-7 0-18-5-40-13-52Z" />
            <path d="M64 144 57 254h14l5-110Z" />
            <path d="M96 144 103 254H89l-5-110Z" />
          </>
        ) : (
          <>
            <ellipse cx="80" cy="34" rx="17" ry="19" />
            <rect x="74" y="50" width="12" height="12" rx="4" />
            <path d="M54 66c-2 18-4 48 2 78h48c6-30 4-60 2-78-8-8-36-8-52 0Z" />
            <path d="M54 74c-14 12-22 42-20 70 4 3 10 0 10-8 0-24 6-48 16-60Z" />
            <path d="M106 74c14 12 22 42 20 70-4 3-10 0-10-8 0-24-6-48-16-60Z" />
            <path d="M62 144 54 254h16l8-110Z" />
            <path d="M98 144 106 254H90l-8-110Z" />
          </>
        )}
      </g>
    </svg>
  )
}
