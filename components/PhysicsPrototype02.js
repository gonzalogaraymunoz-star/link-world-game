"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line, Stars } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../app/physics-02/physics02.module.css";

const BUSINESSES = [
  { id: "caracol", label: "CARACOL", meta: "negocio comprobado", signal: .92 },
  { id: "lama", label: "LAMA", meta: "turismo", signal: .78 },
  { id: "hotel-experience", label: "HOTEL EXPERIENCE", meta: "hospitality", signal: .72 },
  { id: "cupones", label: "LINK CUPONES", meta: "modelo en desarrollo", signal: .45 },
  { id: "karaoke", label: "LINK KARAOKE", meta: "producto", signal: .66 },
  { id: "rrss", label: "LINK RRSS", meta: "infraestructura", signal: .84 }
];

const STAGES = [
  { id: "mar", label: "MAR", meta: "atraer y escuchar" },
  { id: "venta", label: "VENTA", meta: "convertir señal" },
  { id: "cierre", label: "CIERRE", meta: "confirmar acuerdo" },
  { id: "boarding", label: "BOARDING", meta: "preparar entrega" },
  { id: "opera", label: "OPERA", meta: "cumplir promesa" },
  { id: "postventa", label: "POSTVENTA", meta: "aprender y volver" }
];

const STAGE_ARTIFACTS = {
  mar: [
    ["linkrrss", "LINK RRSS", "mesa"],
    ["instagram", "INSTAGRAM", "canal"],
    ["contenido", "CONTENIDO", "artefacto"],
    ["escucha", "COMUNESCUCHA", "señal"],
    ["metricas", "MÉTRICAS", "evidencia"],
    ["campanas", "CAMPAÑAS", "acción"]
  ],
  venta: [
    ["leads", "LEADS", "señal"],
    ["crm", "CRM", "mesa"],
    ["cotiza", "COTIZACIONES", "artefacto"],
    ["pipeline", "PIPELINE", "estado"],
    ["conversa", "CONVERSACIONES", "evidencia"],
    ["conversion", "CONVERSIÓN", "métrica"]
  ],
  cierre: [
    ["acuerdo", "ACUERDO", "evidencia"],
    ["pago", "PAGO", "verdad económica"],
    ["contrato", "CONTRATO", "artefacto"],
    ["handoff", "HANDOFF", "acción"]
  ],
  boarding: [
    ["datos", "DATOS", "entrada"],
    ["docs", "DOCUMENTOS", "artefacto"],
    ["checklist", "CHECKLIST", "estado"],
    ["agenda", "AGENDA", "coordinación"]
  ],
  opera: [
    ["servicio", "SERVICIO", "ejecución"],
    ["personas", "PERSONAS", "operación"],
    ["calendario", "CALENDARIO", "coordinación"],
    ["evidencia", "EVIDENCIA", "prueba"],
    ["alertas", "ALERTAS", "señal"]
  ],
  postventa: [
    ["feedback", "FEEDBACK", "aprendizaje"],
    ["review", "REVIEW", "evidencia"],
    ["referido", "REFERIDO", "señal"],
    ["recompra", "RECOMPRA", "economía"],
    ["memoria", "MEMORIA", "aprendizaje"]
  ]
};

const ROOT = {
  id: "link",
  label: "LINK WORLD",
  meta: "organismo",
  kind: "ecosystem"
};

function childrenFor(current) {
  if (current.kind === "ecosystem") return BUSINESSES.map(x => ({ ...x, kind: "business" }));
  if (current.kind === "business") {
    return STAGES.map(x => ({
      ...x,
      id: current.id + ":" + x.id,
      stageId: x.id,
      kind: "stage"
    }));
  }
  if (current.kind === "stage") {
    return (STAGE_ARTIFACTS[current.stageId] || []).map(([id, label, meta]) => ({
      id: current.id + ":" + id,
      label,
      meta,
      kind: "artifact"
    }));
  }
  return [];
}

function orbitPosition(index, count, depth) {
  const radius = depth === 0 ? 6.65 : depth === 1 ? 5.75 : 4.95;
  const angle = (index / Math.max(count, 1)) * Math.PI * 2 - Math.PI / 2;
  const yScale = depth === 0 ? .64 : depth === 1 ? .7 : .76;
  return [
    Math.cos(angle) * radius,
    Math.sin(angle) * radius * yScale,
    Math.sin(angle * 2) * .48 - .16
  ];
}

