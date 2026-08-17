import { FilesetResolver, PoseLandmarker, type MPMask } from '@mediapipe/tasks-vision'

export type PoseLandmark = {
  x: number
  y: number
  visibility: number
}

export type PersonMask = {
  data: Float32Array
  width: number
  height: number
}

export type BodyAnalysis = {
  landmarks: PoseLandmark[]
  /** 사진 높이 대비 사람(머리~발) 세로 비율. 마스크 우선, 없으면 관절. */
  personHeightRatio: number
  mask: PersonMask | null
}

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'
const POSE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task'

const MASK_COVERAGE = 0.4
const MIN_PERSON_SPAN = 0.18

let landmarkerPromise: Promise<PoseLandmarker> | null = null

async function createLandmarker(delegate: 'GPU' | 'CPU') {
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE)
  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: POSE_MODEL,
      delegate,
    },
    runningMode: 'IMAGE',
    numPoses: 1,
    minPoseDetectionConfidence: 0.45,
    minPosePresenceConfidence: 0.45,
    outputSegmentationMasks: true,
  })
}

async function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = createLandmarker('GPU').catch(() => createLandmarker('CPU'))
  }
  return landmarkerPromise
}

function copyMask(mask: MPMask): PersonMask {
  const { width, height } = mask
  if (mask.hasFloat32Array()) {
    return { data: new Float32Array(mask.getAsFloat32Array()), width, height }
  }
  const bytes = mask.getAsUint8Array()
  const data = new Float32Array(bytes.length)
  const scale = bytes.some((value) => value > 1) ? 1 / 255 : 1
  for (let i = 0; i < bytes.length; i += 1) data[i] = bytes[i] * scale
  return { data, width, height }
}

function clampPersonSpan(span: number) {
  return Math.min(0.98, Math.max(0.35, span))
}

/** 사람 마스크에서 위~아래 픽셀로 키 비율을 잰다. 배경 여백을 제외한다. */
export function personHeightRatioFromMask(mask: PersonMask) {
  const { data, width, height } = mask
  if (width <= 0 || height <= 0) return null

  const minRowPixels = Math.max(2, Math.floor(width * 0.008))
  let top = -1
  let bottom = -1

  for (let y = 0; y < height; y += 1) {
    let covered = 0
    const row = y * width
    for (let x = 0; x < width; x += 1) {
      if ((data[row + x] ?? 0) >= MASK_COVERAGE) {
        covered += 1
        if (covered >= minRowPixels) break
      }
    }
    if (covered >= minRowPixels) {
      if (top < 0) top = y
      bottom = y
    }
  }

  if (top < 0 || bottom <= top) return null
  const span = (bottom - top + 1) / height
  if (span < MIN_PERSON_SPAN) return null
  return clampPersonSpan(span)
}

/** 관절(머리~발)로 키 비율을 잰다. 마스크가 없을 때 보조로 쓴다. */
export function personHeightRatioFromPose(landmarks: PoseLandmark[]) {
  const headCandidates = [0, 2, 5, 7, 8]
    .map((index) => landmarks[index])
    .filter((point): point is PoseLandmark => Boolean(point && point.visibility > 0.2))
    .map((point) => point.y)
  const footCandidates = [27, 28, 29, 30, 31, 32]
    .map((index) => landmarks[index])
    .filter((point): point is PoseLandmark => Boolean(point && point.visibility > 0.2))
    .map((point) => point.y)

  if (!headCandidates.length || !footCandidates.length) return 0.9
  const head = Math.min(...headCandidates)
  const foot = Math.max(...footCandidates)
  const span = foot - head
  if (span < MIN_PERSON_SPAN) return 0.9
  // 코·귀 기준이라 정수리·발바닥을 조금 보정한다.
  return clampPersonSpan(span * 1.08)
}

export function resolvePersonHeightRatio(
  landmarks: PoseLandmark[],
  mask: PersonMask | null,
) {
  if (mask) {
    const fromMask = personHeightRatioFromMask(mask)
    if (fromMask != null) return fromMask
  }
  return personHeightRatioFromPose(landmarks)
}

export async function analyzeBody(image: HTMLImageElement): Promise<BodyAnalysis | null> {
  const landmarker = await getLandmarker()
  const result = landmarker.detect(image)
  const pose = result.landmarks[0]
  if (!pose?.length) return null

  const landmarks = pose.map((point) => ({
    x: point.x,
    y: point.y,
    visibility: point.visibility ?? 0,
  }))

  const segmentation = result.segmentationMasks?.[0]
  const mask = segmentation ? copyMask(segmentation) : null
  return {
    landmarks,
    personHeightRatio: resolvePersonHeightRatio(landmarks, mask),
    mask,
  }
}

export function drawPersonCutout(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  mask: PersonMask,
) {
  const maxWidth = 720
  const scale = Math.min(1, maxWidth / Math.max(image.naturalWidth, 1))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return
  context.clearRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)
  const pixels = context.getImageData(0, 0, width, height)
  const { data, width: maskWidth, height: maskHeight } = mask

  for (let y = 0; y < height; y += 1) {
    const maskY = Math.min(maskHeight - 1, Math.floor((y / height) * maskHeight))
    for (let x = 0; x < width; x += 1) {
      const maskX = Math.min(maskWidth - 1, Math.floor((x / width) * maskWidth))
      const coverage = data[maskY * maskWidth + maskX] ?? 0
      const alpha = coverage > 0.55 ? 1 : coverage > 0.25 ? (coverage - 0.25) / 0.3 : 0
      const index = (y * width + x) * 4 + 3
      pixels.data[index] = Math.round(pixels.data[index] * alpha)
    }
  }
  context.putImageData(pixels, 0, 0)
}
