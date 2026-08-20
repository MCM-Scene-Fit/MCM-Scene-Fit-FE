/**
 * 분할 마스크 다듬기. 여기 있는 함수들은 순수 계산이라 MediaPipe 없이도 돌아간다.
 *
 * 마스크를 그대로 쓰면 합성이 어색하다. 배경과 섞인 경계 픽셀이 밝은 후광으로 남고,
 * 사람 뒤에 있던 차·행인 조각이 같이 딸려 온다.
 */

/** 사람에서 떨어져 있는 조각(뒤에 선 사람, 차 등)을 버리고 가장 큰 덩어리만 남긴다. */
export function largestBlob(binary: Uint8Array, width: number, height: number): Uint8Array {
  const seen = new Uint8Array(binary.length)
  const stack: number[] = []
  let best: number[] = []

  for (let seed = 0; seed < binary.length; seed += 1) {
    if (!binary[seed] || seen[seed]) continue
    stack.length = 0
    stack.push(seed)
    seen[seed] = 1
    const blob: number[] = []
    while (stack.length) {
      const index = stack.pop() as number
      blob.push(index)
      const x = index % width
      const y = (index - x) / width
      const push = (n: number) => {
        if (binary[n] && !seen[n]) {
          seen[n] = 1
          stack.push(n)
        }
      }
      if (x > 0) push(index - 1)
      if (x < width - 1) push(index + 1)
      if (y > 0) push(index - width)
      if (y < height - 1) push(index + width)
    }
    if (blob.length > best.length) best = blob
  }

  const out = new Uint8Array(binary.length)
  for (const index of best) out[index] = 1
  return out
}

/** 반지름 r 만큼 깎아 낸다. 경계에는 배경색이 섞여 있어서, 남기면 밝은 후광이 된다. */
export function erode(
  binary: Uint8Array,
  width: number,
  height: number,
  r: number,
): Uint8Array {
  if (r <= 0) return binary
  const pass = (src: Uint8Array, horizontal: boolean) => {
    const dst = new Uint8Array(src.length)
    const outer = horizontal ? height : width
    const inner = horizontal ? width : height
    for (let a = 0; a < outer; a += 1) {
      for (let b = 0; b < inner; b += 1) {
        let keep = 1
        for (let d = -r; d <= r; d += 1) {
          const c = b + d
          // 화면 밖은 배경으로 본다. 가장자리에 붙은 마스크도 깎여야 한다.
          if (c < 0 || c >= inner) {
            keep = 0
            break
          }
          if (!src[horizontal ? a * width + c : c * width + a]) {
            keep = 0
            break
          }
        }
        dst[horizontal ? a * width + b : b * width + a] = keep
      }
    }
    return dst
  }
  return pass(pass(binary, true), false)
}

/** 침식의 반대. 깎아 낸 만큼 다시 부풀린다. */
export function dilate(
  binary: Uint8Array,
  width: number,
  height: number,
  r: number,
): Uint8Array {
  if (r <= 0) return binary
  const pass = (src: Uint8Array, horizontal: boolean) => {
    const dst = new Uint8Array(src.length)
    const outer = horizontal ? height : width
    const inner = horizontal ? width : height
    for (let a = 0; a < outer; a += 1) {
      for (let b = 0; b < inner; b += 1) {
        let hit = 0
        for (let d = -r; d <= r; d += 1) {
          const c = b + d
          if (c < 0 || c >= inner) continue
          if (src[horizontal ? a * width + c : c * width + a]) {
            hit = 1
            break
          }
        }
        dst[horizontal ? a * width + b : b * width + a] = hit
      }
    }
    return dst
  }
  return pass(pass(binary, true), false)
}

/** 마스크는 사진보다 훨씬 작다. 이웃 값을 섞어 계단 현상을 없앤다. */
export function bilinearSampler(map: Float32Array, width: number, height: number) {
  return (fx: number, fy: number) => {
    const x = Math.min(width - 1, Math.max(0, fx))
    const y = Math.min(height - 1, Math.max(0, fy))
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const x1 = Math.min(width - 1, x0 + 1)
    const y1 = Math.min(height - 1, y0 + 1)
    const tx = x - x0
    const ty = y - y0
    const top = map[y0 * width + x0] * (1 - tx) + map[y0 * width + x1] * tx
    const bottom = map[y1 * width + x0] * (1 - tx) + map[y1 * width + x1] * tx
    return top * (1 - ty) + bottom * ty
  }
}

