import type { PreviewMode, Product } from '../types'

export const HEIGHT_MIN_CM = 145
export const HEIGHT_MAX_CM = 190

export const SILHOUETTE_VIEW = {
  width: 160,
  height: 280,
  figure: 239,
} as const

/** 사진 높이 대비 사람(머리~발) 세로 비율. 마스크·관절 분석 결과. */
const PHOTO_PERSON_FILL = 0.9

export function containedSize(
  contentWidth: number,
  contentHeight: number,
  boxWidth: number,
  boxHeight: number,
) {
  if (contentWidth <= 0 || contentHeight <= 0 || boxWidth <= 0 || boxHeight <= 0) {
    return { width: 0, height: 0 }
  }
  const scale = Math.min(boxWidth / contentWidth, boxHeight / contentHeight)
  return { width: contentWidth * scale, height: contentHeight * scale }
}

type PersonMeasure = {
  mode: PreviewMode
  heightCm: number
  stageHeight: number
  photo: HTMLImageElement | null
  silhouette: SVGSVGElement | null
  /** 사람만의 세로 비율(마스크/관절). 없으면 프레임 추정값을 쓴다. */
  personHeightRatio?: number | null
}

/** 화면 속 사람 픽셀 키. 사진에서는 사람 영역 비율 × 그려진 사진 높이. */
export function personHeightPx({
  mode,
  heightCm,
  stageHeight,
  photo,
  silhouette,
  personHeightRatio,
}: PersonMeasure) {
  if (mode === 'photo' && photo && photo.naturalWidth > 0 && photo.naturalHeight > 0) {
    const drawnHeight =
      photo.clientHeight ||
      containedSize(photo.naturalWidth, photo.naturalHeight, photo.clientWidth, photo.clientHeight)
        .height
    return drawnHeight * (personHeightRatio ?? PHOTO_PERSON_FILL)
  }

  if (mode === 'silhouette' && silhouette) {
    const drawn = containedSize(
      SILHOUETTE_VIEW.width,
      SILHOUETTE_VIEW.height,
      silhouette.clientWidth,
      silhouette.clientHeight,
    )
    const tallestPx = drawn.height * (SILHOUETTE_VIEW.figure / SILHOUETTE_VIEW.height)
    return tallestPx * (heightCm / HEIGHT_MAX_CM)
  }

  return stageHeight * 0.78 * (heightCm / HEIGHT_MAX_CM)
}

/**
 * 공식 치수 : 내 키 = 화면 가방 : 사진(또는 실루엣) 속 키
 * 정면 컷은 손잡이·스트랩을 포함해 가방 몸통보다 세로로 긴 경우가 많다.
 * 몸통 치수만으로 상자를 잡으면 contain이 사진을 더 줄여 가방이 실제보다 작아 보인다.
 * 사진 비율로 상자를 잡고, 가로·세로 공식 치수 중 더 큰 쪽이 줄어들지 않게 맞춘다.
 */
export function bagBoxPx(
  product: Product,
  photoPersonPx: number,
  myHeightCm: number,
  imageWidth?: number,
  imageHeight?: number,
) {
  const myHeightMm = Math.max(myHeightCm, 1) * 10
  const scale = photoPersonPx / myHeightMm
  const bodyW = Math.max(1, product.widthMm) * scale
  const bodyH = Math.max(1, product.heightMm) * scale
  const minPx = 24

  if (imageWidth && imageHeight && imageWidth > 0 && imageHeight > 0) {
    const imgAspect = imageWidth / imageHeight
    const byWidth = { width: bodyW, height: bodyW / imgAspect }
    const byHeight = { width: bodyH * imgAspect, height: bodyH }
    const box =
      byWidth.width * byWidth.height >= byHeight.width * byHeight.height ? byWidth : byHeight
    return {
      width: Math.max(minPx, Math.round(box.width)),
      height: Math.max(minPx, Math.round(box.height)),
    }
  }

  return {
    width: Math.max(minPx, Math.round(bodyW)),
    height: Math.max(minPx, Math.round(bodyH)),
  }
}
