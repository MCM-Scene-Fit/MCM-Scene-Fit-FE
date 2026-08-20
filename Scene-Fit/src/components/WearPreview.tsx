import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  analyzeBody,
  assessPoseQuality,
  drawPersonCutout,
  readSceneTone,
  type BodyAnalysis,
} from '../lib/bodyAnalysis'
import { bagBoxPx, containedSize, personHeightPx } from '../lib/previewFit'
import { SILHOUETTE_ANCHOR_VIEW, wearAnchorFromPose, type StrapPoint } from '../lib/wearAnchor'
import { getColor } from '../data/products'
import type { SceneTone } from '../lib/personMask'
import type { BodyProfile, PreviewMode, Product, WearStyle } from '../types'
import { HumanSilhouette } from './HumanSilhouette'
import { ProductImage } from './ProductImage'
import { SceneProgress } from './SceneProgress'

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
  onCameraClick: () => void
  /** 장면 배경 이미지. 실제 사진 모드에서만 쓴다 — 원본 사진 배경을 이걸로 바꾼다. */
  backgroundUrl?: string | null
  /** 사진이 없을 때 쓸, 키·체형으로 만든 AI 인물 이미지. 실제 사진과 같은 파이프라인을 탄다. */
  portraitUrl?: string | null
  /** 배경·AI 인물을 만드는 중이면 true. 15~20초 걸릴 수 있어 표시해 준다. */
  sceneLoading?: boolean
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

function viewPointToPercent(point: StrapPoint, matrix: DOMMatrix, box: DOMRect): StrapPoint {
  const mapped = new DOMPoint(point.x, point.y).matrixTransform(matrix)
  return {
    x: ((mapped.x - box.left) / box.width) * 100,
    y: ((mapped.y - box.top) / box.height) * 100,
  }
}

