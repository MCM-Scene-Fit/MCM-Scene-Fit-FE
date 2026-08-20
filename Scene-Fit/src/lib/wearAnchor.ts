import type { WearStyle } from '../types'
import type { PoseLandmark } from './bodyAnalysis'

export type WearAnchor = {
  x: number
  y: number
  behindPerson: boolean
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
    }
  }

  if (wear === 'shoulder') {
    const shoulder = useLeft ? leftShoulder : rightShoulder
    const outward = useLeft ? -0.03 : 0.03
    return {
      x: (shoulder.x + outward) * 100,
      y: (shoulder.y + 0.04) * 100,
      behindPerson: false,
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
    }
  }

  const hip = useLeft ? rightHip : leftHip
  return {
    x: hip.x * 100,
    y: hip.y * 100,
    behindPerson: false,
  }
}

export function silhouetteBagAnchor(wear: WearStyle): WearAnchor {
  if (wear === 'backpack') return { x: 42, y: 28, behindPerson: true }
  if (wear === 'tote') return { x: 18, y: 48, behindPerson: false }
  if (wear === 'shoulder') return { x: 26, y: 38, behindPerson: false }
  if (wear === 'long-strap') return { x: 22, y: 56, behindPerson: false }
  return { x: 58, y: 46, behindPerson: false }
}
