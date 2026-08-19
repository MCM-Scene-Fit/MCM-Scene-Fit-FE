import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber'
import { Html, OrbitControls, PerspectiveCamera, RoundedBox } from '@react-three/drei'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  CanvasTexture,
  ClampToEdgeWrapping,
  ExtrudeGeometry,
  Plane,
  Raycaster,
  SRGBColorSpace,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Shape,
} from 'three'
import { getColor } from '../data/products'
import { resolveCarryItem } from '../data/itemPresets'
import { bagSilhouetteFromImage, bagSideFromImage, sampleSideDepth, type BagBodyUv, type BagFace, type SideProfile } from '../lib/bagSilhouette'
import {
  itemBox,
  toWorldCenter,
  type PackBag,
  type PackPlacement,
  type PackPose,
} from '../lib/packLayout'
import type { ItemCategory, ItemId, ItemPresets, Product } from '../types'

type PackStage3DProps = {
  bag: PackBag
  product: Product
  colorId?: string
  items: ItemId[]
  presets: ItemPresets
  positions: PackPlacement
  selected: ItemId | null
  outsideIds: Set<ItemId>
  overlapping: Set<ItemId>
  onSelect: (id: ItemId | null) => void
  onMove: (id: ItemId, next: Pick<PackPose, 'x' | 'y' | 'z'>) => void
}

const CATEGORY_COLOR: Record<ItemCategory, string> = {
  tech: '#2b5ea8',
  beauty: '#9a6546',
  drink: '#2f6b4f',
  everyday: '#1d1d1d',
}

const CAMERA_FOV = 34
const CAMERA_YAW = 0.36
const CAMERA_PITCH = 0.16
const CAMERA_PAD = 1.18
const STUDIO = '#f4eee6'

function fitDistance(bag: PackBag, aspect: number) {
  const vFov = (CAMERA_FOV * Math.PI) / 180
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * Math.max(aspect, 0.2))
  const apparentW = bag.widthMm + bag.depthMm * Math.sin(CAMERA_YAW)
  const apparentH = bag.heightMm + bag.depthMm * Math.sin(CAMERA_PITCH)
  return Math.max(
    ((apparentH * CAMERA_PAD) / 2) / Math.tan(vFov / 2),
    ((apparentW * CAMERA_PAD) / 2) / Math.tan(hFov / 2),
    40,
  )
}

function cameraPosition(dist: number): [number, number, number] {
  return [
    Math.sin(CAMERA_YAW) * dist,
    Math.sin(CAMERA_PITCH) * dist,
    Math.cos(CAMERA_YAW) * Math.cos(CAMERA_PITCH) * dist,
  ]
}

export function PackStage3D({
  bag,
  product,
  colorId,
  items,
  presets,
  positions,
  selected,
  outsideIds,
  overlapping,
  onSelect,
  onMove,
}: PackStage3DProps) {
  const [orbit, setOrbit] = useState(true)
  const span = Math.max(bag.widthMm, bag.heightMm, bag.depthMm, 80)
  const bagOutside = outsideIds.size > 0
  const bagOverlap = overlapping.size > 0
  const color = getColor(product, colorId ?? product.colors[0].id)
  const startDist = fitDistance(bag, 1.25)

  return (
    <div className="pack-stage pack-stage--3d">
      <Canvas
        key={`${bag.widthMm}x${bag.heightMm}x${bag.depthMm}`}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        onPointerMissed={() => onSelect(null)}
      >
        <color attach="background" args={[STUDIO]} />
        <hemisphereLight args={['#fff8f1', '#d8cfc4', 0.95]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[span * 0.55, span * 1.15, span * 0.7]} intensity={1.25} />
        <directionalLight position={[-span * 0.7, span * 0.25, span * 0.2]} intensity={0.28} />
        <PerspectiveCamera makeDefault fov={CAMERA_FOV} position={cameraPosition(startDist)} />
        <FrameBag bag={bag} orbit={orbit} />
        <BagShell
          bag={bag}
          imageUrl={color.image}
          sideImageUrl={color.sideImage}
          hex={color.hex}
          outside={bagOutside}
          overlap={bagOverlap}
        />
        {items.map((id) => {
          const pose = positions[id]
          if (!pose) return null
          return (
            <PackMesh
              key={id}
              id={id}
              bag={bag}
              pose={pose}
              presets={presets}
              selected={selected === id}
              outside={outsideIds.has(id)}
              overlapping={overlapping.has(id)}
              onSelect={() => onSelect(id)}
              onMove={(next) => onMove(id, next)}
              onOrbit={setOrbit}
            />
          )
        })}
      </Canvas>
    </div>
  )
}

function FrameBag({ bag, orbit }: { bag: PackBag; orbit: boolean }) {
  const { camera, size } = useThree()
  const aspect = size.width / Math.max(size.height, 1)
  const pose = useMemo(() => {
    const dist = fitDistance(bag, aspect)
    return { dist, position: cameraPosition(dist) }
  }, [aspect, bag])

  useLayoutEffect(() => {
    camera.position.set(pose.position[0], pose.position[1], pose.position[2])
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }, [camera, pose])

  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.08}
      target={[0, 0, 0]}
      minDistance={pose.dist * 0.5}
      maxDistance={pose.dist * 3.4}
      enableRotate={orbit}
      enablePan={orbit}
    />
  )
}

