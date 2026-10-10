import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Professor Tauhid Zaman: hoodie, sneakers, a Labubu charm swinging off his belt loop.
// He turns to face you when you get close, and you can click him to start a conversation.

const SPH = new THREE.SphereGeometry(1, 24, 16)
const CYL = new THREE.CylinderGeometry(1, 1, 1, 20)
const BOX = new THREE.BoxGeometry(1, 1, 1)
const CAP = new THREE.CapsuleGeometry(1, 1, 6, 12)

const mats = new Map()
const m = (color, o = {}) => {
  const k = color + JSON.stringify(o)
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o }))
  return mats.get(k)
}
const B = ({ g = SPH, c, p, s, r = [0, 0, 0], o }) => (
  <mesh geometry={g} material={m(c, o)} position={p} scale={s} rotation={r} />
)

export const ZAMAN = {
  id: 'zaman',
  name: 'Tauhid Zaman',
  skin: '#b07a4a', // light brown
  hoodie: '#17171b',
  hoodieTrim: '#ff4fa3', // he is a BLACKPINK fan and will not be talked out of it
  jeans: '#3a4a63',
  shoe: '#f2efe9',
  hair: '#17120e',
  height: 1.8,
}

const HOOK_ANGLE = Math.cos(THREE.MathUtils.degToRad(22)) // how close to centred your aim must be
const HOOK_RANGE = 7 // metres

// A pocket-sized Labubu, clipped to a belt loop. Nine primitives, not the full character.
function LabubuCharm() {
  const swing = useRef()
  useFrame(({ clock }) => {
    if (swing.current) swing.current.rotation.z = Math.sin(clock.elapsedTime * 1.8) * 0.22
  })
  const fur = '#f3c9a5'
  // Hangs off the belt loop at his hip. The hoodie is a cylinder ~0.265 in radius down at the
  // hem, so the charm has to sit further out than that or it renders inside him.
  return (
    <group ref={swing} position={[0.29, 0.66, 0.07]} scale={1.7}>
      <B g={CYL} c="#c0c4c8" p={[0, 0.02, 0]} s={[0.006, 0.05, 0.006]} o={{ metalness: 0.8, roughness: 0.3 }} />
      <B c={fur} p={[0, -0.06, 0]} s={[0.035, 0.038, 0.032]} />
      <B c={fur} p={[0, -0.115, 0]} s={[0.03, 0.032, 0.028]} />
      {[-1, 1].map((sx) => (
        <B key={sx} c={fur} p={[0.026 * sx, -0.028, 0]} s={[0.012, 0.028, 0.01]} r={[0, 0, 0.3 * sx]} />
      ))}
      {[-1, 1].map((sx) => (
        <B key={sx} c="#1d1410" p={[0.013 * sx, -0.058, 0.03]} s={[0.005, 0.006, 0.004]} />
      ))}
      <B g={BOX} c="#ffffff" p={[0, -0.067, 0.031]} s={[0.018, 0.006, 0.003]} />
    </group>
  )
}

