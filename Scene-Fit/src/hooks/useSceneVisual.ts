import { useEffect, useState } from 'react'
import { isMockMode, postSceneBackground, postScenePortrait, toApiConditions } from '../api'
import type { BodyProfile, Conditions } from '../types'

export type SceneVisual = {
  concept: string | null
  description: string | null
  place: string | null
  /** 배경만 있는 장면 이미지. 사진 뒤나 실루엣 뒤, 어느 쪽이든 깐다. */
  backgroundUrl: string | null
  /** enablePortrait일 때만 — 사람까지 통째로 생성된 이미지. 실제 사진처럼 자세 인식을 태운다. */
  portraitUrl: string | null
  /** 지금 이 조건으로 생성 중인지. 15~20초 걸릴 수 있어 화면에 표시해야 한다. */
  loading: boolean
}

const EMPTY: SceneVisual = {
  concept: null,
  description: null,
  place: null,
  backgroundUrl: null,
  portraitUrl: null,
  loading: false,
}

function sceneKey(conditions: Conditions, hasPhoto: boolean, body: BodyProfile, enablePortrait: boolean) {
  const base = `${conditions.destination.trim().toLowerCase()}|${conditions.scene}|${conditions.mobility}|${conditions.wearStyle}|${[...conditions.items].sort().join(',')}`
  if (!hasPhoto && enablePortrait) return `portrait|${base}|${body.heightCm}|${body.build}|${body.sex}`
  return `bg|${base}`
}

/**
 * "도쿄, 10월" 같은 목적지 입력을 장면 컨셉 한 줄 + 배경 이미지로 만든다.
 * 사진이 있으면 그 사진 뒤에 깐다. 사진이 없으면 검정 실루엣 뒤에 깐다 — 실루엣 자체는
 * 항상 그대로 쓰고, 배경만 실제 장소로 바뀐다.
 * enablePortrait를 true로 주면 실루엣 대신 키·체형으로 만든 AI 인물을 쓴다
 * (endpoint·로직은 남아 있고, 기본값에서만 뺐다 — 비용과 사람 생성 품질 문제 때문).
 * 목적지가 없으면 아무것도 만들지 않는다 — 만들어낼 근거가 없다.
 */
export function useSceneVisual(
  conditions: Conditions,
  hasPhoto: boolean,
  body: BodyProfile,
  enablePortrait = false,
) {
  const [state, setState] = useState<{ key: string; visual: Omit<SceneVisual, 'loading'> } | null>(null)
  // 실패한 키를 기억해 둔다. 없으면 요청이 깨졌을 때 "만드는 중"이 영원히 남는다.
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const wantsPortrait = !hasPhoto && enablePortrait
  const key = sceneKey(conditions, hasPhoto, body, enablePortrait)
  const canBuild = !isMockMode() && Boolean(toApiConditions(conditions)?.destination)

  useEffect(() => {
    const payload = toApiConditions(conditions)
    if (isMockMode() || !payload || !payload.destination) return undefined
    if (state?.key === key || failedKey === key) return undefined

    let cancelled = false
    // 컨셉 문구는 배경/인물 응답에 같이 실려 온다 — 따로 부르지 않는다.
    const imagePromise = wantsPortrait
      ? postScenePortrait({ ...payload, heightCm: body.heightCm, build: body.build, sex: body.sex })
      : postSceneBackground(payload)

    void imagePromise
      .then((image) => {
        if (cancelled) return
        setState({
          key,
          visual: {
            concept: image?.concept ?? null,
            description: image?.description ?? null,
            place: image?.place ?? null,
            backgroundUrl: wantsPortrait ? null : (image?.url ?? null),
            portraitUrl: wantsPortrait ? (image?.url ?? null) : null,
          },
        })
      })
      .catch(() => {
        // 서버가 실패해도 실루엣만으로 결과 화면은 떠야 한다. 로딩 표시만 걷어 낸다.
        if (!cancelled) setFailedKey(key)
      })
    return () => {
      cancelled = true
    }
  }, [key, conditions, hasPhoto, wantsPortrait, body, state, failedKey])

  if (state?.key === key) return { ...state.visual, loading: false }
  return { ...EMPTY, loading: canBuild && failedKey !== key }
}
