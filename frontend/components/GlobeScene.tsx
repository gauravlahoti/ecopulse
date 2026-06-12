'use client'

import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'

// ── Atmosphere vertex/fragment shaders ──────────────────────────────────
const ATMOSPHERE_VERT = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const ATMOSPHERE_FRAG = `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec3 vNormal;
  void main() {
    float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
    float glow = pow(rim, 2.5) * uIntensity;
    gl_FragColor = vec4(uColor, glow);
  }
`

function hazeColorFromCo2e(co2eKg: number): [number, number, number] {
  if (co2eKg < 200) return [0.23, 0.51, 0.96]   // blue — pristine
  if (co2eKg < 500) return [0.96, 0.62, 0.04]   // amber — warming
  if (co2eKg < 1000) return [0.98, 0.42, 0.21]  // orange — polluted
  return [0.94, 0.18, 0.33]                       // red — critical
}

function hazeIntensityFromCo2e(co2eKg: number): number {
  return Math.min(0.3 + (co2eKg / 1000) * 1.4, 2.2)
}

// ── Earth + Atmosphere mesh ───────────────────────────────────────────────
function Earth({ co2eKg }: { co2eKg: number }) {
  const hazeRef = useRef<THREE.Mesh>(null)
  const outerGlowRef = useRef<THREE.Mesh>(null)
  const cloudRef = useRef<THREE.Mesh>(null)

  const atmMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ATMOSPHERE_VERT,
        fragmentShader: ATMOSPHERE_FRAG,
        uniforms: {
          uColor: { value: new THREE.Color(...hazeColorFromCo2e(co2eKg)) },
          uIntensity: { value: hazeIntensityFromCo2e(co2eKg) },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.FrontSide,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const outerMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ATMOSPHERE_VERT,
        fragmentShader: ATMOSPHERE_FRAG,
        uniforms: {
          uColor: { value: new THREE.Color(...hazeColorFromCo2e(co2eKg)) },
          uIntensity: { value: hazeIntensityFromCo2e(co2eKg) * 0.4 },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // Animate atmosphere on co2eKg change
  useEffect(() => {
    const [r, g, b] = hazeColorFromCo2e(co2eKg)
    const color = new THREE.Color(r, g, b)
    const intensity = hazeIntensityFromCo2e(co2eKg)
    atmMaterial.uniforms['uColor']!.value = color
    atmMaterial.uniforms['uIntensity']!.value = intensity
    outerMaterial.uniforms['uColor']!.value = color
    outerMaterial.uniforms['uIntensity']!.value = intensity * 0.4
  }, [co2eKg, atmMaterial, outerMaterial])

  useFrame((_, delta) => {
    if (cloudRef.current) {
      cloudRef.current.rotation.y += delta * 0.03
    }
  })

  return (
    <group>
      {/* Earth core */}
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          color="#0B2447"
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Continental outlines — subtle lighter layer */}
      <mesh>
        <sphereGeometry args={[1.001, 64, 64]} />
        <meshStandardMaterial
          color="#1A3A5C"
          roughness={1}
          transparent
          opacity={0.4}
          wireframe={false}
        />
      </mesh>

      {/* Atmosphere rim glow */}
      <mesh ref={hazeRef} scale={1.025}>
        <sphereGeometry args={[1, 48, 48]} />
        <primitive object={atmMaterial} attach="material" />
      </mesh>

      {/* Outer halo */}
      <mesh ref={outerGlowRef} scale={1.15}>
        <sphereGeometry args={[1, 32, 32]} />
        <primitive object={outerMaterial} attach="material" />
      </mesh>

      {/* Cloud layer */}
      <mesh ref={cloudRef} scale={1.012}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.07}
          roughness={1}
        />
      </mesh>

      {/* Aurora rings at poles */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.8, 0]}>
        <torusGeometry args={[0.6, 0.02, 8, 64]} />
        <meshBasicMaterial color="#7B61FF" transparent opacity={0.5} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.8, 0]}>
        <torusGeometry args={[0.6, 0.015, 8, 64]} />
        <meshBasicMaterial color="#7B61FF" transparent opacity={0.3} />
      </mesh>
    </group>
  )
}

