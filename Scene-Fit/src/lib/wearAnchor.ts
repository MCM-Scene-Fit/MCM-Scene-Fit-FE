import type { WearStyle } from '../types'
import type { PoseLandmark } from './bodyAnalysis'

export type StrapPoint = { x: number; y: number }

export type WearAnchor = {
  x: number
  y: number
  behindPerson: boolean
  /** 어깨에서 가방까지 그릴 끈의 시작점(들). 토트백은 손으로 드니 비워 둔다. */
  strapPoints: StrapPoint[]
}

function point(landmarks: PoseLandmark[], index: number): PoseLandmark {
  return landmarks[index] ?? { x: 0.5, y: 0.42, visibility: 0 }
}

function preferLeft(landmarks: PoseLandmark[]) {
  const left = point(landmarks, 11).visibility + point(landmarks, 15).visibility
  const right = point(landmarks, 12).visibility + point(landmarks, 16).visibility
  return left >= right
}

export function wearAnchorFromPose(wear: WearStyle, landmarks: PoseLandmark[]): WearAnchor {
  const leftShoulder = point(landmarks, 11)
  const rightShoulder = point(landmarks, 12)
  const leftWrist = point(landmarks, 15)
  const rightWrist = point(landmarks, 16)
  const leftHip = point(landmarks, 23)
  const rightHip = point(landmarks, 24)
  const useLeft = preferLeft(landmarks)

  if (wear === 'tote') {
    const wrist = useLeft ? leftWrist : rightWrist
    const hip = useLeft ? leftHip : rightHip
    const outward = useLeft ? -0.045 : 0.045
    return {
      x: (wrist.x + outward) * 100,
      y: Math.max(wrist.y, hip.y * 0.9) * 100,
      behindPerson: false,
      strapPoints: [],
    }
  }

  if (wear === 'shoulder') {
    const shoulder = useLeft ? leftShoulder : rightShoulder
    const outward = useLeft ? -0.03 : 0.03
    return {
      x: (shoulder.x + outward) * 100,
      y: (shoulder.y + 0.04) * 100,
      behindPerson: false,
      strapPoints: [{ x: shoulder.x * 100, y: shoulder.y * 100 }],
    }
  }

  if (wear === 'backpack') {
    return {
      x: ((leftShoulder.x + rightShoulder.x) / 2) * 100,
      y: ((leftShoulder.y + rightShoulder.y) / 2 + 0.02) * 100,
      behindPerson: true,
      strapPoints: [
        { x: leftShoulder.x * 100, y: leftShoulder.y * 100 },
        { x: rightShoulder.x * 100, y: rightShoulder.y * 100 },
      ],
    }
  }

  // crossbody: 반대쪽 어깨에서 대각선으로 내려와 반대쪽 엉덩이에 걸린다.
  const hip = useLeft ? rightHip : leftHip
  const shoulder = useLeft ? leftShoulder : rightShoulder
  return {
    x: hip.x * 100,
    y: hip.y * 100,
    behindPerson: false,
    strapPoints: [{ x: shoulder.x * 100, y: shoulder.y * 100 }],
  }
}

export function silhouetteBagAnchor(wear: WearStyle): WearAnchor {
  if (wear === 'backpack') return { x: 42, y: 28, behindPerson: true, strapPoints: [] }
  if (wear === 'tote') return { x: 18, y: 48, behindPerson: false, strapPoints: [] }
  if (wear === 'shoulder') return { x: 28, y: 34, behindPerson: false, strapPoints: [] }
  return { x: 58, y: 46, behindPerson: false, strapPoints: [] }
}

/**
 * 실루엣 아바타의 가방 고정점. SVG viewBox(160×280) 좌표다.
 * 화면 퍼센트가 아니라 몸 좌표라, 키를 바꿔 몸이 커져도 같은 부위에 붙는다.
 * 값은 가방의 위쪽 가운데(.bag-layer 가 translate(-50%,0) 이므로).
 */
// OUTLINE_PATH(HumanSilhouette.tsx)의 실제 어깨 꼭짓점 좌표다 — "C49 96 48 75 53 62"가
// 왼쪽 어깨 끝(53,62), 대칭인 오른쪽은 (107,62). 실루엣을 다시 그릴 때마다 여기도
// 같이 맞춰야 한다. 이전 값(58,70)은 몸통 안쪽으로 치우쳐 있어서 끈이 어깨가 아니라
// 목·가슴 쪽에서 시작하는 것처럼 보였다.
const SIL_LEFT_SHOULDER: StrapPoint = { x: 53, y: 62 }
const SIL_RIGHT_SHOULDER: StrapPoint = { x: 107, y: 62 }

export const SILHOUETTE_ANCHOR_VIEW: Record<WearStyle, WearAnchor> = {
  crossbody: { x: 103, y: 124, behindPerson: false, strapPoints: [SIL_LEFT_SHOULDER] },
  shoulder: { x: 50, y: 88, behindPerson: false, strapPoints: [SIL_LEFT_SHOULDER] },
  tote: { x: 42, y: 140, behindPerson: false, strapPoints: [] },
  backpack: { x: 80, y: 62, behindPerson: true, strapPoints: [SIL_LEFT_SHOULDER, SIL_RIGHT_SHOULDER] },
}