function CameraRig({ depth, inspectedIndex, childCount, travelPhase }) {
  const lookAt = useRef(new THREE.Vector3());
  const position = useRef(new THREE.Vector3(0, 0, 15.1));

  useFrame((state, delta) => {
    const baseZ = depth === 0 ? 15.2 : depth === 1 ? 14.1 : 13.35;
    const travelZ = travelPhase === "outgoing" ? baseZ - 3.25 : travelPhase === "incoming" ? baseZ + 1.45 : baseZ;
    let focusX = state.pointer.x * .16;
    let focusY = state.pointer.y * .1;

    if (inspectedIndex >= 0) {
      const p = orbitPosition(inspectedIndex, childCount, depth);
      focusX += p[0] * .075;
      focusY += p[1] * .075;
    }

    const target = new THREE.Vector3(focusX, focusY, travelZ);
    const lambda = travelPhase === "idle" ? 3.1 : 4.4;
    position.current.x = THREE.MathUtils.damp(position.current.x, target.x, lambda, delta);
    position.current.y = THREE.MathUtils.damp(position.current.y, target.y, lambda, delta);
    position.current.z = THREE.MathUtils.damp(position.current.z, target.z, lambda, delta);

    lookAt.current.x = THREE.MathUtils.damp(lookAt.current.x, focusX * .22, 3.5, delta);
    lookAt.current.y = THREE.MathUtils.damp(lookAt.current.y, focusY * .22, 3.5, delta);

    state.camera.position.copy(position.current);
    state.camera.lookAt(lookAt.current);
  });

  return null;
}

function Core({ current, depth, travelPhase }) {
  const group = useRef();
  const orb = useRef();
  const size = depth === 0 ? 1.02 : depth === 1 ? .94 : .86;

  useFrame((state, delta) => {
    if (!group.current || !orb.current) return;
    const target = travelPhase === "outgoing" ? 1.18 : travelPhase === "incoming" ? .88 : 1;
    const s = THREE.MathUtils.damp(group.current.scale.x, target, 4.6, delta);
    group.current.scale.setScalar(s);
    orb.current.rotation.z += delta * .08;
    group.current.rotation.y += delta * .04;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * .72) * .012;
    group.current.children[0]?.scale?.setScalar(pulse);
  });

  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[size, 2]} />
        <meshStandardMaterial
          color="#d8ff72"
          emissive="#72911e"
          emissiveIntensity={.3}
          roughness={.48}
          metalness={.08}
        />
      </mesh>
      <mesh ref={orb} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[size * 1.72, .008, 6, 110]} />
        <meshBasicMaterial color="#d8ff72" transparent opacity={.23} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[size * 2.25, .004, 6, 120]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={.065} />
      </mesh>
      <Html center position={[0, -size - .78, 0]} distanceFactor={11.6}>
        <div className={styles.coreLabel}>
          <b>{current.label}</b>
          <span>{current.meta}</span>
        </div>
      </Html>
    </group>
  );
}

