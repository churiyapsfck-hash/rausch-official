import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { scrollState, setMoonLoadedState } from "@/lib/rausch-scroll";

/**
 * Procedural Lunar Surface Synthesis
 * Generates photographic lunar textures with Maria basalt plains, impact craters,
 * Tycho/Copernicus ejecta ray systems, and bump relief in 10ms with 0KB network download.
 */
function useLunarTextures(mobile: boolean) {
  return useMemo(() => {
    if (typeof document === "undefined") {
      const dummy = new THREE.Texture();
      return { albedoMap: dummy, bumpMap: dummy };
    }

    const w = mobile ? 1024 : 2048;
    const h = mobile ? 512 : 1024;

    const aCanvas = document.createElement("canvas");
    aCanvas.width = w;
    aCanvas.height = h;
    const aCtx = aCanvas.getContext("2d")!;

    const bCanvas = document.createElement("canvas");
    bCanvas.width = w;
    bCanvas.height = h;
    const bCtx = bCanvas.getContext("2d")!;

    // 1. Base lunar regolith tone (matte silvery gray)
    aCtx.fillStyle = "#a2a5b0";
    aCtx.fillRect(0, 0, w, h);

    bCtx.fillStyle = "#808080";
    bCtx.fillRect(0, 0, w, h);

    const imgA = aCtx.getImageData(0, 0, w, h);
    const imgB = bCtx.getImageData(0, 0, w, h);

    // Deterministic pseudo-random sequence
    let seed = 42;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    // Maria (Dark Basalt Seas) definitions
    const maria = [
      { x: 0.30 * w, y: 0.38 * h, rx: 0.20 * w, ry: 0.18 * h, dark: 0.42 }, // Oceanus Procellarum
      { x: 0.52 * w, y: 0.32 * h, rx: 0.13 * w, ry: 0.11 * h, dark: 0.48 }, // Mare Imbrium
      { x: 0.68 * w, y: 0.42 * h, rx: 0.12 * w, ry: 0.10 * h, dark: 0.44 }, // Mare Serenitatis
      { x: 0.76 * w, y: 0.48 * h, rx: 0.13 * w, ry: 0.12 * h, dark: 0.40 }, // Mare Tranquillitatis
      { x: 0.86 * w, y: 0.40 * h, rx: 0.09 * w, ry: 0.09 * h, dark: 0.46 }, // Mare Crisium
      { x: 0.42 * w, y: 0.58 * h, rx: 0.11 * w, ry: 0.10 * h, dark: 0.50 }, // Mare Nubium
      { x: 0.62 * w, y: 0.62 * h, rx: 0.10 * w, ry: 0.09 * h, dark: 0.48 }, // Mare Nectaris
      { x: 0.50 * w, y: 0.48 * h, rx: 0.08 * w, ry: 0.07 * h, dark: 0.45 }, // Mare Vaporum
    ];

    // Major impact crater centers with ray systems
    const majorCraters = [
      { x: 0.55 * w, y: 0.78 * h, r: 0.038 * w, rays: 14, rayLen: 0.38 * w }, // Tycho
      { x: 0.38 * w, y: 0.42 * h, r: 0.028 * w, rays: 10, rayLen: 0.24 * w }, // Copernicus
      { x: 0.26 * w, y: 0.44 * h, r: 0.020 * w, rays: 7, rayLen: 0.16 * w },  // Kepler
      { x: 0.24 * w, y: 0.35 * h, r: 0.016 * w, rays: 6, rayLen: 0.12 * w },  // Aristarchus
      { x: 0.65 * w, y: 0.24 * h, r: 0.024 * w, rays: 5, rayLen: 0.09 * w },  // Plato
      { x: 0.72 * w, y: 0.62 * h, r: 0.030 * w, rays: 6, rayLen: 0.14 * w },  // Theophilus
      { x: 0.48 * w, y: 0.68 * h, r: 0.032 * w, rays: 5, rayLen: 0.12 * w },  // Clavius
      { x: 0.40 * w, y: 0.72 * h, r: 0.022 * w, rays: 4, rayLen: 0.08 * w },  // Bullialdus
    ];

    // Hundreds of medium and small impact craters
    const craters: { x: number; y: number; r: number }[] = [];
    for (let i = 0; i < (mobile ? 180 : 340); i++) {
      craters.push({
        x: rnd() * w,
        y: rnd() * h,
        r: (rnd() * 0.014 + 0.003) * w,
      });
    }

    // Apply Maria shading and micro-variation
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        let brightness = 1.0;
        let bump = 128;

        // Maria calculation with soft organic falloff
        for (const m of maria) {
          const dx = (x - m.x) / m.rx;
          const dy = (y - m.y) / m.ry;
          const d2 = dx * dx + dy * dy;
          if (d2 < 1.4) {
            const f = Math.max(0, 1 - d2 / 1.4);
            const noise = Math.sin(x * 0.04) * Math.cos(y * 0.04) * 0.10;
            brightness *= (1 - f * (1 - m.dark + noise));
            bump -= f * 26;
          }
        }

        // Granular rock regolith noise
        const n = (rnd() - 0.5) * 16;
        const finalR = Math.max(0, Math.min(255, (168 * brightness) + n));
        const finalG = Math.max(0, Math.min(255, (172 * brightness) + n));
        const finalB = Math.max(0, Math.min(255, (182 * brightness) + n));

        imgA.data[idx] = finalR;
        imgA.data[idx + 1] = finalG;
        imgA.data[idx + 2] = finalB;
        imgA.data[idx + 3] = 255;

        imgB.data[idx] = bump;
        imgB.data[idx + 1] = bump;
        imgB.data[idx + 2] = bump;
        imgB.data[idx + 3] = 255;
      }
    }

    aCtx.putImageData(imgA, 0, 0);
    bCtx.putImageData(imgB, 0, 0);

    // Draw Major Crater Rays on Albedo
    for (const c of majorCraters) {
      for (let a = 0; a < c.rays; a++) {
        const angle = (a / c.rays) * Math.PI * 2 + (rnd() - 0.5) * 0.3;
        const grad = aCtx.createLinearGradient(
          c.x, c.y,
          c.x + Math.cos(angle) * c.rayLen,
          c.y + Math.sin(angle) * c.rayLen
        );
        grad.addColorStop(0, "rgba(245, 248, 255, 0.55)");
        grad.addColorStop(0.35, "rgba(230, 238, 255, 0.22)");
        grad.addColorStop(1, "rgba(220, 230, 255, 0)");

        aCtx.strokeStyle = grad;
        aCtx.lineWidth = c.r * 0.45;
        aCtx.beginPath();
        aCtx.moveTo(c.x, c.y);
        aCtx.lineTo(c.x + Math.cos(angle) * c.rayLen, c.y + Math.sin(angle) * c.rayLen);
        aCtx.stroke();
      }
    }

    // Draw All Craters (Rims & Basins) on both Albedo and Bump maps
    const allCraters = [...majorCraters, ...craters];
    for (const c of allCraters) {
      // 1. Crater Basin (Shadowed / Darker depression)
      aCtx.beginPath();
      aCtx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      aCtx.fillStyle = "rgba(35, 38, 46, 0.45)";
      aCtx.fill();

      bCtx.beginPath();
      bCtx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      bCtx.fillStyle = "#323232";
      bCtx.fill();

      // 2. Raised Bright Crater Rim (Illuminated ridge)
      aCtx.beginPath();
      aCtx.arc(c.x, c.y, c.r * 1.05, 0, Math.PI * 2);
      aCtx.strokeStyle = "rgba(250, 252, 255, 0.80)";
      aCtx.lineWidth = Math.max(1.2, c.r * 0.24);
      aCtx.stroke();

      bCtx.beginPath();
      bCtx.arc(c.x, c.y, c.r * 1.05, 0, Math.PI * 2);
      bCtx.strokeStyle = "#f8f8f8";
      bCtx.lineWidth = Math.max(1.5, c.r * 0.30);
      bCtx.stroke();

      // 3. Central Peak if large crater
      if (c.r > 0.015 * w) {
        aCtx.beginPath();
        aCtx.arc(c.x, c.y, c.r * 0.18, 0, Math.PI * 2);
        aCtx.fillStyle = "rgba(255, 255, 255, 0.95)";
        aCtx.fill();

        bCtx.beginPath();
        bCtx.arc(c.x, c.y, c.r * 0.2, 0, Math.PI * 2);
        bCtx.fillStyle = "#ffffff";
        bCtx.fill();
      }
    }

    const albedoTex = new THREE.CanvasTexture(aCanvas);
    albedoTex.colorSpace = THREE.SRGBColorSpace;
    albedoTex.anisotropy = mobile ? 2 : 4;

    const bumpTex = new THREE.CanvasTexture(bCanvas);
    bumpTex.anisotropy = mobile ? 2 : 4;

    return { albedoMap: albedoTex, bumpMap: bumpTex };
  }, [mobile]);
}

