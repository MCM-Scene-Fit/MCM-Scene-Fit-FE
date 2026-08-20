import type { Ref } from 'react'
import { HEIGHT_MAX_CM } from '../lib/previewFit'
import type { BodyProfile } from '../types'

/**
 * 선 하나로 쭉 이어지는 윤곽선. 겹치는 곡선이 없어서 채워도, 테두리만 그려도 안전하다.
 * 착용 미리보기의 검정 실루엣과 카메라 촬영 가이드가 이 도형 하나를 같이 쓴다.
 */
const OUTLINE_PATH = `
  M80 10
  C89 10 95 17 95 28
  C95 35 92 40 88 44
  C94 47 102 51 107 62
  C112 75 111 96 106 115
  C104 121 99 122 98 116
  C99 100 97 82 93 69
  C95 85 96 105 95 132
  C99 154 101 190 99 228
  C103 236 105 240 103 244
  C97 246 89 244 87 240
  C87 205 85 170 83 136
  C82 136 78 136 77 136
  C75 170 73 205 73 240
  C71 244 63 246 57 244
  C55 240 57 236 61 228
  C59 190 61 154 65 132
  C64 105 65 85 67 69
  C63 82 61 100 62 116
  C61 122 56 121 54 115
  C49 96 48 75 53 62
  C58 51 66 47 72 44
  C68 40 65 35 65 28
  C65 17 71 10 80 10
  Z
`

type HumanSilhouetteProps = {
  svgRef?: Ref<SVGSVGElement>
  heightCm: number
  build: BodyProfile['build']
  showGround?: boolean
  /**
   * dark: 착용 미리보기 배경(밝은 바탕)용, 가는 선.
   * ghost: 카메라 가이드(영상 위)용, 흰 선.
   * solid: 생성된 장소 사진 위에 세울 때. 가는 선은 배경에 묻혀서 꽉 채운다.
   */
  tone?: 'dark' | 'ghost' | 'solid'
}

export function HumanSilhouette({
  svgRef,
  heightCm,
  build,
  showGround = true,
  tone = 'dark',
}: HumanSilhouetteProps) {
  const widthScale = build === 'slim' ? 0.86 : build === 'broad' ? 1.14 : 1
  const heightScale = heightCm / HEIGHT_MAX_CM

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 160 280"
      preserveAspectRatio="xMidYMid meet"
      className={`silhouette silhouette--${tone}`}
      aria-hidden="true"
    >
      {showGround ? <ellipse cx="80" cy="268" rx="36" ry="6" className="silhouette-ground" /> : null}
      <g transform={`translate(80 262) scale(${widthScale} ${heightScale}) translate(-80 -262)`}>
        <path d={OUTLINE_PATH} />
      </g>
    </svg>
  )
}
