import { Shape } from 'three'
import type { PackBag } from './packLayout'

export type BagFace = {
  x: number
  y: number
  width: number
  height: number
}

export type BagBodyUv = {
  x: number
  y: number
  w: number
  h: number
}

export type BagPhotoLayout = {
  widthPct: number
  heightPct: number
  leftPct: number
  topPct: number
}

export type BagSilhouette = {
  body: Shape
  canvas: HTMLCanvasElement
  face: BagFace
  bodyUv: BagBodyUv
  photoLayout: BagPhotoLayout
}

export type SideProfile = {
  canvas: HTMLCanvasElement
  face: BagFace
  depths: number[]
  yTop: number
  yBottom: number
}

const MAX_TRACE = 180
const MAX_TEXTURE = 720
const ALPHA_CUT = 18
const WHITE_CUT = 248

type Point = { x: number; y: number }
type Bounds = { minX: number; minY: number; maxX: number; maxY: number }

const RING: readonly [number, number][] = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
]

function hasTransparency(data: Uint8ClampedArray) {
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) return true
  }
  return false
}

function isSolid(data: Uint8ClampedArray, index: number, cutWhite: boolean) {
  const alpha = data[index + 3]
  if (alpha < ALPHA_CUT) return false
  if (!cutWhite) return true
  return !(data[index] >= WHITE_CUT && data[index + 1] >= WHITE_CUT && data[index + 2] >= WHITE_CUT)
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Could not load ${url}`))
    image.src = url
  })
}

function drawScaled(image: HTMLImageElement, maxW: number) {
  const scale = Math.min(1, maxW / Math.max(image.naturalWidth, 1))
  const width = Math.max(12, Math.round(image.naturalWidth * scale))
  const height = Math.max(12, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('2d context unavailable')
  context.drawImage(image, 0, 0, width, height)
  return { canvas, context, width, height }
}

function binaryMask(data: Uint8ClampedArray, width: number, height: number, cutWhite: boolean) {
  const mask = new Uint8Array(width * height)
  for (let i = 0; i < mask.length; i += 1) {
    mask[i] = isSolid(data, i * 4, cutWhite) ? 1 : 0
  }
  return mask
}

function maskBounds(mask: Uint8Array, width: number, height: number): Bounds | null {
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  if (maxX < minX) return null
  return { minX, minY, maxX, maxY }
}

function atMask(mask: Uint8Array, width: number, height: number, x: number, y: number) {
  if (x < 0 || y < 0 || x >= width || y >= height) return false
  return mask[y * width + x] === 1
}

function largestBlob(mask: Uint8Array, width: number, height: number) {
  const seen = new Uint8Array(mask.length)
  const out = new Uint8Array(mask.length)
  let best: number[] = []
  const stack: number[] = []

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || seen[start]) continue
    stack.length = 0
    stack.push(start)
    seen[start] = 1
    const cells: number[] = []
    while (stack.length) {
      const cur = stack.pop()
      if (cur === undefined) break
      cells.push(cur)
      const x = cur % width
      const y = (cur - x) / width
      for (const [dx, dy] of RING) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
        const next = ny * width + nx
        if (!mask[next] || seen[next]) continue
        seen[next] = 1
        stack.push(next)
      }
    }
    if (cells.length > best.length) best = cells
  }

  for (const index of best) out[index] = 1
  return out
}

function erode(mask: Uint8Array, width: number, height: number, radius: number) {
  const out = new Uint8Array(mask.length)
  for (let y = radius; y < height - radius; y += 1) {
    for (let x = radius; x < width - radius; x += 1) {
      let keep = true
      for (let dy = -radius; dy <= radius && keep; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (mask[(y + dy) * width + (x + dx)]) continue
          keep = false
          break
        }
      }
      out[y * width + x] = keep ? 1 : 0
    }
  }
  return out
}

function dilate(mask: Uint8Array, width: number, height: number, radius: number) {
  const out = new Uint8Array(mask.length)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          out[ny * width + nx] = 1
        }
      }
    }
  }
  return out
}

function wideRows(mask: Uint8Array, width: number, height: number) {
  const rowW = new Array<number>(height).fill(0)
  let maxW = 0
  for (let y = 0; y < height; y += 1) {
    let count = 0
    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x]) count += 1
    }
    rowW[y] = count
    if (count > maxW) maxW = count
  }
  const thresh = Math.max(4, maxW * 0.4)
  const out = new Uint8Array(mask.length)
  for (let y = 0; y < height; y += 1) {
    if (rowW[y] < thresh) continue
    const row = y * width
    for (let x = 0; x < width; x += 1) out[row + x] = mask[row + x]
  }
  return out
}

function bodyMask(full: Uint8Array, width: number, height: number) {
  const wide = largestBlob(wideRows(full, width, height), width, height)
  const radius = Math.max(2, Math.round(Math.min(width, height) * 0.022))
  const opened = largestBlob(dilate(erode(wide, width, height, radius), width, height, radius), width, height)
  const openedCount = opened.reduce((sum, bit) => sum + bit, 0)
  const wideCount = wide.reduce((sum, bit) => sum + bit, 0)
  const source = openedCount >= wideCount * 0.55 ? opened : wide
  const sourceCount = source.reduce((sum, bit) => sum + bit, 0)
  const fullCount = full.reduce((sum, bit) => sum + bit, 0)
  return sourceCount >= Math.max(24, fullCount * 0.28) ? source : full
}

function traceOuter(mask: Uint8Array, width: number, height: number, start: Point) {
  const path: Point[] = [{ x: start.x, y: start.y }]
  let x = start.x
  let y = start.y
  let dir = 0
  const limit = width * height * 2

  for (let step = 0; step < limit; step += 1) {
    let found = false
    for (let offset = 0; offset < 8; offset += 1) {
      const nextDir = (dir + 6 + offset) % 8
      const nx = x + RING[nextDir][0]
      const ny = y + RING[nextDir][1]
      if (!atMask(mask, width, height, nx, ny)) continue
      x = nx
      y = ny
      dir = nextDir
      found = true
      break
    }
    if (!found) break
    if (x === start.x && y === start.y && path.length > 8) break
    path.push({ x, y })
  }

  return path
}

function firstSolid(mask: Uint8Array, width: number, height: number, bounds: Bounds) {
  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      if (atMask(mask, width, height, x, y)) return { x, y }
    }
  }
  return null
}

function perpendicularDistance(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y)
  }
  return Math.abs(dy * point.x - dx * point.y + end.x * start.y - end.y * start.x) / Math.hypot(dx, dy)
}

function simplify(points: Point[], epsilon: number): Point[] {
  if (points.length < 8) return points
  let maxDist = 0
  let index = 0
  const end = points.length - 1
  for (let i = 1; i < end; i += 1) {
    const dist = perpendicularDistance(points[i], points[0], points[end])
    if (dist > maxDist) {
      index = i
      maxDist = dist
    }
  }
  if (maxDist <= epsilon) return [points[0], points[end]]
  const left = simplify(points.slice(0, index + 1), epsilon)
  const right = simplify(points.slice(index), epsilon)
  return [...left.slice(0, -1), ...right]
}

function chaikin(points: Point[], rounds = 2) {
  let ring = points
  for (let round = 0; round < rounds; round += 1) {
    const next: Point[] = []
    for (let i = 0; i < ring.length; i += 1) {
      const a = ring[i]
      const b = ring[(i + 1) % ring.length]
      next.push(
        { x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 },
        { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 },
      )
    }
    ring = next
  }
  return ring
}

function signedArea(points: Point[]) {
  let area = 0
  for (let i = 0; i < points.length; i += 1) {
    const next = points[(i + 1) % points.length]
    area += points[i].x * next.y - next.x * points[i].y
  }
  return area / 2
}

function closeRing(path: Point[]) {
  if (path.length > 12 && path[0].x === path[path.length - 1].x && path[0].y === path[path.length - 1].y) {
    return path.slice(0, -1)
  }
  return path
}

function smoothContour(path: Point[]) {
  const ring = closeRing(path)
  const simple = simplify(ring, 1.05)
  if (simple.length < 8) return null
  return chaikin(simple, 2)
}

function uniformFit(body: Bounds, bag: PackBag) {
  const bw = Math.max(1, body.maxX - body.minX)
  const bh = Math.max(1, body.maxY - body.minY)
  const scale = Math.min(bag.widthMm / bw, bag.heightMm / bh)
  return {
    scale,
    bodyCx: (body.minX + body.maxX) / 2,
    bodyCy: (body.minY + body.maxY) / 2,
  }
}

function toMm(point: Point, body: Bounds, bag: PackBag) {
  const { scale, bodyCx, bodyCy } = uniformFit(body, bag)
  return {
    x: (point.x - bodyCx) * scale,
    y: -(point.y - bodyCy) * scale,
  }
}

function flattenBase(points: Point[], heightMm: number) {
  if (points.length < 8) return points
  let minY = Infinity
  for (const point of points) {
    if (point.y < minY) minY = point.y
  }
  const band = Math.max(6, heightMm * 0.07)
  let minX = Infinity
  let maxX = -Infinity
  for (const point of points) {
    if (point.y > minY + band) continue
    if (point.x < minX) minX = point.x
    if (point.x > maxX) maxX = point.x
  }
  const span = Math.max(maxX - minX, 1)
  return points.map((point) => {
    if (point.y > minY + band) return point
    const u = (point.x - minX) / span
    const flatten = u < 0.08 || u > 0.92 ? 0.4 : 0.9
    return { x: point.x, y: minY + (point.y - minY) * (1 - flatten) }
  })
}

function toShape(points: Point[], body: Bounds, bag: PackBag) {
  const mapped = flattenBase(
    points.map((point) => toMm(point, body, bag)),
    bag.heightMm,
  )
  if (signedArea(mapped) < 0) mapped.reverse()
  const shape = new Shape()
  mapped.forEach((point, index) => {
    if (index === 0) shape.moveTo(point.x, point.y)
    else shape.lineTo(point.x, point.y)
  })
  shape.closePath()
  return shape
}

function faceFromBounds(full: Bounds, body: Bounds, bag: PackBag): BagFace {
  const { scale, bodyCx, bodyCy } = uniformFit(body, bag)
  const cx = (full.minX + full.maxX) / 2
  const cy = (full.minY + full.maxY) / 2
  return {
    width: (full.maxX - full.minX) * scale,
    height: (full.maxY - full.minY) * scale,
    x: (cx - bodyCx) * scale,
    y: -(cy - bodyCy) * scale,
  }
}

function photoLayout(full: Bounds, body: Bounds, bag: PackBag): BagPhotoLayout {
  const { scale, bodyCx, bodyCy } = uniformFit(body, bag)
  const fullW = Math.max(1, full.maxX - full.minX)
  const fullH = Math.max(1, full.maxY - full.minY)
  const widthPct = (fullW * scale) / Math.max(bag.widthMm, 1)
  const heightPct = (fullH * scale) / Math.max(bag.heightMm, 1)
  const bodyU = (bodyCx - full.minX) / fullW
  const bodyV = (bodyCy - full.minY) / fullH
  return {
    widthPct,
    heightPct,
    leftPct: 0.5 - bodyU * widthPct,
    topPct: 0.5 - bodyV * heightPct,
  }
}

function bodyUv(full: Bounds, body: Bounds): BagBodyUv {
  const fullW = Math.max(1, full.maxX - full.minX)
  const fullH = Math.max(1, full.maxY - full.minY)
  return {
    x: (body.minX - full.minX) / fullW,
    y: (body.minY - full.minY) / fullH,
    w: Math.max(0.08, (body.maxX - body.minX) / fullW),
    h: Math.max(0.08, (body.maxY - body.minY) / fullH),
  }
}

function cropTexture(
  image: HTMLImageElement,
  bounds: Bounds,
  scaledW: number,
  scaledH: number,
) {
  const sx = image.naturalWidth / scaledW
  const sy = image.naturalHeight / scaledH
  const srcX = bounds.minX * sx
  const srcY = bounds.minY * sy
  const srcW = Math.max(1, (bounds.maxX - bounds.minX + 1) * sx)
  const srcH = Math.max(1, (bounds.maxY - bounds.minY + 1) * sy)
  const scale = Math.min(1, MAX_TEXTURE / Math.max(srcW, srcH))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(srcW * scale))
  canvas.height = Math.max(1, Math.round(srcH * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('2d context unavailable')
  context.drawImage(image, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height)
  return canvas
}

export async function bagSilhouetteFromImage(url: string, bag: PackBag): Promise<BagSilhouette> {
  const image = await loadImage(url)
  const scaled = drawScaled(image, MAX_TRACE)
  const pixels = scaled.context.getImageData(0, 0, scaled.width, scaled.height)
  const cutWhite = !hasTransparency(pixels.data)
  const full = binaryMask(pixels.data, scaled.width, scaled.height, cutWhite)
  const fullBox = maskBounds(full, scaled.width, scaled.height)
  if (!fullBox) throw new Error('empty silhouette')

  const body = bodyMask(full, scaled.width, scaled.height)
  const bodyBox = maskBounds(body, scaled.width, scaled.height) ?? fullBox
  const start = firstSolid(body, scaled.width, scaled.height, bodyBox)
  if (!start) throw new Error('no silhouette start')

  const raw = traceOuter(body, scaled.width, scaled.height, start)
  const contour = smoothContour(raw)
  if (!contour) throw new Error('silhouette too small')

  return {
    body: toShape(contour, bodyBox, bag),
    canvas: cropTexture(image, fullBox, scaled.width, scaled.height),
    face: faceFromBounds(fullBox, bodyBox, bag),
    bodyUv: bodyUv(fullBox, bodyBox),
    photoLayout: photoLayout(fullBox, bodyBox, bag),
  }
}

function uniformFitSide(body: Bounds, bag: PackBag) {
  const bw = Math.max(1, body.maxX - body.minX)
  const bh = Math.max(1, body.maxY - body.minY)
  const scale = Math.min(bag.depthMm / bw, bag.heightMm / bh)
  return {
    scale,
    bodyCx: (body.minX + body.maxX) / 2,
    bodyCy: (body.minY + body.maxY) / 2,
  }
}

export function sampleSideDepth(profile: SideProfile, y: number, fallback: number) {
  const span = profile.yTop - profile.yBottom
  if (span === 0 || profile.depths.length < 2) return fallback
  const t = (profile.yTop - y) / span
  const u = Math.max(0, Math.min(1, t)) * (profile.depths.length - 1)
  const index = Math.floor(u)
  const next = Math.min(index + 1, profile.depths.length - 1)
  const mix = u - index
  return profile.depths[index] * (1 - mix) + profile.depths[next] * mix
}

export async function bagSideFromImage(url: string, bag: PackBag): Promise<SideProfile> {
  const image = await loadImage(url)
  const scaled = drawScaled(image, MAX_TRACE)
  const pixels = scaled.context.getImageData(0, 0, scaled.width, scaled.height)
  const cutWhite = !hasTransparency(pixels.data)
  const full = binaryMask(pixels.data, scaled.width, scaled.height, cutWhite)
  const fullBox = maskBounds(full, scaled.width, scaled.height)
  if (!fullBox) throw new Error('empty side silhouette')

  const body = bodyMask(full, scaled.width, scaled.height)
  const bodyBox = maskBounds(body, scaled.width, scaled.height) ?? fullBox
  const { scale, bodyCy } = uniformFitSide(bodyBox, bag)
  const samples = 48
  const depths: number[] = []
  const bodyH = Math.max(1, bodyBox.maxY - bodyBox.minY)

  for (let i = 0; i < samples; i += 1) {
    const row = Math.round(bodyBox.minY + (i / (samples - 1)) * bodyH)
    let minX = scaled.width
    let maxX = -1
    if (row >= 0 && row < scaled.height) {
      const offset = row * scaled.width
      for (let x = 0; x < scaled.width; x += 1) {
        if (!body[offset + x]) continue
        if (x < minX) minX = x
        if (x > maxX) maxX = x
      }
    }
    depths.push(maxX >= minX ? Math.max(8, (maxX - minX) * scale) : 8)
  }

  const fullCy = (fullBox.minY + fullBox.maxY) / 2
  return {
    canvas: cropTexture(image, fullBox, scaled.width, scaled.height),
    face: {
      width: (fullBox.maxX - fullBox.minX) * scale,
      height: (fullBox.maxY - fullBox.minY) * scale,
      x: 0,
      y: -(fullCy - bodyCy) * scale,
    },
    depths,
    yTop: -(bodyBox.minY - bodyCy) * scale,
    yBottom: -(bodyBox.maxY - bodyCy) * scale,
  }
}