export type SceneTone = {
  r: number
  g: number
  b: number
  /** 0~1. 배경의 평균 밝기. */
  luma: number
}

/** 배경 사진의 평균 색과 밝기. 인물을 이 톤에 맞춰야 같이 찍은 사진처럼 보인다. */
export function sceneToneFromPixels(data: Uint8ClampedArray): SceneTone | null {
  let r = 0
  let g = 0
  let b = 0
  let count = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
    count += 1
  }
  if (!count) return null
  r /= count
  g /= count
  b /= count
  return { r, g, b, luma: (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 }
}

/**
 * 인물 픽셀을 배경 톤 쪽으로 끌어당긴다.
 * 색을 통째로 덮으면 인물이 납작해지므로, 색조만 옮기고 밝기 차이는 일부만 좁힌다.
 */
export function gradeTowardScene(
  pixels: Uint8ClampedArray,
  tone: SceneTone,
  strength = 0.22,
) {
  let personLuma = 0
  let count = 0
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 8) continue
    personLuma += 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]
    count += 1
  }
  if (!count) return
  personLuma /= count * 255

  // 밝기 차이는 절반만 좁힌다. 완전히 맞추면 입체감이 사라진다.
  const exposure = personLuma > 0.01 ? 1 + (tone.luma / personLuma - 1) * 0.5 : 1
  const safeExposure = Math.min(1.35, Math.max(0.75, exposure))

  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 8) continue
    pixels[i] = Math.min(255, (pixels[i] * (1 - strength) + tone.r * strength) * safeExposure)
    pixels[i + 1] = Math.min(255, (pixels[i + 1] * (1 - strength) + tone.g * strength) * safeExposure)
    pixels[i + 2] = Math.min(255, (pixels[i + 2] * (1 - strength) + tone.b * strength) * safeExposure)
  }
}

/** 0~1 사이를 부드럽게 잇는다. 딱 잘린 경계 대신 자연스러운 이음매를 만든다. */
function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/**
 * 사람만 남긴 알파 맵.
 *
 * 마스크를 0/1로 딱 잘라 깎으면 얇은 종아리·손가락이 통째로 사라지고 경계가 뭉툭해진다.
 * 반대로 원본 신뢰도 값을 계속 알파에 반영하면, 다리처럼 원래 신뢰도가 낮게 나오는
 * 부위 전체가 희미해져서 그림자를 두른 것처럼 보인다.
 *
 * 그래서 "어디까지가 사람인가"와 "경계선을 어떻게 그릴까"를 완전히 분리한다.
 *  - 사람 영역 안쪽(interior)은 원본 신뢰도와 무관하게 무조건 alpha=1.
 *  - 경계선 바로 그 폭만큼만 원본 신뢰도로 부드럽게 넘긴다 — 진짜 윤곽선만 다듬는다.
 */
export function buildAlphaMap(coverage: Float32Array, width: number, height: number) {
  const binary = new Uint8Array(width * height)
  for (let i = 0; i < binary.length; i += 1) binary[i] = (coverage[i] ?? 0) >= 0.5 ? 1 : 0

  // 떨어져 있는 조각은 물론, 손 근처에서 가늘게 이어진 물체(유모차·간판 등)도 끊어 낸다.
  // 깎았다가 도로 부풀리면 굵은 몸통은 살아남고 가는 연결만 끊긴다.
  const bridge = Math.max(1, Math.round(width / 128))
  const core = dilate(
    largestBlob(erode(binary, width, height, bridge), width, height),
    width,
    height,
    bridge,
  )

  // 경계 폭. 이 폭 밖은 무조건 1, 안은 무조건 0, 그 사이 얇은 테두리만 신뢰도로 넘긴다.
  const edge = 2
  const interior = erode(core, width, height, edge)
  const gate = dilate(core, width, height, edge)

  const alpha = new Float32Array(width * height)
  for (let i = 0; i < alpha.length; i += 1) {
    if (interior[i]) {
      alpha[i] = 1
    } else if (gate[i]) {
      // 0.5가 아니라 조금 안쪽에서 넘긴다 — 경계 픽셀에는 배경색이 섞여 있어 후광이 된다.
      alpha[i] = smoothstep(0.45, 0.72, coverage[i] ?? 0)
    }
  }
  return alpha
}