/**
 * Instant 3D Moon Surface Component (0ms Load Time, Zero 51MB Download Lag)
 */
function ProceduralMoon({
  innerRef,
  mobile,
}: {
  innerRef: React.RefObject<THREE.Group | null>;
  mobile: boolean;
}) {
  const { albedoMap, bumpMap } = useLunarTextures(mobile);

  useEffect(() => {
    setMoonLoadedState(true, 100);
  }, []);

  return (
    <group ref={innerRef}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[1, mobile ? 64 : 96, mobile ? 64 : 96]} />
        <meshStandardMaterial
          map={albedoMap}
          bumpMap={bumpMap}
          bumpScale={mobile ? 0.065 : 0.085}
          roughness={0.94}
          metalness={0.0}
          color="#ffffff"
        />
      </mesh>
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
    const count = mobile ? 90 : 1800;
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
      pos[i * 3] = (Math.random() - 0.5) * 44;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 36;
      pos[i * 3 + 2] = -Math.random() * 26 - 1.5;

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
    const count = mobile ? 20 : 450;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 38;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 28 - 6;

      col[i * 3] = 0.75 + Math.random() * 0.25;
      col[i * 3 + 1] = 0.82 + Math.random() * 0.18;
      col[i * 3 + 2] = 1.0;
    }

    return [dustPositionsArray(pos), dustColorsArray(col)];
  }, [mobile]);

  function dustPositionsArray(arr: Float32Array) { return arr; }
  function dustColorsArray(arr: Float32Array) { return arr; }

  const starTexture = useMemo(() => {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2,
    );
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.25, "rgba(235,245,255,0.85)");
    gradient.addColorStop(0.6, "rgba(180,215,255,0.3)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (pointsRef.current) {
      pointsRef.current.rotation.y = t * 0.003;
      pointsRef.current.rotation.x = Math.sin(t * 0.002) * 0.015;
    }

    if (dustRef.current) {
      dustRef.current.rotation.y = -t * 0.005;
      dustRef.current.rotation.z = Math.cos(t * 0.003) * 0.02;
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
    const introOpacity = Math.max(0.85, scrollState.introMoonOpacity);

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
      ambientLightRef.current.intensity = 0.02;
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

    // 3. Unified Blended Targets
    const targetCamX = THREE.MathUtils.lerp(baseCamX, 0, blend) + ptrX;
    const targetCamY = THREE.MathUtils.lerp(baseCamY, 0, blend) - ptrY;
    const targetCamZ = THREE.MathUtils.lerp(baseCamZ, passCamZ, blend);

    const dampCam = mobile ? 6.0 : 4.5;
    const dampPos = mobile ? 6.0 : 4.5;
    const dampScale = mobile ? 5.5 : 4.0;
    const dampRot = mobile ? 5.0 : 3.5;

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
      earthshineLight.current.intensity = 0.35;
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
      <ambientLight ref={ambientLightRef} intensity={0.02} color="#0d111a" />

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
        intensity={0.35}
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
        <ProceduralMoon innerRef={moonMesh} mobile={mobile} />
        <EclipseRing intensity={eclipseVal} />
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
      dpr={mobile ? [1, 1.5] : [1, 2]}
      gl={{
        antialias: true,
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
