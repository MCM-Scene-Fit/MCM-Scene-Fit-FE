import { useEffect, useState } from 'react'
import { isMockMode, postSceneConcept, toApiConditions } from '../api'
import type { Conditions } from '../types'

export type SceneConceptText = { concept: string; description: string } | null

function conceptKey(conditions: Conditions) {
  return `${conditions.destination.trim().toLowerCase()}|${conditions.scene}|${conditions.mobility}|${conditions.wearStyle}|${[...conditions.items].sort().join(',')}`
}

/**
 * 목적지 입력을 장면 컨셉 한 문장으로 만든다. 이미지는 안 만든다 — 배경·인물 생성은
 * 비용이 크므로 실제로 그 시각화가 화면에 쓰이는 곳(useSceneVisual)에서만 부른다.
 */
export function useSceneConcept(conditions: Conditions) {
  const [state, setState] = useState<{ key: string; concept: SceneConceptText } | null>(null)
  const key = conceptKey(conditions)

  useEffect(() => {
    const payload = toApiConditions(conditions)
    if (isMockMode() || !payload || !payload.destination) return undefined
    if (state?.key === key) return undefined

    let cancelled = false
    void postSceneConcept(payload).then((concept) => {
      if (cancelled) return
      setState({ key, concept })
    })
    return () => {
      cancelled = true
    }
  }, [key, conditions, state])

  return state?.key === key ? state.concept : null
}
