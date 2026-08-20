import { useEffect, useState } from 'react'

/**
 * 장면 생성은 15~20초 걸린다. 그동안 문구가 고정돼 있으면 멈춘 것처럼 보이므로,
 * 실제 진행 단계를 순서대로 보여 준다. 마지막 단계에서는 더 넘어가지 않고 머문다.
 */
const STAGES = ['장소를 고르는 중', '장면을 그리는 중', '거의 다 됐어요']
const STAGE_MS = 6000

export function SceneProgress() {
  const [stage, setStage] = useState(0)

  useEffect(() => {
    if (stage >= STAGES.length - 1) return
    const timer = setTimeout(() => setStage((value) => value + 1), STAGE_MS)
    return () => clearTimeout(timer)
  }, [stage])

  return (
    <p className="preview-status preview-status--progress" role="status">
      <span className="preview-status__dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {STAGES[stage]}
    </p>
  )
}
