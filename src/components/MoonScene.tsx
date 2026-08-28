import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { scrollState, setMoonLoadedState } from "@/lib/rausch-scroll";

useGLTF.preload("/models/moon.glb");

function CustomMoonModel({
  innerRef,
  mobile,
}: {
  innerRef: React.RefObject<THREE.Group | null>;
  mobile: boolean;
}) {
  const gltf = useGLTF("/models/moon.glb");

  useEffect(() => {
    setMoonLoadedState(true, 100);
  }, []);

  const model = useMemo(() => {
    const scene = gltf.scene.clone(true);
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        m.castShadow = true;
        m.receiveShadow = true;
        if (m.material) {
          const mat = m.material as THREE.MeshStandardMaterial;
          mat.roughness = 0.96;
          mat.metalness = 0.0;
          if (mat.map) {
            mat.map.anisotropy = 8;
            mat.bumpMap = mat.map;
            mat.bumpScale = 0.085;
          }
        }
      }
    });
    return scene;
  }, [gltf]);

  return (
    <group ref={innerRef} scale={1.0 / 1.271864}>
      <primitive object={model} />
    </group>
  );
}

/**
 * High-Fidelity Cosmic Starfield with Twinkling Depth
 */
function CosmicStarfield({ mobile }: { mobile: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const dustRef = useRef<THREE.Points>(null);

  const [starPositions, starColors, starSizes, starPhases] = useMemo(() => {
    const count = mobile ? 600 : 1800;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const ph = new Float32Array(count);

    const colors = [
      new THREE.Color("#ffffff"),
      new THREE.Color("#f0f7ff"),
      new THREE.Color("#d8e8ff"),
      new THREE.Color("#eee6ff"),
      new THREE.Color("#d0e2ff"),
    ];

    for (let i = 0; i < count; i++) {
      // Wide frustum distribution across 3D space
      pos[i * 3] = (Math.random() - 0.5) * 44;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 36;
      pos[i * 3 + 2] = -Math.random() * 26 - 1.5; // spanning right behind moon and deep into void

      const c = colors[Math.floor(Math.random() * colors.length)]!;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;

      sz[i] = Math.random() < 0.15 ? 2.0 + Math.random() * 1.8 : 0.9 + Math.random() * 1.1;
      ph[i] = Math.random() * Math.PI * 2;
    }

    return [pos, col, sz, ph];
  }, [mobile]);

  const [dustPositions, dustColors] = useMemo(() => {
    const count = mobile ? 140 : 450;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 38;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 28 - 6;

      const brightness = 0.35 + Math.random() * 0.45;
      col[i * 3] = brightness * 0.85;
      col[i * 3 + 1] = brightness * 0.95;
      col[i * 3 + 2] = brightness * 1.0;
    }
    return [pos, col];
  }, [mobile]);

  const starTexture = useMemo(() => {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(255, 255, 255, 1)");
    grad.addColorStop(0.25, "rgba(240, 248, 255, 0.95)");
    grad.addColorStop(0.55, "rgba(185, 215, 255, 0.45)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (pointsRef.current) {
      pointsRef.current.rotation.y = t * 0.003;
      pointsRef.current.rotation.x = t * 0.0015;
    }
    if (dustRef.current) {
      dustRef.current.rotation.y = -t * 0.005;
    }
  });

  return (
    <>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[starPositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[starColors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={mobile ? 0.22 : 0.16}
          map={starTexture}
          vertexColors
          transparent
          opacity={1.0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>

      <points ref={dustRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dustPositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[dustColors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={mobile ? 0.30 : 0.24}
          map={starTexture}
          vertexColors
          transparent
          opacity={0.45}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </>
  );
}

/** Eased keyframe interpolation track across scroll stops */
function track(p: number, stops: [number, number][]) {
  if (!stops.length) return 0;
  const first = stops[0]!;
  if (p <= first[0]) return first[1];
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]!;
    const b = stops[i + 1]!;
    if (p >= a[0] && p <= b[0]) {
      const t = (p - a[0]) / (b[0] - a[0] || 1);
      const e = t * t * (3 - 2 * t);
      return a[1] + (b[1] - a[1]) * e;
    }
  }
  return stops[stops.length - 1]![1];
}

/**
 * Luminous Razor-Thin Silver Eclipse Corona Ring
 */
function EclipseRing({ intensity }: { intensity: number }) {
  const ringTexture = useMemo(() => {
    const size = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const imgData = ctx.createImageData(size, size);
    const cx = size / 2;
    const cy = size / 2;
    const limbRadius = size * 0.44;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist >= limbRadius - 4 && dist < limbRadius + 42) {
          const outwardDist = Math.max(0, dist - limbRadius);
          const core = Math.exp(-Math.pow(outwardDist / 3.8, 2.0));
          const glow = Math.exp(-Math.pow(outwardDist / 16.0, 1.5)) * 0.6;
          const brightness = Math.min(1, core + glow);

          imgData.data[idx] = 255;
          imgData.data[idx + 1] = 255;
          imgData.data[idx + 2] = 255;
          imgData.data[idx + 3] = Math.floor(brightness * 255);
        } else {
          imgData.data[idx + 3] = 0;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  return (
    <mesh position={[0, 0, -0.02]} scale={2.28}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={ringTexture}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        opacity={intensity * 0.95}
      />
    </mesh>
  );
}

/**
 * The Real 3D Moon - True Single-Pass Dynamic Stage
 */
function RealMoon({ mobile }: { mobile: boolean }) {
  const group = useRef<THREE.Group>(null);
  const moonMesh = useRef<THREE.Group>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const sunLight = useRef<THREE.DirectionalLight>(null);
  const earthshineLight = useRef<THREE.DirectionalLight>(null);
  const backRimLight = useRef<THREE.DirectionalLight>(null);
  const craterHighlight = useRef<THREE.PointLight>(null);
  const introSpinLight = useRef<THREE.PointLight>(null);
  const [eclipseVal, setEclipseVal] = useState(0);
  const { camera } = useThree();

  useFrame((state, dt) => {
    const p = scrollState.progress;
    const d = Math.min(dt, 0.05);
    const time = state.clock.elapsedTime;
    const intro = scrollState.introPhase;
    const introOpacity = scrollState.introMoonOpacity;

    // 1. Intro sequence
    if (intro !== "done") {
      camera.position.set(0, 0, mobile ? 4.2 : 3.8);
      camera.lookAt(0, 0, 0);

      if (group.current) {
        group.current.position.set(0, 0, 0);
        group.current.scale.setScalar(mobile ? 0.85 : 1.05);
        group.current.rotation.z = 0;
      }

      if (moonMesh.current) {
        moonMesh.current.rotation.y = 1.25;
        moonMesh.current.rotation.x = 0.05;
      }

      if (ambientLightRef.current) {
        ambientLightRef.current.intensity = 0.02 * introOpacity;
      }

      if (sunLight.current) {
        const angle = scrollState.introAngle;
        const lx = Math.cos(angle) * 3.8;
        const ly = Math.sin(angle) * 3.8;
        sunLight.current.position.set(lx, ly, 1.4);
        sunLight.current.intensity = 6.0 * introOpacity;
      }

      if (earthshineLight.current) {
        earthshineLight.current.intensity = 0.25 * introOpacity;
      }

      if (introSpinLight.current) {
        const angle = scrollState.introAngle;
        const lx = Math.cos(angle) * 1.08;
        const ly = Math.sin(angle) * 1.08;
        introSpinLight.current.position.set(lx, ly, 0.1);
        introSpinLight.current.intensity = intro === "light_spin" ? 3.5 * introOpacity : 0;
      }

      if (backRimLight.current) {
        backRimLight.current.intensity = 2.0 * introOpacity;
      }

      return;
    }

    // --- TIMELINE INTERPOLATION ---
    if (!scrollState.isDragging) {
      scrollState.passTimeline = THREE.MathUtils.damp(
        scrollState.passTimeline,
        scrollState.targetTimeline,
        mobile ? 6.0 : 4.0,
        d,
      );
    }

    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = 0.015;
    }

    const ptrX = scrollState.pointerX * (mobile ? 0.012 : 0.02);
    const ptrY = scrollState.pointerY * (mobile ? 0.01 : 0.015);
    const blend = scrollState.passesBlend;
    const pt = scrollState.passTimeline; // [0.0 -> 1.0]

    // 1. Narrative Keyframes Outside Passes (Mobile-Choreographed Vertical Trajectories)
    const baseCamZ = mobile
      ? track(p, [
          [0, 4.4],
          [0.2, 3.8],
          [0.4, 4.2],
          [0.75, 4.6],
          [1.0, 4.4],
        ])
      : track(p, [
          [0, 4.2],
          [0.2, 2.9],
          [0.4, 3.6],
          [0.75, 4.6],
          [1.0, 4.4],
        ]);

    const baseCamX = track(p, [
      [0, 0],
      [0.2, mobile ? 0.05 : 0.2],
      [0.4, 0],
      [0.75, mobile ? 0.1 : 0.25],
      [1.0, 0],
    ]);

    const baseCamY = track(p, [
      [0, 0],
      [0.2, mobile ? 0.06 : 0.12],
      [0.4, 0],
      [0.75, mobile ? 0.08 : 0.18],
      [1.0, 0],
    ]);

    const baseGx = mobile
      ? track(p, [
          [0, 0.0],
          [0.2, 0.10],
          [0.4, 0.0],
          [0.75, -0.08],
          [1.0, 0.0],
        ])
      : track(p, [
          [0, 0.48],
          [0.2, 0.82],
          [0.4, 0.5],
          [0.75, -0.7],
          [1.0, 0.0],
        ]);

    const baseGy = mobile
      ? track(p, [
          [0, 0.20], // Hero: Moon in upper center framing RAUSCH logo
          [0.2, -0.16], // Manifesto: Moon descends to bottom-right, leaving text clear
          [0.4, 0.18], // Approaching passes: Ascends gracefully
          [0.75, 0.26], // Venue / Rules: Upper third
          [1.0, 0.12], // Closing: Centered above CTA
        ])
      : track(p, [
          [0, -0.05],
          [0.2, 0.08],
          [0.4, -0.05],
          [0.75, 0.25],
          [1.0, 0.0],
        ]);

    const baseScale = mobile
      ? track(p, [
          [0, 0.68],
          [0.2, 0.82],
          [0.4, 0.66],
          [0.75, 0.52],
          [1.0, 0.72],
        ])
      : track(p, [
          [0, 0.9],
          [0.2, 1.55],
          [0.4, 1.0],
          [0.75, 0.55],
          [1.0, 0.82],
        ]);

    const baseSunIntensity = track(p, [
      [0, 5.5],
      [0.2, 6.5],
      [0.4, 5.2],
      [0.75, 4.8],
      [1.0, 5.5],
    ]);
    const baseSunX = 3.5;
    const baseSunY = 0.6;
    const baseSunZ = 1.5;

    // 2. Passes chapter timeline (Continuous orbit across 4 passes: General, VIP, Couple General, Couple VIP)
    const passGx = mobile
      ? 0.0
      : track(pt, [
          [0.0, -0.48], // General (Standard): Left
          [0.20, -0.48],
          [0.25, 0.0],
          [0.32, 0.48], // VIP Access: Right
          [0.48, 0.48],
          [0.53, 0.0],
          [0.60, -0.48], // Couple General: Left
          [0.74, -0.48],
          [0.80, 0.0], // Couple VIP: Centered
          [1.0, 0.0],
        ]);

    const passGy = mobile
      ? track(pt, [
          [0.0, 0.28], // General on mobile
          [0.20, 0.28],
          [0.32, 0.22], // VIP on mobile
          [0.48, 0.22],
          [0.60, 0.28], // Couple General on mobile
          [0.74, 0.28],
          [0.82, 0.16], // Couple VIP Eclipse on mobile
          [1.0, 0.16],
        ])
      : track(pt, [
          [0.0, -0.02],
          [0.20, -0.02],
          [0.32, 0.02],
          [0.48, 0.02],
          [0.60, -0.02],
          [0.74, -0.02],
          [0.82, 0.0],
          [1.0, 0.0],
        ]);

    // Scale progression
    const passScale = mobile
      ? track(pt, [
          [0.0, 0.62],
          [0.20, 0.64],
          [0.32, 0.70],
          [0.48, 0.72],
          [0.60, 0.64],
          [0.74, 0.66],
          [0.82, 0.80], // Couple VIP Eclipse
          [1.0, 0.72],
        ])
      : track(pt, [
          [0.0, 0.88],
          [0.20, 0.90],
          [0.32, 0.98],
          [0.48, 1.02],
          [0.60, 0.90],
          [0.74, 0.92],
          [0.82, 1.25], // Couple VIP Eclipse
          [1.0, 0.92],
        ]);

    // Virtual Orbital Light Path
    const passLightX = track(pt, [
      [0.0, mobile ? 2.2 : 2.8], // General: Moon Left -> Light Right
      [0.20, mobile ? 2.2 : 2.8],
      [0.26, 0.0],
      [0.32, mobile ? -2.2 : -2.8], // VIP: Moon Right -> Light Left
      [0.48, mobile ? -2.2 : -2.8],
      [0.54, 0.0],
      [0.60, mobile ? 2.2 : 2.8], // Couple General: Moon Left -> Light Right
      [0.74, mobile ? 2.2 : 2.8],
      [0.80, 0.0], // Couple VIP: Direct Solar Backlight
      [1.0, 0.0],
    ]);

    const passLightY = track(pt, [
      [0.0, 0.5],
      [0.20, 0.5],
      [0.35, 0.5],
      [0.60, 0.5],
      [0.82, 0.8],
      [1.0, 0.6],
    ]);

    const passLightZ = track(pt, [
      [0.0, 1.6],
      [0.20, 1.6],
      [0.26, 0.5],
      [0.32, 1.6], // VIP
      [0.48, 1.6],
      [0.54, 0.5],
      [0.60, 1.6], // Couple General
      [0.74, 1.6],
      [0.80, -1.0], // Transition to eclipse
      [0.86, -3.8], // Couple VIP: Solar eclipse beam from behind
      [1.0, 1.5],
    ]);

    const passLightIntensity = track(pt, [
      [0.0, 5.0],
      [0.18, 6.2],
      [0.26, 1.2],
      [0.35, 6.5],
      [0.52, 1.2],
      [0.65, 6.2],
      [0.78, 1.5],
      [0.86, 8.5], // Couple VIP: Intense solar rim
      [1.0, 5.5],
    ]);

    // Corona Ring Intensity (Active during Couple VIP eclipse)
    const passEclipseIntensity = track(pt, [
      [0.0, 0.0],
      [0.76, 0.0],
      [0.82, 0.4],
      [0.88, 1.0], // Silver rim corona
      [0.96, 0.4],
      [1.0, 0.0],
    ]);

    // Crater Ridge Specular Highlight
    const isNearP1 = Math.abs(pt - 0.15) < 0.035;
    const isNearP2 = Math.abs(pt - 0.40) < 0.035;
    const isNearP3 = Math.abs(pt - 0.67) < 0.035;
    const isNearP4 = Math.abs(pt - 0.88) < 0.035;
    const craterGlint = isNearP1 || isNearP2 || isNearP3 || isNearP4 ? 2.5 : 0;

    if (craterHighlight.current) {
      craterHighlight.current.intensity = THREE.MathUtils.damp(
        craterHighlight.current.intensity,
        craterGlint,
        6.0,
        d,
      );
      if (isNearP1 || isNearP3) craterHighlight.current.position.set(0.6, 0.2, 0.8);
      else if (isNearP2) craterHighlight.current.position.set(-0.6, 0.2, 0.8);
      else if (isNearP4) craterHighlight.current.position.set(0.0, 0.65, 0.8);
    }

    const passCamZ = mobile
      ? track(pt, [
          [0.0, 4.4],
          [0.20, 4.4],
          [0.35, 4.3],
          [0.60, 4.4],
          [0.86, 4.2],
          [1.0, 4.4],
        ])
      : track(pt, [
          [0.0, 3.8],
          [0.20, 3.8],
          [0.35, 3.55], // VIP
          [0.60, 3.8], // Couple General
          [0.86, 3.7], // Couple VIP
          [1.0, 3.8],
        ]);

    // 3. Unified Coordinates
    const targetCamX = THREE.MathUtils.lerp(baseCamX, 0, blend) + ptrX;
    const targetCamY = THREE.MathUtils.lerp(baseCamY, 0, blend) - ptrY;
    const targetCamZ = THREE.MathUtils.lerp(baseCamZ, passCamZ, blend);

    const dampCam = mobile ? 6.5 : 5.0;
    const dampPos = mobile ? 6.8 : 4.8;
    const dampScale = mobile ? 6.2 : 4.6;
    const dampRot = mobile ? 5.5 : 4.2;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamX, dampCam, d);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamY, dampCam, d);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamZ, dampCam * 0.9, d);
    camera.lookAt(0, 0, 0);

    // 4. Moon Group Transformations
    if (group.current) {
      const targetGx = THREE.MathUtils.lerp(baseGx, passGx, blend);
      const targetGy = THREE.MathUtils.lerp(baseGy, passGy, blend);
      const targetScale = THREE.MathUtils.lerp(baseScale, passScale, blend);

      const targetGzRot = track(p, [
        [0, -0.12],
        [0.2, 0.28],
        [0.45, -0.18],
        [0.75, 0.35],
        [1.0, 0.05],
      ]);

      group.current.position.x = THREE.MathUtils.damp(group.current.position.x, targetGx, dampPos, d);
      group.current.position.y = THREE.MathUtils.damp(group.current.position.y, targetGy, dampPos, d);
      group.current.scale.setScalar(
        THREE.MathUtils.damp(group.current.scale.x, targetScale, dampScale, d),
      );
      group.current.rotation.z = THREE.MathUtils.damp(
        group.current.rotation.z,
        targetGzRot + Math.sin(time * 0.5) * 0.02,
        dampRot,
        d,
      );
    }

    // 5. Directional Light (Sun)
    if (sunLight.current) {
      const targetSunX = THREE.MathUtils.lerp(baseSunX, passLightX, blend) + ptrX * 1.5;
      const targetSunY = THREE.MathUtils.lerp(baseSunY, passLightY, blend) - ptrY * 1.2;
      const targetSunZ = THREE.MathUtils.lerp(baseSunZ, passLightZ, blend);
      const targetSunIntensity = THREE.MathUtils.lerp(baseSunIntensity, passLightIntensity, blend);

      sunLight.current.position.x = THREE.MathUtils.damp(
        sunLight.current.position.x,
        targetSunX,
        dampPos,
        d,
      );
      sunLight.current.position.y = THREE.MathUtils.damp(
        sunLight.current.position.y,
        targetSunY,
        dampPos,
        d,
      );
      sunLight.current.position.z = THREE.MathUtils.damp(
        sunLight.current.position.z,
        targetSunZ,
        dampPos,
        d,
      );
      sunLight.current.intensity = THREE.MathUtils.damp(
        sunLight.current.intensity,
        targetSunIntensity,
        dampScale,
        d,
      );
    }

    // Earthshine fill light (soft celestial shadow illumination)
    if (earthshineLight.current) {
      earthshineLight.current.intensity = 0.32;
    }

    if (backRimLight.current) {
      backRimLight.current.intensity = 1.8;
    }

    if (introSpinLight.current) {
      introSpinLight.current.intensity = 0;
    }

    // 6. Multi-Axis Rotation
    if (moonMesh.current) {
      const baseYRot = track(p, [
        [0, 1.2],
        [0.2, 2.8],
        [0.45, 4.2],
        [0.75, 6.0],
        [1.0, 7.8],
      ]);
      const passYRot = 4.2 + pt * 1.4;
      const targetRotY = THREE.MathUtils.lerp(baseYRot, passYRot, blend) + time * 0.05;

      const targetRotX =
        track(p, [
          [0, 0.08],
          [0.2, -0.22],
          [0.45, 0.16],
          [0.75, -0.28],
          [1.0, 0.05],
        ]) +
        Math.cos(time * 0.6) * 0.02;

      moonMesh.current.rotation.y = THREE.MathUtils.damp(
        moonMesh.current.rotation.y,
        targetRotY,
        dampRot,
        d,
      );
      moonMesh.current.rotation.x = THREE.MathUtils.damp(
        moonMesh.current.rotation.x,
        targetRotX,
        dampRot,
        d,
      );
    }

    // 7. Eclipse Ring Corona
    const targetEclipseVal = passEclipseIntensity * blend;
    setEclipseVal((prev) => THREE.MathUtils.damp(prev, targetEclipseVal, 5.0, d));
  });

  return (
    <>
      <ambientLight ref={ambientLightRef} intensity={0.015} color="#0d111a" />

      {/* Primary Key Light (Sun) */}
      <directionalLight
        ref={sunLight}
        position={[3.5, 0.6, 1.5]}
        intensity={5.5}
        color="#f4f7ff"
      />

      {/* Earthshine Fill Light - soft blue-gray shadow illumination revealing crater volume */}
      <directionalLight
        ref={earthshineLight}
        position={[-3.0, -1.0, 2.0]}
        intensity={0.32}
        color="#222c42"
      />

      {/* Grazing Rim Kicker */}
      <directionalLight
        ref={backRimLight}
        position={[0.0, 1.5, -2.5]}
        intensity={1.8}
        color="#c0d4f5"
      />

      <pointLight ref={craterHighlight} color="#f0f5ff" intensity={0} distance={2.0} decay={2.0} />

      <pointLight ref={introSpinLight} color="#ffffff" intensity={0} distance={2.5} decay={1.8} />

      <CosmicStarfield mobile={mobile} />

      <group ref={group}>
        <Suspense fallback={null}>
          <CustomMoonModel innerRef={moonMesh} mobile={mobile} />
          <EclipseRing intensity={eclipseVal} />
        </Suspense>
      </group>
    </>
  );
}

export default function MoonScene() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const update = () => setMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <Canvas
      dpr={mobile ? [1, 1.4] : [1, 1.8]}
      gl={{
        antialias: !mobile,
        alpha: true,
        powerPreference: "high-performance",
      }}
      camera={{ position: [0, 0, 4.2], fov: 40 }}
      style={{ pointerEvents: "none" }}
    >
      <RealMoon mobile={mobile} />
    </Canvas>
  );
}