// ── CO₂ Particle system ───────────────────────────────────────────────────
function CO2Particles({ count = 120, co2eKg }: { count?: number; co2eKg: number }) {
  const meshRef = useRef<THREE.Points>(null)
  const intensity = Math.min(co2eKg / 500, 1)

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const r = 1.05 + Math.random() * 0.1
      pos[i * 3]! = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1]! = r * Math.cos(phi)
      pos[i * 3 + 2]! = r * Math.sin(phi) * Math.sin(theta)
      vel[i * 3]! = (Math.random() - 0.5) * 0.002
      vel[i * 3 + 1]! = Math.random() * 0.003 + 0.001
      vel[i * 3 + 2]! = (Math.random() - 0.5) * 0.002
    }
    return [pos, vel]
  }, [count])

  useFrame(() => {
    if (!meshRef.current || intensity < 0.05) return
    const geo = meshRef.current.geometry
    const pos = geo.attributes['position']?.array as Float32Array | undefined
    if (!pos) return
    for (let i = 0; i < count; i++) {
      pos[i * 3]! += velocities[i * 3]!
      pos[i * 3 + 1]! += velocities[i * 3 + 1]!
      pos[i * 3 + 2]! += velocities[i * 3 + 2]!
      const dist = Math.sqrt(
        pos[i * 3]! ** 2 + pos[i * 3 + 1]! ** 2 + pos[i * 3 + 2]! ** 2
      )
      if (dist > 1.5) {
        pos[i * 3]! *= 1.05 / dist
        pos[i * 3 + 1]! = 1.05
        pos[i * 3 + 2]! *= 1.05 / dist
      }
    }
    geo.attributes['position']!.needsUpdate = true
  })

  const [r, g, b] = hazeColorFromCo2e(co2eKg)

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute args={[positions, 3]} attach="attributes-position" />
      </bufferGeometry>
      <pointsMaterial
        size={0.012}
        color={new THREE.Color(r, g, b)}
        transparent
        opacity={0.6 * intensity}
        sizeAttenuation
      />
    </points>
  )
}

// ── Camera setup ─────────────────────────────────────────────────────────
function CameraRig() {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(0, 0, 2.6)
  }, [camera])
  return null
}

// ── Main exported scene ───────────────────────────────────────────────────
type GlobeSceneProps = {
  co2eKg: number
  height?: string
}

export function GlobeScene({ co2eKg, height = '100%' }: GlobeSceneProps) {
  return (
    <div style={{ width: '100%', height }} role="img" aria-label={`3D carbon globe showing ${co2eKg.toFixed(1)} kg CO₂e atmospheric load`}>
      <Canvas
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
        camera={{ fov: 45, near: 0.1, far: 1000 }}
      >
        <CameraRig />
        <ambientLight intensity={0.15} />
        <directionalLight position={[5, 3, 5]} intensity={1.2} color="#4488ff" />
        <pointLight position={[-3, -2, -3]} intensity={0.3} color="#ff6644" />

        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />
        <Earth co2eKg={co2eKg} />
        <CO2Particles co2eKg={co2eKg} />

        <OrbitControls
          enableZoom
          enablePan={false}
          minDistance={1.8}
          maxDistance={4}
          rotateSpeed={0.4}
          zoomSpeed={0.6}
          dampingFactor={0.05}
          enableDamping
          autoRotate
          autoRotateSpeed={0.3}
        />

        <EffectComposer>
          <Bloom
            luminanceThreshold={0.1}
            luminanceSmoothing={0.9}
            intensity={0.8}
            blendFunction={BlendFunction.ADD}
          />
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={new THREE.Vector2(0.0015, 0.0015)}
            radialModulation={false}
            modulationOffset={0}
          />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
