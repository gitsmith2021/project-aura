"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox, Environment } from "@react-three/drei";
import * as THREE from "three";
import { ScrollTrigger } from "@/lib/gsap";

type CardKind = "timetable" | "fees" | "attendance";

/* ── Canvas-drawn UI textures (no image assets needed) ─────────────────── */

function makeUITexture(kind: CardKind): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext("2d")!;

  // panel background + header bar
  ctx.fillStyle = "#0F172A";
  ctx.fillRect(0, 0, 512, 320);
  ctx.fillStyle = "#1E293B";
  ctx.fillRect(0, 0, 512, 48);
  ctx.fillStyle = "#7C3AED";
  ctx.beginPath();
  ctx.roundRect(16, 14, 20, 20, 6);
  ctx.fill();
  ctx.fillStyle = "#94A3B8";
  ctx.font = "bold 16px sans-serif";
  const titles: Record<CardKind, string> = {
    timetable: "Timetable — Week 24",
    fees: "Fee Payments",
    attendance: "Attendance Analytics",
  };
  ctx.fillText(titles[kind], 48, 30);

  if (kind === "timetable") {
    const colors = ["#7C3AED", "#06B6D4", "#10B981", "#F59E0B", "#334155"];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 5; c++) {
        ctx.fillStyle = (r + c) % 3 === 0 ? colors[(r + c) % colors.length] : "#1E293B";
        ctx.beginPath();
        ctx.roundRect(20 + c * 96, 64 + r * 60, 84, 48, 8);
        ctx.fill();
      }
    }
  } else if (kind === "fees") {
    const rows = [
      { w: 380, color: "#10B981" },
      { w: 290, color: "#34D399" },
      { w: 210, color: "#7C3AED" },
      { w: 150, color: "#A78BFA" },
    ];
    rows.forEach((row, i) => {
      ctx.fillStyle = "#1E293B";
      ctx.beginPath();
      ctx.roundRect(24, 72 + i * 58, 464, 38, 8);
      ctx.fill();
      ctx.fillStyle = row.color;
      ctx.beginPath();
      ctx.roundRect(24, 72 + i * 58, row.w, 38, 8);
      ctx.fill();
    });
  } else {
    // attendance — three progress rings
    const rings = [
      { x: 100, pct: 0.92, color: "#7C3AED" },
      { x: 256, pct: 0.78, color: "#10B981" },
      { x: 412, pct: 0.64, color: "#F59E0B" },
    ];
    rings.forEach(ring => {
      ctx.lineWidth = 14;
      ctx.strokeStyle = "#1E293B";
      ctx.beginPath();
      ctx.arc(ring.x, 180, 56, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = ring.color;
      ctx.beginPath();
      ctx.arc(ring.x, 180, 56, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ring.pct);
      ctx.stroke();
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/* ── Floating glass card ───────────────────────────────────────────────── */

type CardConfig = {
  kind: CardKind;
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
  phase: number;
};

// Biased toward the left/center so the cards never clash with the demo form
// panel on the right — the form must stay the most legible element.
const CARDS: CardConfig[] = [
  { kind: "timetable",  position: [-1.2,  0.0,  0.5], rotation: [-0.05, 0.15,  0.02], size: [2.6, 1.7], phase: 0 },
  { kind: "fees",       position: [-3.0,  0.7, -0.6], rotation: [ 0.05, 0.25, -0.03], size: [2.2, 1.5], phase: 2.1 },
  { kind: "attendance", position: [-4.2, -0.6, -1.6], rotation: [ 0.02, 0.35,  0.04], size: [2.0, 1.4], phase: 4.2 },
];

function GlassCard({ config }: { config: CardConfig }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useMemo(() => makeUITexture(config.kind), [config.kind]);

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(state => {
    const mesh = meshRef.current;
    if (!mesh) return;
    // sine-wave float — different phase per card so they don't move together
    mesh.position.y =
      config.position[1] + Math.sin(state.clock.elapsedTime * 0.5 + config.phase) * 0.1;
  });

  return (
    <RoundedBox
      ref={meshRef}
      args={[config.size[0], config.size[1], 0.08]}
      radius={0.04}
      smoothness={4}
      position={config.position}
      rotation={config.rotation}
    >
      <meshPhysicalMaterial
        map={texture}
        transmission={0.6}
        roughness={0.1}
        metalness={0}
        thickness={0.5}
        envMapIntensity={1}
        color="#7C3AED"
        transparent
      />
    </RoundedBox>
  );
}

/* ── Card group: mouse parallax + scroll drift/fade ────────────────────── */

function CardsGroup({ simple }: { simple: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const scrollProgress = useRef(0);

  useEffect(() => {
    // Window-level listener: the canvas sits behind the hero content, so
    // canvas-local pointer events would never fire.
    const onMove = (e: PointerEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const hero = document.getElementById("hero");
    const st = hero
      ? ScrollTrigger.create({
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: true,
          onUpdate: self => { scrollProgress.current = self.progress; },
        })
      : null;

    return () => {
      window.removeEventListener("pointermove", onMove);
      st?.kill();
    };
  }, []);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const maxTilt = THREE.MathUtils.degToRad(5); // subtle, Apple-style
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, mouse.current.x * maxTilt, 0.05);
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, -mouse.current.y * maxTilt, 0.05);

    // on scroll: drift away and fade out
    const p = scrollProgress.current;
    group.position.z = THREE.MathUtils.lerp(group.position.z, -2 * p, 0.1);
    const opacity = 1 - p;
    group.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        (obj.material as THREE.MeshPhysicalMaterial).opacity = opacity;
      }
    });
  });

  const cards = simple ? CARDS.slice(0, 1) : CARDS;

  return (
    <group ref={groupRef}>
      {cards.map(card => <GlassCard key={card.kind} config={card} />)}
      <pointLight color="#7C3AED" intensity={1.2} decay={0} position={[-2.5, 0, -2.5]} />
    </group>
  );
}

/* ── Scene root ────────────────────────────────────────────────────────── */

type HeroSceneProps = {
  simple?: boolean;
  onReady?: () => void;
};

export default function HeroScene({ simple = false, onReady }: HeroSceneProps) {
  return (
    <Canvas
      gl={{ antialias: true, alpha: true }}
      dpr={simple ? [1, 1.5] : [1, 2]}
      camera={{ position: [0, 0, 6], fov: 45 }}
      onCreated={() => onReady?.()}
      style={{ pointerEvents: "none" }}
    >
      <ambientLight intensity={0.3} color="#ffffff" />
      <pointLight color="#7C3AED" intensity={2} decay={0} position={[2, 3, 4]} />
      <pointLight color="#10B981" intensity={0.5} decay={0} position={[-3, -1, 2]} />
      <CardsGroup simple={simple} />
      {/* env map in its own Suspense — cards render even while the HDR loads */}
      <Suspense fallback={null}>
        <Environment preset="city" />
      </Suspense>
    </Canvas>
  );
}
