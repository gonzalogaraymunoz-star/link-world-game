"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line, Stars } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef, useState } from "react";
import styles from "../app/physics/physics.module.css";

const BUSINESSES = [
  { id: "caracol", label: "CARACOL", meta: "negocio comprobado", signal: 0.92 },
  { id: "lama", label: "LAMA", meta: "turismo", signal: 0.78 },
  { id: "hotel-experience", label: "HOTEL EXPERIENCE", meta: "hospitality", signal: 0.72 },
  { id: "cupones", label: "LINK CUPONES", meta: "modelo en desarrollo", signal: 0.45 },
  { id: "karaoke", label: "LINK KARAOKE", meta: "producto", signal: 0.66 },
  { id: "rrss", label: "LINK RRSS", meta: "infraestructura", signal: 0.84 }
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

function currentChildren(current) {
  if (current.kind === "ecosystem") {
    return BUSINESSES.map(item => ({ ...item, kind: "business" }));
  }
  if (current.kind === "business") {
    return STAGES.map(item => ({
      ...item,
      id: current.id + ":" + item.id,
      stageId: item.id,
      kind: "stage",
      meta: item.meta
    }));
  }
  if (current.kind === "stage") {
    const items = STAGE_ARTIFACTS[current.stageId] || STAGE_ARTIFACTS.mar;
    return items.map(([id, label, meta]) => ({
      id: current.id + ":" + id,
      label,
      meta,
      kind: "artifact"
    }));
  }
  return [];
}

function orbitPosition(index, count, depth) {
  const radius = depth === 0 ? 5.15 : depth === 1 ? 4.25 : 3.6;
  const angle = (index / Math.max(1, count)) * Math.PI * 2 - Math.PI / 2;
  const yScale = depth === 0 ? 0.72 : 0.82;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius * yScale;
  const z = Math.sin(angle * 2) * 0.8 - Math.abs(Math.cos(angle)) * 0.25;
  return [x, y, z];
}

function CameraRig({ depth }) {
  useFrame((state) => {
    const z = 12.4 - Math.min(depth, 3) * 0.55;
    const target = new THREE.Vector3(
      state.pointer.x * 0.42,
      state.pointer.y * 0.22,
      z
    );
    state.camera.position.lerp(target, 0.045);
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

function Core({ current, depth }) {
  const ref = useRef();
  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.12;
    ref.current.rotation.x += delta * 0.05;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.2) * 0.035;
    ref.current.scale.setScalar(pulse);
  });

  const size = depth === 0 ? 1.28 : depth === 1 ? 1.16 : 1.04;

  return (
    <group>
      <mesh ref={ref}>
        <icosahedronGeometry args={[size, 2]} />
        <meshStandardMaterial
          color="#d8ff72"
          emissive="#7a9b24"
          emissiveIntensity={0.42}
          roughness={0.42}
          metalness={0.15}
          wireframe={false}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[size * 1.48, 0.012, 8, 96]} />
        <meshBasicMaterial color="#d8ff72" transparent opacity={0.34} />
      </mesh>
      <Html center position={[0, -size - 0.72, 0]} distanceFactor={10}>
        <div className={styles.coreLabel}>
          <b>{current.label}</b>
          <span>{current.meta}</span>
        </div>
      </Html>
    </group>
  );
}

function OrbitNode({ node, position, selected, onPick, depth }) {
  const group = useRef();
  const target = useMemo(() => new THREE.Vector3(...position), [position]);
  const baseScale = node.kind === "business" ? 0.66 : node.kind === "stage" ? 0.54 : 0.44;

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.position.lerp(target, 0.075);
    const desired = selected ? baseScale * 1.22 : baseScale;
    const s = THREE.MathUtils.lerp(group.current.scale.x, desired, 0.1);
    group.current.scale.setScalar(s);
    group.current.rotation.y += delta * (selected ? 0.36 : 0.16);
  });

  return (
    <group ref={group} scale={0.2}>
      <mesh
        onClick={(event) => {
          event.stopPropagation();
          onPick(node);
        }}
        onPointerOver={() => { document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = "default"; }}
      >
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          color={selected ? "#d8ff72" : "#dfe4dc"}
          emissive={selected ? "#6e8f20" : "#20251f"}
          emissiveIntensity={selected ? 0.5 : 0.12}
          roughness={0.58}
          metalness={0.08}
          transparent
          opacity={selected ? 1 : 0.88}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.35, selected ? 0.035 : 0.018, 6, 64]} />
        <meshBasicMaterial
          color={selected ? "#d8ff72" : "#ffffff"}
          transparent
          opacity={selected ? 0.58 : 0.15}
        />
      </mesh>
      <Html center position={[0, -1.65, 0]} distanceFactor={9.5}>
        <div className={selected ? styles.nodeLabelSelected + " " + styles.nodeLabel : styles.nodeLabel}>
          <b>{node.label}</b>
          <span>{node.meta}</span>
        </div>
      </Html>
    </group>
  );
}

