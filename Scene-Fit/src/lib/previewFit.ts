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
 * screenBag = officialMm * photoPersonPx / myHeightMm
 */
export function bagBoxPx(product: Product, photoPersonPx: number, myHeightCm: number) {
  const myHeightMm = Math.max(myHeightCm, 1) * 10
  return {
    width: Math.max(8, Math.round((product.widthMm * photoPersonPx) / myHeightMm)),
    height: Math.max(8, Math.round((product.heightMm * photoPersonPx) / myHeightMm)),
  }
}