export default function Zaman({ position = [0, 0, 0], rotation = 0, talking = false, onFocusChange, onActivate }) {
  const root = useRef()
  const armL = useRef()
  const [hovered, setHovered] = useState(false)
  const focused = useRef(false)
  const P = ZAMAN
  const s = P.height / 1.9
  const hoodie = m(P.hoodie)
  const skin = m(P.skin)
  const here = useMemo(() => new THREE.Vector3(...position), [position])
  const flat = useMemo(() => new THREE.Vector3(), [])
  const aim = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ clock, camera }) => {
    if (!root.current) return
    const t = clock.elapsedTime

    // Is the player close, and looking roughly at him?
    flat.subVectors(camera.position, here)
    const dist = flat.length()
    flat.y = 0
    flat.normalize()
    camera.getWorldDirection(aim)
    aim.y = 0
    aim.normalize()
    // aim points away from the player, so compare it against the direction player -> Zaman
    const onTarget = -flat.dot(aim) > HOOK_ANGLE
    const isFocused = dist < HOOK_RANGE && onTarget
    if (isFocused !== focused.current) {
      focused.current = isFocused
      onFocusChange?.(isFocused)
    }

    // Face the player while talking or whenever they are near; otherwise scan the room.
    const want =
      talking || dist < HOOK_RANGE ? Math.atan2(camera.position.x - here.x, camera.position.z - here.z) : rotation + Math.sin(t * 0.4) * 0.35
    let d = want - root.current.rotation.y
    while (d > Math.PI) d -= Math.PI * 2
    while (d < -Math.PI) d += Math.PI * 2
    root.current.rotation.y += d * Math.min(1, 3.5 * 0.016)

    // gesturing hand, a little livelier while he is mid-explanation
    if (armL.current) armL.current.rotation.x = -0.25 + Math.sin(t * (talking ? 3.2 : 1.1)) * (talking ? 0.5 : 0.12)
  })

  return (
    <group ref={root} position={position} rotation={[0, rotation, 0]} scale={s}>
      {/* click target: an invisible column around him, so you do not have to hit an ear */}
      <mesh
        position={[0, 0.95, 0]}
        visible={false}
        onClick={(e) => {
          e.stopPropagation()
          onActivate?.()
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <cylinderGeometry args={[0.6, 0.6, 1.95, 10]} />
      </mesh>

      {/* legs + sneakers */}
      {[-1, 1].map((sx) => (
        <group key={sx} position={[0.1 * sx, 0, 0]}>
          <mesh geometry={CAP} material={m(P.jeans)} position={[0, 0.42, 0]} scale={[0.085, 0.3, 0.085]} />
          <B g={BOX} c={P.shoe} p={[0, 0.045, 0.05]} s={[0.1, 0.09, 0.26]} />
          <B g={BOX} c="#d8d4cc" p={[0, 0.015, 0.05]} s={[0.105, 0.03, 0.265]} />
        </group>
      ))}

      {/* hoodie body */}
      <mesh geometry={new THREE.CylinderGeometry(0.235, 0.265, 0.78, 24)} material={hoodie} position={[0, 1.08, 0]} />
      <B g={CYL} c={P.hoodie} p={[0, 0.69, 0]} s={[0.268, 0.06, 0.268]} />
      {/* kangaroo pocket + drawstrings. The torso cylinder tapers 0.265 -> 0.235, so anything
          meant to read as "on the hoodie" has to sit just outside that radius at its own height. */}
      <B g={BOX} c="#101014" p={[0, 0.88, 0.25]} s={[0.26, 0.18, 0.03]} />
      {[-1, 1].map((sx) => (
        <B key={sx} g={CYL} c={P.hoodieTrim} p={[0.045 * sx, 1.3, 0.25]} s={[0.008, 0.13, 0.008]} />
      ))}
      {/* small pink chest graphic */}
      <B g={BOX} c={P.hoodieTrim} p={[0, 1.21, 0.253]} s={[0.1, 0.035, 0.004]} />
      {/* hood, bunched behind the neck */}
      <B c={P.hoodie} p={[0, 1.46, -0.1]} s={[0.17, 0.11, 0.13]} />

      <LabubuCharm />

      {/* arms */}
      <group position={[0.27, 1.4, 0]} rotation={[0.1, 0, 0.2]}>
        <mesh geometry={CAP} material={hoodie} position={[0, -0.22, 0]} scale={[0.07, 0.18, 0.07]} />
        <mesh geometry={SPH} material={skin} position={[0, -0.46, 0.02]} scale={[0.047, 0.057, 0.042]} />
      </group>
      <group ref={armL} position={[-0.27, 1.4, 0]} rotation={[-0.25, 0, -0.2]}>
        <mesh geometry={CAP} material={hoodie} position={[0, -0.22, 0]} scale={[0.07, 0.18, 0.07]} />
        <mesh geometry={SPH} material={skin} position={[0, -0.46, 0.02]} scale={[0.047, 0.057, 0.042]} />
      </group>

      {/* head */}
      <B g={CYL} c={P.skin} p={[0, 1.55, 0]} s={[0.05, 0.08, 0.05]} />
      <B c={P.skin} p={[0, 1.7, 0]} s={[0.12, 0.14, 0.13]} />
      {[-1, 1].map((sx) => (
        <B key={sx} c={P.skin} p={[0.122 * sx, 1.7, 0]} s={[0.02, 0.035, 0.02]} />
      ))}
      {/* short dark hair + trimmed beard */}
      <B c={P.hair} p={[0, 1.76, -0.01]} s={[0.125, 0.105, 0.133]} />
      <B c={P.hair} p={[0, 1.645, 0.03]} s={[0.113, 0.075, 0.12]} />
      <B c={P.skin} p={[0, 1.655, 0.07]} s={[0.07, 0.055, 0.09]} />
      {/* eyes */}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <B c="#ffffff" p={[0.045 * sx, 1.725, 0.112]} s={[0.022, 0.018, 0.012]} />
          <B c="#1d1410" p={[0.045 * sx, 1.725, 0.122]} s={[0.011, 0.012, 0.008]} />
          <B g={BOX} c={P.hair} p={[0.047 * sx, 1.762, 0.115]} s={[0.03, 0.008, 0.01]} r={[0, 0, -0.08 * sx]} />
        </group>
      ))}
      <B c={P.skin} p={[0, 1.69, 0.128]} s={[0.022, 0.03, 0.025]} />
      {/* glow ring underfoot when you are aimed at him */}
      {hovered && <B g={CYL} c={P.hoodieTrim} p={[0, 0.01, 0]} s={[0.5, 0.01, 0.5]} o={{ emissive: P.hoodieTrim, emissiveIntensity: 0.6 }} />}
    </group>
  )
}