function WorldScene({ current, children, inspectedId, onPick, depth }) {
  return (
    <>
      <color attach="background" args={["#090b0a"]} />
      <fog attach="fog" args={["#090b0a", 11, 24]} />
      <ambientLight intensity={0.72} />
      <directionalLight position={[4, 7, 8]} intensity={1.15} color="#ffffff" />
      <pointLight position={[-5, -3, 3]} intensity={0.9} color="#d8ff72" />
      <Stars radius={38} depth={18} count={420} factor={1.3} saturation={0} fade speed={0.25} />
      <CameraRig depth={depth} />
      <Core current={current} depth={depth} />
      {children.map((node, index) => {
        const position = orbitPosition(index, children.length, depth);
        return (
          <group key={node.id}>
            <Line
              points={[[0, 0, 0], position]}
              color={inspectedId === node.id ? "#d8ff72" : "#ffffff"}
              transparent
              opacity={inspectedId === node.id ? 0.42 : 0.095}
              lineWidth={inspectedId === node.id ? 1.4 : 0.7}
            />
            <OrbitNode
              node={node}
              position={position}
              selected={inspectedId === node.id}
              onPick={onPick}
              depth={depth}
            />
          </group>
        );
      })}
    </>
  );
}

const ROOT = {
  id: "link",
  label: "LINK WORLD",
  meta: "ecosistema",
  kind: "ecosystem"
};

export default function PhysicsPrototype() {
  const [path, setPath] = useState([ROOT]);
  const [inspectedId, setInspectedId] = useState(null);

  const current = path[path.length - 1];
  const children = useMemo(() => currentChildren(current), [current]);
  const inspected = children.find((item) => item.id === inspectedId) || null;
  const depth = path.length - 1;

  function enter(node) {
    if (!node || node.kind === "artifact") return;
    setPath((items) => [...items, node]);
    setInspectedId(null);
  }

  function pick(node) {
    if (inspectedId === node.id) {
      enter(node);
      return;
    }
    setInspectedId(node.id);
  }

  function back() {
    if (path.length <= 1) return;
    setPath((items) => items.slice(0, -1));
    setInspectedId(null);
  }

  function reset() {
    setPath([ROOT]);
    setInspectedId(null);
  }

  const dockTitle = inspected ? inspected.label : current.label;
  const dockMeta = inspected
    ? inspected.kind === "artifact"
      ? "Artefacto visible. En la versión real abrirá su mesa o evidencia."
      : "Primer clic: inspeccionar. Segundo clic: entrar y reorganizar el mundo."
    : children.length
      ? "Selecciona un nodo. El primer clic lo inspecciona; el segundo lo convierte en el centro."
      : "Llegaste al nivel de artefacto. Volvamos para seguir recorriendo el sistema.";

  return (
    <main className={styles.shell}>
      <Canvas
        className={styles.canvas}
        camera={{ position: [0, 0, 12.4], fov: 44, near: 0.1, far: 80 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onPointerMissed={() => setInspectedId(null)}
      >
        <WorldScene
          current={current}
          children={children}
          inspectedId={inspectedId}
          onPick={pick}
          depth={depth}
        />
      </Canvas>

      <div className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.mark}>••</div>
          <div>
            <b>LINK WORLD · FÍSICA 01</b>
            <small>prototipo aislado · sin tocar producción</small>
          </div>
        </div>
        <div className={styles.help}>
          <b>2 CLICS</b>
          <small>inspeccionar → entrar</small>
        </div>
      </div>

      <div className={styles.breadcrumbs}>
        {path.map((item, index) => (
          <span key={item.id} className={styles.crumb}>
            {index ? "› " : ""}{item.label}
          </span>
        ))}
      </div>

      <div className={styles.hint}>MUEVE EL CURSOR · LA CÁMARA RESPONDE</div>

      <section className={styles.bottomDock}>
        <div className={styles.dockRow}>
          <div className={styles.dockCopy}>
            <span className={styles.kicker}>
              {inspected ? "INSPECCIÓN" : "CENTRO ACTUAL"}
            </span>
            <strong>{dockTitle}</strong>
            <p>{dockMeta}</p>
          </div>
          <div className={styles.actions}>
            {path.length > 1 ? (
              <button className={styles.button} onClick={back}>← Volver</button>
            ) : null}
            {path.length > 1 ? (
              <button className={styles.button} onClick={reset}>LINK</button>
            ) : null}
            {inspected && inspected.kind !== "artifact" ? (
              <button className={styles.button + " " + styles.primary} onClick={() => enter(inspected)}>
                Entrar →
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
