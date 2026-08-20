/**
 * 마스크 다듬기 자체 검사. `npx tsx src/lib/personMask.test.ts`
 * 합성 품질이 여기 로직에 걸려 있어서, 깨지면 바로 알아채야 한다.
 */
import assert from 'node:assert'
import { buildAlphaMap, dilate, erode, largestBlob, stripFloorHalo, trimShadowSkirt } from './personMask'

const W = 12
const H = 8
const index = (x: number, y: number) => y * W + x

// 사람(왼쪽 4x5 덩어리) + 뒤에 있던 배경 조각(오른쪽 2x2)
const binary = new Uint8Array(W * H)
for (let y = 1; y <= 5; y += 1) for (let x = 1; x <= 4; x += 1) binary[index(x, y)] = 1
for (let y = 1; y <= 2; y += 1) for (let x = 9; x <= 10; x += 1) binary[index(x, y)] = 1

const kept = largestBlob(binary, W, H)
assert.equal(
  kept.reduce((a, b) => a + b, 0),
  20,
  '가장 큰 덩어리(20픽셀)만 남아야 한다',
)
assert.equal(kept[index(9, 1)], 0, '떨어져 있는 배경 조각은 지워져야 한다')
assert.equal(kept[index(2, 3)], 1, '사람 덩어리는 남아야 한다')

// 대각선으로만 닿은 조각은 이어진 것으로 보지 않는다(4방향 연결)
const diagonal = new Uint8Array(W * H)
diagonal[index(1, 1)] = 1
diagonal[index(1, 2)] = 1
diagonal[index(2, 3)] = 1
assert.equal(
  largestBlob(diagonal, W, H).reduce((a, b) => a + b, 0),
  2,
  '대각선 접촉은 별개 덩어리로 본다',
)

assert.equal(
  largestBlob(new Uint8Array(W * H), W, H).reduce((a, b) => a + b, 0),
  0,
  '전부 배경이면 빈 마스크',
)

// 침식은 테두리 한 겹을 깎는다: 4x5 -> 2x3
const eroded = erode(kept, W, H, 1)
assert.equal(
  eroded.reduce((a, b) => a + b, 0),
  6,
  '반지름 1로 깎으면 테두리 한 겹이 사라진다',
)
assert.equal(eroded[index(1, 1)], 0, '모서리는 깎여야 한다')
assert.equal(eroded[index(2, 3)], 1, '안쪽은 남아야 한다')

// 화면 끝에 붙은 마스크도 깎인다 — 안 깎으면 잘린 자국이 직선으로 남는다
const edge = new Uint8Array(W * H)
for (let y = 0; y < 3; y += 1) for (let x = 0; x < 3; x += 1) edge[index(x, y)] = 1
assert.equal(erode(edge, W, H, 1)[index(0, 0)], 0, '가장자리에 붙어 있어도 깎여야 한다')

// 부풀리기는 깎기를 되돌린다
assert.equal(
  dilate(eroded, W, H, 1).reduce((a, b) => a + b, 0),
  20,
  '깎은 만큼 부풀리면 원래 굵기로 돌아온다',
)

// 넓은 화면에서: 굵은 몸통 + 가는 다리 + 가늘게 이어진 물체
const BW = 260
const BH = 200
const at = (x: number, y: number) => y * BW + x
const wide = new Float32Array(BW * BH)
const paint = (x0: number, x1: number, y0: number, y1: number) => {
  for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) wide[at(x, y)] = 1
}
paint(60, 110, 20, 90) // 몸통
paint(70, 78, 91, 150) // 왼쪽 다리 (가늘다)
paint(92, 100, 91, 150) // 오른쪽 다리
paint(111, 113, 60, 62) // 손 근처 가는 연결
paint(114, 150, 45, 100) // 옆에 붙은 물체

const wideAlpha = buildAlphaMap(wide, BW, BH)
assert.ok(wideAlpha[at(85, 55)] > 0.9, '몸통은 남아야 한다')
assert.ok(wideAlpha[at(74, 140)] > 0.9, '가는 다리도 살아 있어야 한다')
assert.equal(wideAlpha[at(140, 70)], 0, '가늘게 이어진 옆 물체는 끊겨야 한다')
assert.ok(
  wideAlpha.every((value) => value >= 0 && value <= 1),
  '알파는 0~1 범위여야 한다',
)

// 다리처럼 원래 신뢰도가 낮게 나오는 부위: 몸통은 확신 높게(0.95), 다리는 낮게(0.55)
// — 예전 방식(원본 신뢰도를 그대로 씀)이면 다리 전체가 흐려져 그림자처럼 보였다.
const lowConfidence = new Float32Array(BW * BH)
const paintValue = (x0: number, x1: number, y0: number, y1: number, value: number) => {
  for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) lowConfidence[at(x, y)] = value
}
paintValue(60, 110, 20, 90, 0.95) // 몸통: 확신 높음
paintValue(70, 78, 91, 160, 0.55) // 다리: 확신 낮음 (그래도 사람 영역 안쪽)
const legAlpha = buildAlphaMap(lowConfidence, BW, BH)
assert.equal(legAlpha[at(74, 130)], 1, '다리 안쪽은 원본 신뢰도가 낮아도 완전히 불투명해야 한다')

// 경계는 딱 잘리지 않고 중간값을 가진다
const soft = new Float32Array(BW * BH)
for (let y = 20; y <= 90; y += 1) {
  for (let x = 60; x <= 110; x += 1) soft[at(x, y)] = 1
  soft[at(111, y)] = 0.6 // 경계 한 겹은 어중간한 값
}
const softAlpha = buildAlphaMap(soft, BW, BH)
assert.ok(
  softAlpha[at(111, 55)] > 0 && softAlpha[at(111, 55)] < 1,
  '경계는 0도 1도 아닌 중간값이어야 자연스럽다',
)

// 마스크 맨 아래 발밑은 한 겹 더 깎인다. 종아리 위쪽은 그대로다.
const skirtCore = new Uint8Array(W * H)
for (let y = 1; y <= 6; y += 1) for (let x = 3; x <= 8; x += 1) skirtCore[index(x, y)] = 1
const skirt = trimShadowSkirt(skirtCore, W, H)
assert.equal(skirt[index(5, 3)], 1, '몸통·종아리는 그대로여야 한다')
assert.equal(skirt[index(3, 6)], 0, '발밑 모서리는 더 깎여야 한다')

// 반투명 어두운 테두리는 바닥 그림자, 불투명한 어두운 신발은 사람
const HW = 8
const HH = 10
const halo = new Uint8ClampedArray(HW * HH * 4)
const put = (x: number, y: number, r: number, g: number, b: number, a: number) => {
  const i = (y * HW + x) * 4
  halo[i] = r
  halo[i + 1] = g
  halo[i + 2] = b
  halo[i + 3] = a
}
const alphaAt = (x: number, y: number) => halo[(y * HW + x) * 4 + 3]
put(3, 4, 30, 30, 30, 255) // 어두운 신발
put(4, 4, 20, 20, 20, 120) // 반투명 그림자 테두리
put(3, 9, 40, 40, 40, 200) // 발보다 아래
stripFloorHalo(halo, HW, HH, 0.5)
assert.equal(alphaAt(3, 4), 255, '불투명한 어두운 신발은 남아야 한다')
assert.equal(alphaAt(4, 4), 0, '반투명 어두운 테두리는 지워져야 한다')
assert.equal(alphaAt(3, 9), 0, '발보다 아래는 바닥 그림자로 지운다')

console.log('personMask 검사 통과')