function useBagLook(imageUrl: string, sideImageUrl: string | undefined, bag: PackBag) {
  const [look, setLook] = useState<{
    body: Shape
    texture: CanvasTexture
    face: BagFace
    bodyUv: BagBodyUv
    side: SideProfile | null
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    let texture: CanvasTexture | null = null
    const front = bagSilhouetteFromImage(imageUrl, bag)
    const side = sideImageUrl ? bagSideFromImage(sideImageUrl, bag).catch(() => null) : Promise.resolve(null)

    Promise.all([front, side])
      .then(([profile, sideProfile]) => {
        const next = new CanvasTexture(profile.canvas)
        next.colorSpace = SRGBColorSpace
        next.anisotropy = 8
        next.wrapS = ClampToEdgeWrapping
        next.wrapT = ClampToEdgeWrapping
        next.offset.set(profile.bodyUv.x, 1 - profile.bodyUv.y - profile.bodyUv.h)
        next.repeat.set(profile.bodyUv.w, profile.bodyUv.h)
        next.needsUpdate = true
        if (cancelled) {
          next.dispose()
          return
        }
        texture = next
        setLook({
          body: profile.body,
          texture: next,
          face: profile.face,
          bodyUv: profile.bodyUv,
          side: sideProfile,
        })
      })
      .catch(() => {
        if (!cancelled) setLook(null)
      })
    return () => {
      cancelled = true
      texture?.dispose()
      setLook(null)
    }
  }, [bag, imageUrl, sideImageUrl])

  return look
}

function groupByDepth(geometry: BufferGeometry) {
  const index = geometry.index
  if (!index) return false
  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  if (!box) return false
  const minZ = box.min.z
  const span = Math.max(box.max.z - minZ, 1e-6)
  const position = geometry.attributes.position
  const zOf = (vertex: number) => (position.getZ(vertex) - minZ) / span
  const buckets: [number[], number[], number[]] = [[], [], []]

  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i)
    const b = index.getX(i + 1)
    const c = index.getX(i + 2)
    const z = (zOf(a) + zOf(b) + zOf(c)) / 3
    const bucket = z > 0.86 ? 1 : z < 0.14 ? 2 : 0
    buckets[bucket].push(a, b, c)
  }

  geometry.setIndex([...buckets[0], ...buckets[1], ...buckets[2]])
  geometry.clearGroups()
  geometry.addGroup(0, buckets[0].length, 0)
  geometry.addGroup(buckets[0].length, buckets[1].length, 1)
  geometry.addGroup(buckets[0].length + buckets[1].length, buckets[2].length, 2)
  return buckets[1].length > 0
}

function sculptBag(geometry: BufferGeometry, depth: number, side: SideProfile | null) {
  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  if (!box) return
  const minZ = box.min.z
  const spanZ = Math.max(box.max.z - minZ, 1e-6)
  const halfW = Math.max(Math.abs(box.min.x), Math.abs(box.max.x), 1)
  const halfH = Math.max(Math.abs(box.min.y), Math.abs(box.max.y), 1)
  const position = geometry.attributes.position
  const floorY = box.min.y
  const floorBand = Math.max(8, (box.max.y - box.min.y) * 0.12)

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)
    const radial = Math.min(1.2, Math.hypot(x / halfW, (y / halfH) * 0.9))
    const edge = Math.pow(Math.max(0, 1 - radial), 1.28)
    const zNorm = (z - minZ) / spanZ
    const floor = Math.max(0, Math.min(1, (floorBand - (y - floorY)) / floorBand))
    const pinchAmt = (1 - Math.min(1, edge + 0.18)) * (0.18 * (1 - zNorm) + 0.03)
    const pinch = 1 - pinchAmt * (1 - floor * 0.95)
    const yFlat = floorY + (y - floorY) * (1 - floor * 0.82)
    const targetDepth = side ? sampleSideDepth(side, y, depth) : depth
    const belly = side ? 0 : edge * (0.5 + 0.28 * Math.max(0, 0.25 - y / halfH))
    const dome = Math.pow(Math.max(0, zNorm), 1.08) * Math.max(0, belly) * depth * 0.28 * (1 - floor * 0.85)
    const zMapped = minZ + zNorm * Math.max(targetDepth, 8) + dome
    position.setXYZ(i, x * pinch, yFlat, zMapped)
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
}

