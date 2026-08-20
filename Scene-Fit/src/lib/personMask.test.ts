/**
 * 마스크 다듬기 자체 검사. `npx tsx src/lib/personMask.test.ts`
 * 합성 품질이 여기 로직에 걸려 있어서, 깨지면 바로 알아채야 한다.
 */
import assert from 'node:assert'
import { buildAlphaMap, erode, largestBlob } from './personMask'

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

// 확신이 낮은 픽셀은 사람으로 치지 않는다
const coverage = new Float32Array(W * H)
coverage[index(3, 3)] = 0.9
coverage[index(8, 3)] = 0.4
const alpha = buildAlphaMap(coverage, W, H)
assert.equal(alpha[index(8, 3)], 0, '0.6 미만은 배경으로 본다')
assert.ok(
  alpha.every((value) => value >= 0 && value <= 1),
  '알파는 0~1 범위여야 한다',
)

console.log('personMask 검사 통과')
