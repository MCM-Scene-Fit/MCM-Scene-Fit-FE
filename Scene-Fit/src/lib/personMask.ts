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

/** 알파를 살짝 번지게 해 자른 자국을 없앤다. */
export function featherAlpha(
  binary: Uint8Array,
  width: number,
  height: number,
  r: number,
): Float32Array {
  const src = Float32Array.from(binary)
  if (r <= 0) return src
  const window = r * 2 + 1
  const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value))

  const mid = new Float32Array(src.length)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0
      for (let d = -r; d <= r; d += 1) sum += src[y * width + clamp(x + d, width - 1)]
      mid[y * width + x] = sum / window
    }
  }

  const out = new Float32Array(src.length)
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      let sum = 0
      for (let d = -r; d <= r; d += 1) sum += mid[clamp(y + d, height - 1) * width + x]
      out[y * width + x] = sum / window
    }
  }
  return out
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

/** 확신이 높은 부분만 남기고 → 사람 덩어리만 골라내고 → 경계를 깎은 뒤 부드럽게 번지게 한다. */
export function buildAlphaMap(coverage: Float32Array, width: number, height: number) {
  // 0.6 이상만 사람으로 본다. 예전 기준(0.25)은 배경까지 사람으로 받아들였다.
  const binary = new Uint8Array(width * height)
  for (let i = 0; i < binary.length; i += 1) binary[i] = (coverage[i] ?? 0) >= 0.6 ? 1 : 0
  const radius = Math.max(1, Math.round(width / 220))
  return featherAlpha(erode(largestBlob(binary, width, height), width, height, radius), width, height, radius)
}