function OrbitNode({ node, position, selected, dimmed, onPick, travelPhase }) {
  const group = useRef();
  const mat = useRef();
  const ring = useRef();
  const target = useMemo(() => new THREE.Vector3(...position), [position]);

  const baseScale =
    node.kind === "business" ? .54 :
    node.kind === "stage" ? .46 : .39;

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.position.x = THREE.MathUtils.damp(group.current.position.x, target.x, 3.5, delta);
    group.current.position.y = THREE.MathUtils.damp(group.current.position.y, target.y, 3.5, delta);
    group.current.position.z = THREE.MathUtils.damp(group.current.position.z, target.z, 3.5, delta);

    const selectedScale = selected ? baseScale * 1.18 : baseScale;
    const travelScale = travelPhase === "outgoing" ? selectedScale * .9 : selectedScale;
    const s = THREE.MathUtils.damp(group.current.scale.x, travelScale, 4.2, delta);
    group.current.scale.setScalar(s);

    group.current.rotation.y += delta * (selected ? .16 : .055);

    if (mat.current) {
      const opacity = selected ? .98 : dimmed ? .4 : .72;
      mat.current.opacity = THREE.MathUtils.damp(mat.current.opacity, opacity, 4, delta);
    }
    if (ring.current) {
      const opacity = selected ? .42 : dimmed ? .035 : .085;
      ring.current.opacity = THREE.MathUtils.damp(ring.current.opacity, opacity, 4, delta);
    }
  });

  return (
    <group ref={group} scale={.12}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onPick(node);
        }}
        onPointerOver={() => { document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = "default"; }}
      >
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          ref={mat}
          color={selected ? "#d8ff72" : "#e7eae4"}
          emissive={selected ? "#6b8b20" : "#141815"}
          emissiveIntensity={selected ? .38 : .08}
          roughness={.62}
          metalness={.06}
          transparent
          opacity={.72}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.46, .018, 6, 72]} />
        <meshBasicMaterial ref={ring} color={selected ? "#d8ff72" : "#ffffff"} transparent opacity={.085} />
      </mesh>
      <Html center position={[0, -1.82, 0]} distanceFactor={11}>
        <div className={[
          styles.nodeLabel,
          selected ? styles.nodeLabelSelected : "",
          dimmed ? styles.nodeLabelDim : ""
        ].join(" ")}>
          <b>{node.label}</b>
          <span>{node.meta}</span>
        </div>
      </Html>
    </group>
  );
}

function SceneContents({ current, children, inspectedId, onPick, depth, travelPhase }) {
  const scene = useRef();

  useFrame((state, delta) => {
    if (!scene.current) return;
    const targetScale = travelPhase === "outgoing" ? 1.055 : travelPhase === "incoming" ? .955 : 1;
    const s = THREE.MathUtils.damp(scene.current.scale.x, targetScale, 4, delta);
    scene.current.scale.setScalar(s);
    scene.current.rotation.z = THREE.MathUtils.damp(scene.current.rotation.z, state.pointer.x * .004, 2.2, delta);
  });

  return (
    <group ref={scene}>
      <Core current={current} depth={depth} travelPhase={travelPhase} />
      {children.map((node, index) => {
        const position = orbitPosition(index, children.length, depth);
        const selected = inspectedId === node.id;
        const dimmed = !!inspectedId && !selected;
        return (
          <group key={node.id}>
            <Line
              points={[[0, 0, 0], position]}
              color={selected ? "#d8ff72" : "#ffffff"}
              transparent
              opacity={selected ? .22 : dimmed ? .018 : .042}
              lineWidth={selected ? 1 : .55}
            />
            <OrbitNode
              node={node}
              position={position}
              selected={selected}
              dimmed={dimmed}
              onPick={onPick}
              travelPhase={travelPhase}
            />
          </group>
        );
      })}
    </group>
  );
}

function WorldScene({ current, children, inspectedId, onPick, depth, travelPhase }) {
  const inspectedIndex = children.findIndex(x => x.id === inspectedId);

  return (
    <>
      <color attach="background" args={["#090b0a"]} />
      <fog attach="fog" args={["#090b0a", 13, 27]} />
      <ambientLight intensity={.62} />
      <directionalLight position={[4, 7, 9]} intensity={.92} color="#ffffff" />
      <pointLight position={[-6, -4, 5]} intensity={.58} color="#d8ff72" />
      <Stars radius={46} depth={22} count={220} factor={1} saturation={0} fade speed={.12} />
      <CameraRig
        depth={depth}
        inspectedIndex={inspectedIndex}
        childCount={children.length}
        travelPhase={travelPhase}
      />
      <SceneContents
        current={current}
        children={children}
        inspectedId={inspectedId}
        onPick={onPick}
        depth={depth}
        travelPhase={travelPhase}
      />
    </>
  );
}