function footYNorm(landmarks: BodyAnalysis['landmarks']) {
  const feet = [29, 30, 31, 32, 27, 28]
    .map((index) => landmarks[index])
    .filter((point): point is NonNullable<(typeof landmarks)[number]> =>
      Boolean(point && point.visibility > 0.2),
    )
  if (!feet.length) return null
  return Math.max(...feet.map((point) => point.y))
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
  onCameraClick,
  backgroundUrl,
  portraitUrl,
  sceneLoading,
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
  const [sceneTone, setSceneTone] = useState<{ url: string; tone: SceneTone | null } | null>(null)

  // 실제 업로드 사진이 없으면, 준비된 AI 인물 이미지를 "사진"처럼 취급한다.
  // 실루엣 전용 좌표 계산이 따로 필요 없다 — 실제 사진과 같은 자세 인식 파이프라인을 그대로 탄다.
  const effectivePhotoUrl = photoUrl ?? (mode === 'silhouette' ? (portraitUrl ?? null) : null)
  const isPhotoLike = Boolean(effectivePhotoUrl)
  const usingFlatSilhouette = mode === 'silhouette' && !effectivePhotoUrl

  const activeAnalysis =
    isPhotoLike && analysis?.url === effectivePhotoUrl ? analysis.body : null
  // 실제 업로드 사진에서만 확인한다 — AI 인물은 우리가 프롬프트로 자세를 이미 정했다.
  const poseWarning =
    activeAnalysis && photoUrl ? assessPoseQuality(activeAnalysis.landmarks) : null
  const status =
    !isPhotoLike
      ? 'idle'
      : loadingUrl === effectivePhotoUrl
        ? 'loading'
        : failedUrl === effectivePhotoUrl
          ? 'fallback'
          : activeAnalysis
            ? 'ready'
            : 'idle'
  const activeFigure =
isPhotoLike && figure.url === effectivePhotoUrl ? figure : EMPTY_BOX
const bagBox = isPhotoLike ? photoBagBox : silhouetteBagBox
const showBag = usingFlatSilhouette || isPhotoLike
const bagBehind = usingFlatSilhouette
  ? SILHOUETTE_ANCHOR_VIEW[wearStyle].behindPerson
  : Boolean(
      activeAnalysis && wearAnchorFromPose(wearStyle, activeAnalysis.landmarks).behindPerson,
    )
const color = getColor(product, colorId)

  const measureBag = useEffectEvent(() => {
    const stage = stageRef.current
    if (!stage) return

    if (isPhotoLike) {
      const photo = photoRef.current
      if (!photo || photo.naturalWidth <= 0 || !effectivePhotoUrl) return

      const nextFigure = containedSize(
        photo.naturalWidth,
        photo.naturalHeight,
        stage.clientWidth,
        stage.clientHeight,
      )
      setFigure((prev) =>
        prev.url === effectivePhotoUrl && sameBox(prev, nextFigure)
          ? prev
          : { url: effectivePhotoUrl, width: nextFigure.width, height: nextFigure.height },
      )

      const ratio = analysis?.url === effectivePhotoUrl ? analysis.body.personHeightRatio : null
      const avatarPx = nextFigure.height * (ratio ?? 0.9)
      if (avatarPx <= 0) return
      const nextBox = bagBoxPx(
        product,
        avatarPx,
        body.heightCm,
        color.imageWidth,
        color.imageHeight,
      )
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
    const nextBox = bagBoxPx(
      product,
      avatarPx,
      body.heightCm,
      color.imageWidth,
      color.imageHeight,
    )
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
}, [isPhotoLike, effectivePhotoUrl, product, colorId, body.heightCm, activeAnalysis])

useEffect(() => {
  if (usingFlatSilhouette) {
    const place = () => {
      const view = SILHOUETTE_ANCHOR_VIEW[wearStyle]
      const svg = silhouetteRef.current
      const figure = figureRef.current
      const group = svg?.querySelector('g')
      const matrix = group?.getScreenCTM()
      const box = figure?.getBoundingClientRect()
      if (!matrix || !box || box.width <= 0 || box.height <= 0) return false
      const toPct = (point: StrapPoint) => viewPointToPercent(point, matrix, box)
      onBagChange(toPct(view))
      return true
    }

    const observer = new ResizeObserver(() => {
      place()
    })
    if (silhouetteRef.current) observer.observe(silhouetteRef.current)
    if (figureRef.current) observer.observe(figureRef.current)

    if (place()) {
      return () => observer.disconnect()
    }

    let attempts = 0
    let frame = 0
    const retry = () => {
      attempts += 1
      if (place() || attempts > 24) return
      frame = requestAnimationFrame(retry)
    }
    frame = requestAnimationFrame(retry)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }
  if (!activeAnalysis) return
  const anchor = wearAnchorFromPose(wearStyle, activeAnalysis.landmarks)
  onBagChange({
    x: clamp(anchor.x, BAG_X_MIN, BAG_X_MAX),
    y: clamp(anchor.y, BAG_Y_MIN, BAG_Y_MAX),
  })
}, [usingFlatSilhouette, wearStyle, activeAnalysis, body.heightCm, body.build, body.sex, onBagChange])

// 배경 톤을 미리 읽어 둔다. 인물을 이 톤에 맞춰야 붙여넣은 느낌이 사라진다.
useEffect(() => {
  if (!backgroundUrl) return
  let cancelled = false
  void readSceneTone(backgroundUrl).then((tone) => {
    if (!cancelled) setSceneTone({ url: backgroundUrl, tone })
  })
  return () => {
    cancelled = true
  }
}, [backgroundUrl])

// 배경이 바뀌는 순간에는 이전 톤을 쓰지 않는다.
const activeTone =
  sceneTone && backgroundUrl && sceneTone.url === backgroundUrl ? sceneTone.tone : null
  useEffect(() => {
    const canvas = cutoutRef.current
    const photo = photoRef.current
    if (!canvas || !photo || !activeAnalysis?.mask) return
    // 배경을 실제로 갈아 끼울 때만 색감을 맞춘다.
    const grading = Boolean(photoUrl) && Boolean(backgroundUrl) ? activeTone : null
    drawPersonCutout(
      canvas,
      photo,
      activeAnalysis.mask,
      grading,
      footYNorm(activeAnalysis.landmarks),
    )
  }, [activeAnalysis, isPhotoLike, effectivePhotoUrl, photoUrl, backgroundUrl, activeTone])

  const onPhotoReady = () => {
    const photo = photoRef.current
    if (!photo || !effectivePhotoUrl) return

    // 같은 사진은 다시 분석하지 않아, 실루엣 왕복 후 비율이 흔들리지 않게 한다.
    if (analysis?.url === effectivePhotoUrl) return

    const url = effectivePhotoUrl
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
        {/* 가방 밑에 옅은 접촉 그림자. 없으면 몸 위에 붙여넣은 스티커처럼 보인다. */}
        <div className="bag-layer__contact" aria-hidden="true" />
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

  // 배경을 새 장면으로 바꾸려면 사람만 오려낸 캔버스가 준비돼 있어야 한다.
  // 준비 전에 바꾸면 원본 사진 배경이 잠깐 사라져 보인다. AI 인물 이미지는 이미 배경까지
  // 포함해서 그려지므로 따로 배경을 씌우지 않는다.
  const showSceneBackground = Boolean(photoUrl) && Boolean(backgroundUrl) && Boolean(activeAnalysis?.mask)
  const isAiPortrait = !photoUrl && Boolean(portraitUrl) && effectivePhotoUrl === portraitUrl
  // 실루엣은 사람 인식이 필요 없다 — 배경만 있으면 바로 뒤에 깐다.
  const showSilhouetteBackground = usingFlatSilhouette && Boolean(backgroundUrl)

  // 원본 사진은 사람이 프레임을 꽉 채우게 찍히지만, AI 배경은 몇 미터 떨어져서 찍은 듯한
  // 거리감으로 만들어진다. 그대로 겹치면 사람이 배경보다 훨씬 커 보인다. 배경 위에서
  // 사람이 차지할 목표 비율(TARGET_PERSON_RATIO)에 맞춰 실제 사람 비율만큼 축소한다.
  const TARGET_PERSON_RATIO = 0.6
  const backgroundPersonScale =
    showSceneBackground && activeAnalysis
      ? clamp(TARGET_PERSON_RATIO / Math.max(activeAnalysis.personHeightRatio, 0.3), 0.35, 1)
      : 1

  return (
    <div className="preview-stage-wrap">
      <div ref={stageRef} className="preview-stage">
        {isPhotoLike ? (
          <div
            ref={figureRef}
            className={`preview-figure ${activeFigure.width ? 'is-sized' : ''}`}
            style={
              activeFigure.width
                ? { width: activeFigure.width, height: activeFigure.height }
                : { width: '100%', height: '100%' }
            }
          >
            {showSceneBackground ? (
              <img src={backgroundUrl ?? ''} alt="" className="scene-background" aria-hidden="true" />
            ) : null}
            <div
              className="person-group"
              style={
                showSceneBackground
                  ? { transform: `scale(${backgroundPersonScale})`, transformOrigin: 'bottom center' }
                  : undefined
              }
            >
              <img
                ref={photoRef}
                src={effectivePhotoUrl ?? ''}
                alt={isAiPortrait ? 'AI가 키·체형으로 만든 인물 이미지' : '업로드한 전신 사진'}
                className={`preview-photo ${showSceneBackground ? 'is-swapped' : ''}`}
                onLoad={onPhotoReady}
              />
              {bagBehind ? bagNode : null}
              {activeAnalysis?.mask ? (
                <canvas
                  ref={cutoutRef}
                  className={`preview-cutout ${showSceneBackground ? 'is-swapped' : ''}`}
                  aria-hidden="true"
                />
              ) : null}
              {!bagBehind ? bagNode : null}
            </div>
            {showSceneBackground ? <div className="scene-blend" aria-hidden="true" /> : null}
            {isAiPortrait ? <p className="preview-ai-badge">AI 생성 이미지</p> : null}
            {sceneLoading ? <SceneProgress /> : null}
            {status === 'loading' ? (
              <p className="preview-status">이 기기에서 자세를 읽는 중</p>
            ) : null}
          </div>
        ) : null}
        {usingFlatSilhouette ? (
          <div ref={figureRef} className="preview-figure is-full">
            {showSilhouetteBackground ? (
              <img src={backgroundUrl ?? ''} alt="" className="scene-background" aria-hidden="true" />
            ) : null}
            {bagBehind ? bagNode : null}
            <HumanSilhouette
              svgRef={silhouetteRef}
              heightCm={body.heightCm}
              build={body.build}
              tone={showSilhouetteBackground ? 'solid' : 'dark'}
              align="bottom"
              showGround
            />
            {!bagBehind ? bagNode : null}
            {sceneLoading ? <SceneProgress /> : null}
          </div>
        ) : null}
        {mode === 'photo' && !photoUrl ? (
          <div className="preview-empty">
            <strong>내 전신 사진을 올려 주세요</strong>
            <span>이 기기에서 자세를 읽어, 가방을 어깨·손·허리에 올립니다.</span>
            <div className="preview-empty__actions">
              <button type="button" className="btn btn-primary" onClick={onUploadClick}>
                사진 올리기
              </button>
              <button type="button" className="btn btn-ghost" onClick={onCameraClick}>
                카메라로 찍기
              </button>
            </div>
          </div>
        ) : null}
        <p className="preview-sticker">미리보기</p>
      </div>
      {status === 'fallback' ? (
        <p className="preview-hint">자세를 찾지 못했습니다. 가방을 직접 옮겨 주세요.</p>
      ) : null}
      {status === 'ready' && poseWarning ? (
        <p className="preview-hint preview-hint--warn">{poseWarning}</p>
      ) : null}
      {showBag && status !== 'fallback' && !poseWarning ? (
        <p className="preview-hint">
          {status === 'ready'
            ? '자세에 맞춰 올렸습니다. 위치를 살짝 옮겨도 됩니다.'
            : '가방을 눌러 원하는 위치로 옮기세요'}
        </p>
      ) : null}
    </div>
  )
}

