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

  if (wear === 'long-strap') {
    const hip = useLeft ? leftHip : rightHip
    const outward = useLeft ? -0.045 : 0.045
    return {
      x: (hip.x + outward) * 100,
      y: hip.y * 0.9 * 100,
      behindPerson: false,
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
  if (wear === 'long-strap') return { x: 22, y: 56, behindPerson: false, strapPoints: [] }
  return { x: 58, y: 46, behindPerson: false, strapPoints: [] }
}

// 실루엣 아바타의 가방 기준점. SVG viewBox(160x280) 좌표다.
// 화면 %가 아니라 몸 좌표를 쓰면 키·체형이 바뀌어도 같은 부위에 남는다.
// 어깨 좌표는 HumanSilhouette.tsx의 OUTLINE_PATH에 맞춰, 스트랩이 목/가슴이 아니라 어깨에서 시작하게 했다.
const SIL_LEFT_SHOULDER: StrapPoint = { x: 53, y: 62 }
const SIL_RIGHT_SHOULDER: StrapPoint = { x: 107, y: 62 }

export const SILHOUETTE_ANCHOR_VIEW: Record<WearStyle, WearAnchor> = {
  crossbody: { x: 103, y: 124, behindPerson: false, strapPoints: [SIL_LEFT_SHOULDER] },
  shoulder: { x: 50, y: 88, behindPerson: false, strapPoints: [SIL_LEFT_SHOULDER] },
  tote: { x: 42, y: 140, behindPerson: false, strapPoints: [] },
  backpack: {
    x: 80,
    y: 62,
    behindPerson: true,
    strapPoints: [SIL_LEFT_SHOULDER, SIL_RIGHT_SHOULDER],
  },
  'long-strap': { x: 48, y: 156, behindPerson: false, strapPoints: [SIL_LEFT_SHOULDER] },
}
}