export default function PhysicsPrototype02() {
  const [path, setPath] = useState([ROOT]);
  const [inspectedId, setInspectedId] = useState(null);
  const [travelPhase, setTravelPhase] = useState("idle");
  const [pendingMove, setPendingMove] = useState(null);

  const current = path[path.length - 1];
  const children = useMemo(() => childrenFor(current), [current]);
  const inspected = children.find(x => x.id === inspectedId) || null;
  const depth = path.length - 1;

  useEffect(() => {
    if (!pendingMove || travelPhase !== "outgoing") return;
    const timer = window.setTimeout(() => {
      if (pendingMove.type === "enter") {
        setPath(items => [...items, pendingMove.node]);
      } else if (pendingMove.type === "back") {
        setPath(items => items.slice(0, -1));
      } else if (pendingMove.type === "root") {
        setPath([ROOT]);
      }
      setInspectedId(null);
      setTravelPhase("incoming");
      window.setTimeout(() => {
        setTravelPhase("idle");
        setPendingMove(null);
      }, 620);
    }, 520);
    return () => window.clearTimeout(timer);
  }, [pendingMove, travelPhase]);

  function move(payload) {
    if (travelPhase !== "idle") return;
    setPendingMove(payload);
    setTravelPhase("outgoing");
  }

  function enter(node) {
    if (!node || node.kind === "artifact") return;
    move({ type: "enter", node });
  }

  function pick(node) {
    if (travelPhase !== "idle") return;
    if (inspectedId === node.id) {
      enter(node);
      return;
    }
    setInspectedId(node.id);
  }

  const description = inspected
    ? inspected.kind === "artifact"
      ? "Objeto terminal por ahora. Después abrirá su mesa, acción, evidencia o herramienta real."
      : "El resto baja de intensidad para conservar contexto. Entra y esta dimensión ocupará el centro."
    : "Un nivel a la vez. Selecciona, comprende y entra sin perder tu posición dentro de LINK.";

  return (
    <main className={styles.shell}>
      <Canvas
        className={styles.canvas}
        camera={{ position: [0,0,15.2], fov: 42, near: .1, far: 90 }}
        dpr={[1,1.35]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onPointerMissed={() => travelPhase === "idle" && setInspectedId(null)}
      >
        <WorldScene
          current={current}
          children={children}
          inspectedId={inspectedId}
          onPick={pick}
          depth={depth}
          travelPhase={travelPhase}
        />
      </Canvas>

      <div className={styles.vignette} />
      <div className={styles.travelWash + (travelPhase !== "idle" ? " " + styles.on : "")} />

      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.mark}>••</div>
          <div>
            <b>LINK WORLD · FÍSICA 02</b>
            <small>semantic zoom · respiración espacial</small>
          </div>
        </div>
        <div className={styles.mode}>
          <b>{travelPhase === "idle" ? "EXPLORAR" : "ENTRANDO"}</b>
          <small>{travelPhase === "idle" ? "1 clic observa · 2 entra" : "manteniendo contexto"}</small>
        </div>
      </header>

      <nav className={styles.breadcrumbs} aria-label="Ruta conceptual">
        {path.map((item, index) => (
          <span className={styles.crumb} key={item.id}>
            {index ? "› " : ""}{item.label}
          </span>
        ))}
      </nav>

      <div className={styles.depthRail} aria-hidden="true">
        {[0,1,2].map(level => (
          <i
            key={level}
            className={styles.depthDot + (depth === level ? " " + styles.active : "")}
          />
        ))}
      </div>

      <div className={styles.centerHint}>
        {travelPhase === "idle" ? "ESPACIO PARA ORIENTARSE · EL FOCO MANDA" : "CAMBIANDO DE DIMENSIÓN"}
      </div>

      <section className={styles.bottomDock + (travelPhase !== "idle" ? " " + styles.traveling : "")}>
        <div className={styles.dockRow}>
          <div className={styles.dockCopy}>
            <span className={styles.kicker}>{inspected ? "EN FOCO" : "DIMENSIÓN ACTUAL"}</span>
            <strong>{inspected?.label || current.label}</strong>
            <p>{description}</p>
          </div>
          <div className={styles.actions}>
            {path.length > 1 ? (
              <button
                className={styles.button}
                disabled={travelPhase !== "idle"}
                onClick={() => move({ type: "back" })}
              >
                ← Volver
              </button>
            ) : null}
            {path.length > 1 ? (
              <button
                className={styles.button}
                disabled={travelPhase !== "idle"}
                onClick={() => move({ type: "root" })}
              >
                LINK
              </button>
            ) : null}
            {inspected && inspected.kind !== "artifact" ? (
              <button
                className={styles.button + " " + styles.primary}
                disabled={travelPhase !== "idle"}
                onClick={() => enter(inspected)}
              >
                Entrar →
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