function BagBody({
  shape,
  depth,
  hex,
  texture,
  side,
}: {
  shape: Shape
  depth: number
  hex: string
  texture: CanvasTexture
  side: SideProfile | null
}) {
  const geometry = useMemo(() => {
    const next = new ExtrudeGeometry(shape, {
      depth,
      steps: 10,
      bevelEnabled: true,
      bevelThickness: Math.min(depth * 0.1, 12),
      bevelSize: Math.min(depth * 0.06, 8),
      bevelSegments: 3,
      curveSegments: 28,
    })
    groupByDepth(next)
    sculptBag(next, depth, side)
    return next
  }, [depth, shape, side])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh geometry={geometry} raycast={() => undefined}>
      <meshPhysicalMaterial
        attach="material-0"
        color={hex}
        transparent
        opacity={0.5}
        roughness={0.68}
        metalness={0.05}
        clearcoat={0.22}
        clearcoatRoughness={0.48}
        depthWrite={false}
      />
      <meshPhysicalMaterial
        attach="material-1"
        map={texture}
        transparent
        opacity={0.9}
        roughness={0.46}
        metalness={0.03}
        depthWrite={false}
      />
      <meshPhysicalMaterial
        attach="material-2"
        color={hex}
        transparent
        opacity={0.4}
        roughness={0.78}
        metalness={0.04}
        depthWrite={false}
      />
    </mesh>
  )
}

function BagShell({
  bag,
  imageUrl,
  sideImageUrl,
  hex,
  outside,
  overlap,
}: {
  bag: PackBag
  imageUrl: string
  sideImageUrl?: string
  hex: string
  outside: boolean
  overlap: boolean
}) {
  const look = useBagLook(imageUrl, sideImageUrl, bag)
  const depth = Math.max(bag.depthMm, 8)
  const shellHex = outside ? '#a33b2b' : overlap ? '#c3922a' : hex

  if (!look) {
    return (
      <mesh raycast={() => undefined}>
        <boxGeometry args={[bag.widthMm, bag.heightMm, depth]} />
        <meshPhysicalMaterial color={shellHex} transparent opacity={0.16} depthWrite={false} roughness={0.7} />
      </mesh>
    )
  }

  return (
    <group position={[0, 0, -depth / 2]}>
      <BagBody shape={look.body} depth={depth} hex={shellHex} texture={look.texture} side={look.side} />
    </group>
  )
}

function PackMesh({
  id,
  bag,
  pose,
  presets,
  selected,
  outside,
  overlapping,
  onSelect,
  onMove,
  onOrbit,
}: {
  id: ItemId
  bag: PackBag
  pose: PackPose
  presets: ItemPresets
  selected: boolean
  outside: boolean
  overlapping: boolean
  onSelect: () => void
  onMove: (next: Pick<PackPose, 'x' | 'y' | 'z'>) => void
  onOrbit: (on: boolean) => void
}) {
  const { camera, gl } = useThree()
  const item = resolveCarryItem(id, presets)
  const box = itemBox(id, pose, presets)
  const center = toWorldCenter(box, bag)
  const [dragging, setDragging] = useState(false)
  const drag = useRef({
    origin: { x: pose.x, y: pose.y, z: pose.z },
    hit: new Vector3(),
    plane: new Plane(),
  })
  const moveRef = useRef(onMove)

  useEffect(() => {
    moveRef.current = onMove
  }, [onMove])

  const color = useMemo(() => {
    if (outside) return '#a33b2b'
    if (overlapping) return '#c3922a'
    return CATEGORY_COLOR[item.category]
  }, [item.category, outside, overlapping])

  useEffect(() => {
    if (!dragging) return
    const raycaster = new Raycaster()
    const ndc = new Vector2()
    const point = new Vector3()
    const canvas = gl.domElement

    const onMovePointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      ndc.x = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1
      ndc.y = -((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1
      raycaster.setFromCamera(ndc, camera)
      if (!raycaster.ray.intersectPlane(drag.current.plane, point)) return
      moveRef.current({
        x: drag.current.origin.x + (point.x - drag.current.hit.x),
        y: drag.current.origin.y - (point.y - drag.current.hit.y),
        z: drag.current.origin.z + (point.z - drag.current.hit.z),
      })
    }

    const onUp = () => {
      setDragging(false)
      onOrbit(true)
    }

    window.addEventListener('pointermove', onMovePointer)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMovePointer)
      window.removeEventListener('pointerup', onUp)
    }
  }, [camera, dragging, gl, onOrbit])

  const onPointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    onSelect()
    const normal = new Vector3()
    camera.getWorldDirection(normal)
    drag.current.origin = { x: pose.x, y: pose.y, z: pose.z }
    drag.current.hit.copy(event.point)
    drag.current.plane.setFromNormalAndCoplanarPoint(normal, event.point)
    setDragging(true)
    onOrbit(false)
  }

  const w = Math.max(box.w, 2)
  const h = Math.max(box.h, 2)
  const d = Math.max(box.d, 2)
  const radius = Math.min(7, Math.min(w, h, d) * 0.22)

  return (
    <RoundedBox
      args={[w, h, d]}
      radius={radius}
      smoothness={4}
      position={[center.x, center.y, center.z]}
      onPointerDown={onPointerDown}
      castShadow={false}
    >
      <meshStandardMaterial
        color={color}
        transparent
        opacity={selected || dragging ? 0.94 : 0.82}
        roughness={0.42}
        metalness={0.08}
      />
      <Html
        center
        sprite
        pointerEvents="none"
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: '#111',
          whiteSpace: 'nowrap',
          textShadow: '0 0 6px #f5efe7',
        }}
      >
        {item.label}
      </Html>
    </RoundedBox>
  )
}
