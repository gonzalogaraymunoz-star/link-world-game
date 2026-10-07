"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import TerritoryMap from "./TerritoryMap";
import ConchaWorld from "./ConchaWorld";
import { hasSupabaseConfig, supabase } from "../lib/supabase";

const APP_BASES = {
  linkcontrolgeneral: "https://linkcontrolgeneral.vercel.app",
  linkrrss: "https://linkrrss.vercel.app",
  "hotel-experience": "https://hotel-experience.vercel.app",
  "ventas-hotelexperience": "https://ventas-hotelexperience.vercel.app",
  taxihotel: "https://taxihotel.vercel.app",
  "link-world": "https://link-world-delta.vercel.app"
};

const NAV = [
  ["concha", "◉", "Organismo"],
  ["mundo", "◎", "Mundo"],
  ["modelos", "◈", "Modelos"],
  ["negocios", "□", "Células"],
  ["misiones", "◇", "Pendientes"],
  ["tableros", "▦", "Mesas"],
  ["cron", "◷", "Ritmos"],
  ["alertas", "!", "Alertas"],
  ["memoria", "≋", "Memoria"],
  ["configuracion", "⚙", "Configuración"]
];

const TOP = [
  ["concha", "Organismo"],
  ["mundo", "Mapa"],
  ["red", "Red"],
  ["eventos", "Eventos"],
  ["economia", "Economía"]
];

const fmtDate = value => {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch { return "—"; }
};

const safeRows = result => result?.data || [];
const countBy = (rows, key) => rows.reduce((acc, row) => {
  const value = row[key] || "otro";
  acc[value] = (acc[value] || 0) + 1;
  return acc;
}, {});

function resolveWorkspaceUrl(row) {
  if (!row) return null;
  if (/^https?:\/\//.test(row.route || "")) return row.route;
  const base = APP_BASES[row.app_key];
  return base ? base + (row.route || "/") : null;
}

function StatusPill({ children, tone = "neutral" }) {
  return <span className={`statusPill tone-${tone}`}>{children}</span>;
}


const MISSION_STAGE_ACTIONS = {
  ventas: "Abrir la señal u oportunidad más reciente, definir el siguiente movimiento comercial verificable, ejecutarlo y registrar el resultado real.",
  marketing: "Comparar plan versus ejecución, elegir la brecha prioritaria, ejecutar la corrección mínima y medir la señal resultante.",
  cierre: "Identificar la condición de cierre que falta, conseguir la confirmación o evidencia correspondiente y preparar el handoff verificable.",
  onboarding: "Completar el dato, documento o checklist bloqueante y dejar el caso listo para el siguiente responsable.",
  entrega: "Comprobar que la promesa o servicio ocurrió realmente, registrar evidencia de cumplimiento y escalar cualquier quiebre.",
  postventa: "Capturar feedback, review, referido o recompra verificable y devolver el aprendizaje a Marketing y Operaciones.",
  transversal: "Tomar el bloqueo más antiguo o de mayor impacto, asignar responsable, ejecutar la siguiente acción segura y exigir evidencia antes de cerrar."
};

function missionActionSuggestion(row) {
  if (!row) return "";
  if (["verified", "closed", "cancelled"].includes(row.status)) return "No requiere acción: la misión ya está cerrada o verificada.";
  if (row.metadata?.next_move) return row.metadata.next_move;
  if (row.metadata?.handoff_blocker) return `Destrabar “${String(row.metadata.handoff_blocker).replaceAll("_", " ")}” y registrar la evidencia que permita continuar el handoff.`;
  return MISSION_STAGE_ACTIONS[row.stage_key] || "Identificar el bloqueo real, ejecutar la siguiente acción mínima verificable y registrar evidencia antes de avanzar.";
}

function buildMissionHelpPrompt(row, businessName) {
  const action = missionActionSuggestion(row);
  return `Esta misión salió de LINK WORLD. Trabajémosla aquí en ChatGPT, en modo Dios, usando las fuentes conectadas y sin inventar evidencia.

MISIÓN
Título: ${row.title}
Código: ${row.mission_code}
Negocio: ${businessName || row.business_global_id || "LINK transversal"}
Etapa: ${row.stage_key || "sin etapa"}
Estado: ${row.status}
Prioridad: ${row.priority || "normal"}
Responsable: ${row.assigned_agent_slug || "sin asignar"}

CONTEXTO
Problema: ${row.problem_statement || "No hay problema persistido."}
Diagnóstico: ${row.diagnosis || "No hay diagnóstico persistido todavía."}
Resultado esperado: ${row.expected_outcome || "No hay resultado esperado persistido."}

ACCIÓN PROPUESTA POR LINK
${action}

Quiero que me ayudes a destrabar esta misión dentro del ecosistema LINK.

1. Revisa primero las fuentes, apps y herramientas conectadas que correspondan a esta misión. No inventes información ni evidencia.
2. Dime cuál es el bloqueo real y cuál es la siguiente acción mínima que produce avance verificable.
3. Si la acción es interna, reversible y segura, ejecútala usando las herramientas disponibles.
4. Si requiere una decisión humana, pago, publicación externa, mensaje a un tercero, cambio irreversible o falta una conexión, no lo simules: dime exactamente qué debo decidir o habilitar.
5. Usa el responsable y la etapa correctos; no absorbas trabajo que corresponde a otro LINKDOT.
6. Al terminar, entrégame: acción realizada, evidencia encontrada o generada, estado actualizado y siguiente movimiento.
7. Mantén el foco sólo en esta misión hasta dejarla avanzada, resuelta o claramente bloqueada.
8. LINK WORLD no contiene un “Director IA”: la inteligencia se resuelve aquí y LINK WORLD conserva estado, evidencia, artefactos y próximos movimientos.

Empieza por revisar el estado real actual y propón el primer movimiento.`;
}

function MissionCard({ row, businessName }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);
  const done = ["verified", "closed", "cancelled"].includes(row.status);
  const action = missionActionSuggestion(row);
  const prompt = buildMissionHelpPrompt(row, businessName);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setShowPrompt(true);
    }
  }

  return (
    <article className={`missionCard ${done ? "missionDone" : "missionOpen"}`}>
      <div className="missionMain">
        <i className={`priorityDot priority-${row.priority}`} />
        <div className="missionCopy">
          <span>{row.stage_key} · {row.assigned_agent_slug || "sin asignar"}</span>
          <h3>{row.title}</h3>
          <small>{row.mission_code}</small>
        </div>
        <div className="rowEnd">
          <StatusPill tone={row.status === "active" ? "good" : done ? "neutral" : "warn"}>{row.status}</StatusPill>
          <small>{fmtDate(row.updated_at)}</small>
        </div>
      </div>

      {!done ? (
        <div className="missionActionZone">
          <div className="missionActionText">
            <span className="sectionKicker">ACCIÓN PROPUESTA</span>
            <strong>{action}</strong>
          </div>
          <div className="missionButtons">
            <button className="missionHelpButton" onClick={() => setShowPrompt(value => !value)}>
              {showPrompt ? "Ocultar prompt" : "Pedir ayuda a ChatGPT"}
            </button>
            <button className={`missionCopyButton ${copied ? "copied" : ""}`} onClick={copyPrompt}>
              {copied ? "Copiado ✓" : "Copiar prompt"}
            </button>
          </div>
          {showPrompt ? (
            <div className="missionPromptBox">
              <div><span className="sectionKicker">PROMPT DE SOLUCIÓN</span><button onClick={copyPrompt}>{copied ? "Copiado ✓" : "Copiar"}</button></div>
              <pre>{prompt}</pre>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="missionVerifiedNote">Misión verificada · no propone nueva acción hasta que exista una señal o dependencia pendiente.</div>
      )}
    </article>
  );
}

function LockPanel({ onOpenLogin, title = "Capa privada de LINK" }) {
  return (
    <section className="lockedPanel">
      <span className="sectionKicker">MEMBRESÍA LINK</span>
      <h2>{title}</h2>
      <p>Esta capa usa LINK CONTROL CENTRAL y respeta RLS. Inicia sesión con tu miembro LINK para leer misiones, eventos, finanzas, memoria y mesas privadas.</p>
      <button className="primaryButton" onClick={onOpenLogin}>Entrar a LINK →</button>
    </section>
  );
}

function LoginPanel({ onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setMessage("No pudimos validar ese acceso.");
      setBusy(false);
      return;
    }
    const check = await supabase.rpc("link_world_is_member");
    if (check.error || check.data !== true) {
      await supabase.auth.signOut();
      setMessage("Esta cuenta todavía no pertenece a LINK World.");
      setBusy(false);
      return;
    }
    setBusy(false);
    onClose();
  }

  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <section className="loginModal" onMouseDown={event => event.stopPropagation()}>
        <div className="modalHead">
          <div>
            <span className="sectionKicker">LINK CONTROL CENTRAL</span>
            <h2>Entrar al organismo</h2>
          </div>
          <button className="iconButton" onClick={onClose}>×</button>
        </div>
        <form onSubmit={submit} className="loginForm">
          <label><span>Correo</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required /></label>
          <label><span>Contraseña</span><input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required /></label>
          {message ? <p className="formError">{message}</p> : null}
          <button className="primaryButton" disabled={busy}>{busy ? "Conectando…" : "Entrar →"}</button>
        </form>
      </section>
    </div>
  );
}

function phaseLabel(level) {
  return ["Oportunidad", "Activado", "Recurrente", "Sistematizado", "Delegado", "Autónomo", "Expansión"][Math.max(0, Math.min(6, level))];
}

function GameProgressHUD({ game }) {
  const pct = game?.nextLevelXp ? Math.round((game.levelXp / game.nextLevelXp) * 100) : 0;
  return (
    <div className="gameProgressHud">
      <div className="gameProgressTop">
        <span className="gameLevel">NIVEL {game?.level || 1}</span>
        <strong>{game?.xp || 0} XP</strong>
      </div>
      <div className="xpTrack"><i style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} /></div>
      <div className="gameProgressMeta">
        <span>{game?.verifiedActions || 0} hitos verificados</span>
        <span>{game?.activeConnections || 0} conexiones vivas</span>
        <span>{game?.sales || 0} señales de venta</span>
      </div>
      <small>El nivel sube sólo con evidencia, conexiones y actividad real del ecosistema.</small>
    </div>
  );
}

function CellProgressDock({ businesses, progressByBusiness, selectedId, onSelect }) {
  return (
    <div className="cellProgressDock">
      {businesses.map(business => {
        const p = progressByBusiness.get(business.id);
        return (
          <button key={business.id} className={selectedId === business.id ? "active" : ""} onClick={() => onSelect(business.id)}>
            <span className="cellDot" data-level={p?.level || 0} />
            <span className="cellCopy">
              <b>{business.name}</b>
              <small>{phaseLabel(p?.level || 0)} · {p?.percent || 0}%</small>
            </span>
            <span className="cellMiniTrack"><i style={{ width: `${p?.percent || 0}%` }} /></span>
          </button>
        );
      })}
    </div>
  );
}

function BusinessInspector({ business, gameState, rrssProfile, progress, actions = [], evidence = [], onShowMap, onStartAction, onSubmitEvidence }) {
  const [evidenceRef, setEvidenceRef] = useState("");
  if (!business) {
    return (
      <aside className="contextPanel">
        <span className="sectionKicker">LINK WORLD</span>
        <h2>Selecciona un negocio</h2>
        <p className="muted">El mapa, la ficha LINK y las mesas operativas se articulan desde la misma identidad.</p>
      </aside>
    );
  }
  const website = business.website;
  const state = gameState?.state || "sin estado";
  const temp = Number(gameState?.temperature || 0);
  const orderedActions = [...actions].sort((a,b) => {
    const order = { in_progress: 0, awaiting_evidence: 1, planned: 2, verified: 3, rejected: 4, expired: 5, cancelled: 6 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9) || Number(a.metadata?.sequence || 999) - Number(b.metadata?.sequence || 999);
  });
  const nextAction = orderedActions.find(a => ["in_progress","awaiting_evidence","planned"].includes(a.status)) || orderedActions[0] || null;
  const nextEvidence = nextAction ? evidence.filter(row => row.action_id === nextAction.id) : [];
  const stageRows = progress?.stages || [];

  async function sendEvidence() {
    if (!nextAction || !evidenceRef.trim()) return;
    await onSubmitEvidence(nextAction, evidenceRef.trim());
    setEvidenceRef("");
  }

  return (
    <aside className="contextPanel">
      <div className="contextHeader">
        <div>
          <span className="sectionKicker">{business.city || "LINK"}</span>
          <h2>{business.name}</h2>
          <p>{business.sector}</p>
        </div>
        <StatusPill tone={business.verification_status === "verified" ? "good" : "warn"}>{business.verification_status}</StatusPill>
      </div>

      <section className="evolutionCard">
        <div className="evolutionHead">
          <div><span className="sectionKicker">DESARROLLO</span><strong>{phaseLabel(progress?.level || 0)}</strong></div>
          <b>{progress?.percent || 0}%</b>
        </div>
        <div className="evolutionTrack">
          {stageRows.map((row, index) => <span key={row.key} className={row.complete ? "done" : index === progress?.level ? "next" : ""} title={row.label}><i /></span>)}
        </div>
        <div className="evolutionLabels">
          {stageRows.map(row => <span key={row.key} className={row.complete ? "done" : ""}>{row.label}</span>)}
        </div>
        {progress?.next ? <p>Para evolucionar: <b>{progress.next.label}</b> · {progress.next.hint}</p> : <p className="evolutionComplete">Ciclo base completo. La célula ya está en expansión.</p>}
      </section>

      <div className="contextStats">
        <div><b>{business.google_place_id || business.website ? "✓" : "—"}</b><span>superficie</span></div>
        <div><b>{Math.round(temp)}°</b><span>temperatura</span></div>
        <div><b>{progress?.verifiedActions || 0}</b><span>hitos</span></div>
        <div><b>{rrssProfile ? "✓" : progress?.connectionCount ? "✓" : "—"}</b><span>canal</span></div>
      </div>

      {nextAction ? (
        <section className={`questCard quest-${nextAction.status}`}>
          <div className="questHead">
            <span className="sectionKicker">MISIÓN ACTIVA</span>
            <StatusPill tone={nextAction.status === "verified" ? "good" : nextAction.status === "planned" ? "neutral" : "warn"}>{nextAction.status}</StatusPill>
          </div>
          <h3>{nextAction.title}</h3>
          <p>{nextAction.description}</p>
          <div className="questReward">
            <span>{nextAction.category}</span>
            <b>{Number(nextAction.base_heat || 0) > 0 ? `+${Math.round(Number(nextAction.base_heat))} calor` : "recompensa: evidencia"}</b>
          </div>
          {nextAction.status === "planned" ? <button className="primaryButton questButton" onClick={() => onStartAction(nextAction)}>Iniciar misión →</button> : null}
          {nextAction.status === "in_progress" && nextAction.evidence_requirement !== "automatic" ? (
            <div className="evidenceSubmit">
              <input value={evidenceRef} onChange={e => setEvidenceRef(e.target.value)} placeholder="Pega URL, comprobante, commit o referencia" />
              <button onClick={sendEvidence} disabled={!evidenceRef.trim()}>Enviar evidencia</button>
            </div>
          ) : null}
          {nextAction.status === "in_progress" && nextAction.evidence_requirement === "automatic" ? <div className="autoEvidence">Esperando señal automática del sistema…</div> : null}
          {nextAction.status === "awaiting_evidence" ? <div className="autoEvidence">{nextEvidence.length ? nextEvidence.length + " evidencia(s) enviadas · esperando validación" : "Esperando validación"}</div> : null}
        </section>
      ) : (
        <div className="contextBlock"><span className="sectionKicker">MISIONES</span><strong>No hay una misión jugable registrada para esta célula.</strong></div>
      )}

      {gameState ? (
        <div className="contextBlock">
          <span className="sectionKicker">TEMPERATURA COMERCIAL</span>
          <strong>{state.replaceAll("_", " ")}</strong>
          <p>{gameState.reason || "La temperatura cambia sólo con acciones que dejan evidencia."}</p>
        </div>
      ) : null}

      <div className="actionStack">
        <button className="secondaryButton" onClick={() => onShowMap(business)}>Ubicar en territorio</button>
        {website ? <a className="secondaryButton" href={website} target="_blank" rel="noreferrer">Abrir sistema del negocio ↗</a> : null}
        {rrssProfile ? <a className="secondaryButton" href="https://linkrrss.vercel.app" target="_blank" rel="noreferrer">Abrir LINKRRSS ↗</a> : null}
      </div>
    </aside>
  );
}


function moneyCLP(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Number(value));
}

function isVerifiedEconomicProof(row) {
  if (!row || row.verified !== true || Number(row.amount_clp || 0) <= 0) return false;
  if (row.metadata?.payment_verified === false || row.metadata?.economic_payment_proof === false) return false;
  return ["payment","paid","settled","recurrent_delivery","revenue","invoice_paid","receipt_paid"].includes(String(row.evidence_type || "").toLowerCase()) ||
    row.metadata?.economic_payment_proof === true ||
    row.metadata?.proof_scope === "operation_and_revenue_signal";
}

function stageProofRows(evidence = [], stageKey) {
  return evidence.filter(row => row.verified === true && row.metadata?.stage_key === stageKey);
}

function businessModelLabel(business) {
  const facts = business?.owned_facts || {};
  return facts.house_model?.label || facts.business_type || facts.ecosystem_role || business?.sector || "Modelo por describir";
}

function BusinessFichaContent({ business, onOpenFullBusiness }) {
  if (!business) return <div className="dockEmpty">Selecciona una célula LINK en el mapa.</div>;
  const facts = business.owned_facts || {};
  const contract = facts.active_contract || facts.sold_product || null;
  const surfaces = Object.entries(facts.surfaces || {}).filter(([, value]) => typeof value === "string" && /^https?:\/\//.test(value));
  const capabilities = Array.isArray(facts.capabilities) ? facts.capabilities.slice(0, 4) : [];
  const status = facts.status || business.verification_status;
  const monthly = contract?.monthly_fee_clp || (contract?.billing_model === "monthly" ? contract?.agreed_price_clp : null);

  return (
    <div className="dockPanelBody businessFichaBody">
      <div className="dockTitleRow">
        <div>
          <span className="sectionKicker">FICHA LINK</span>
          <h2>{business.name}</h2>
          <p>{facts.tagline || business.sector}</p>
        </div>
        <StatusPill tone={business.verification_status === "verified" ? "good" : "warn"}>{business.verification_status}</StatusPill>
      </div>

      <p className="businessSummary">{business.summary || "Esta célula todavía no tiene una descripción consolidada."}</p>

      <div className="businessFactsGrid">
        <div><span>Modelo</span><b>{businessModelLabel(business)}</b></div>
        <div><span>Estado</span><b>{String(status || "sin estado").replaceAll("_", " ")}</b></div>
        <div><span>Territorio</span><b>{business.city || "Digital"}{business.country ? ` · ${business.country}` : ""}</b></div>
        <div><span>Ingreso recurrente</span><b>{monthly ? moneyCLP(monthly) : "no consolidado"}</b></div>
      </div>

      {contract ? (
        <section className="dockInfoBlock">
          <span className="sectionKicker">MODELO ACTIVO</span>
          <strong>{contract.stage || contract.name || contract.code || "Contrato activo"}</strong>
          <p>{contract.billing_model ? `${contract.billing_model} · ` : ""}{contract.status || "activo"}</p>
        </section>
      ) : null}

      {capabilities.length ? (
        <section className="dockInfoBlock">
          <span className="sectionKicker">CAPACIDADES</span>
          <div className="capabilityList">{capabilities.map(item => <span key={item}>{item}</span>)}</div>
        </section>
      ) : null}

      {surfaces.length ? (
        <section className="dockInfoBlock">
          <span className="sectionKicker">SUPERFICIES</span>
          <div className="surfaceLinks">
            {surfaces.map(([key, url]) => <a key={key} href={url} target="_blank" rel="noreferrer">{key.replaceAll("_", " ")} ↗</a>)}
          </div>
        </section>
      ) : null}

      <div className="dockActions">
        <button className="primaryButton" onClick={() => onOpenFullBusiness(business)}>Ver ficha completa →</button>
        {business.website ? <a className="secondaryButton" href={business.website} target="_blank" rel="noreferrer">Abrir sitio ↗</a> : null}
      </div>
    </div>
  );
}

function ExternalBusinessFicha({ place, onResearchPlace }) {
  if (!place) return <div className="dockEmpty">Haz clic sobre un negocio del mapa para abrir su ficha.</div>;
  return (
    <div className="dockPanelBody businessFichaBody">
      <div className="dockTitleRow">
        <div>
          <span className="sectionKicker">NEGOCIO EXTERNO</span>
          <h2>{place.displayName}</h2>
          <p>{place.primaryTypeDisplayName || "Google Maps"}</p>
        </div>
        <StatusPill tone="neutral">fuera de LINK</StatusPill>
      </div>

      <p className="businessSummary">{place.formattedAddress || "Sin dirección disponible."}</p>

      <div className="businessFactsGrid">
        <div><span>Rating</span><b>{place.rating ? `${place.rating} / 5` : "—"}</b></div>
        <div><span>Reseñas</span><b>{place.userRatingCount ?? "—"}</b></div>
        <div><span>Teléfono</span><b>{place.internationalPhoneNumber || place.nationalPhoneNumber || "—"}</b></div>
        <div><span>Estado</span><b>{place.businessStatus ? String(place.businessStatus).replaceAll("_", " ") : "sin investigar"}</b></div>
      </div>

      {place.researched ? (
        <section className="dockInfoBlock">
          <span className="sectionKicker">INVESTIGACIÓN GOOGLE</span>
          <strong>{place.websiteURI ? "Tiene sitio web identificado" : "Sin sitio web identificado"}</strong>
          <p>{place.openNow === true ? "Abierto ahora" : place.openNow === false ? "Cerrado ahora" : "Horario no disponible"}{place.weekdayText?.length ? ` · ${place.weekdayText[0]}` : ""}</p>
        </section>
      ) : (
        <section className="dockInfoBlock researchHint">
          <span className="sectionKicker">NO LO CONOCEMOS TODAVÍA</span>
          <strong>Investígalo antes de convertirlo en oportunidad LINK.</strong>
          <p>El botón completa la ficha con los datos disponibles en Google Places sin guardar nada en LINK.</p>
        </section>
      )}

      <div className="dockActions">
        <button className="primaryButton" onClick={() => onResearchPlace(place)}>{place.researched ? "Actualizar investigación" : "Investigar negocio →"}</button>
        {place.googleMapsURI ? <a className="secondaryButton" href={place.googleMapsURI} target="_blank" rel="noreferrer">Ver en Google Maps ↗</a> : null}
        {place.websiteURI ? <a className="secondaryButton" href={place.websiteURI} target="_blank" rel="noreferrer">Abrir web ↗</a> : null}
      </div>
    </div>
  );
}

function MapMissionPanel({ business, actions = [], evidence = [], onStartAction, onSubmitEvidence }) {
  const [evidenceRef, setEvidenceRef] = useState("");
  if (!business) return <div className="dockEmpty">Selecciona un negocio LINK para ver su misión.</div>;
  const ordered = [...actions].sort((a,b) => {
    const order = { in_progress: 0, awaiting_evidence: 1, planned: 2, verified: 3, rejected: 4, expired: 5, cancelled: 6 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9) || Number(a.metadata?.sequence || 999) - Number(b.metadata?.sequence || 999);
  });
  const action = ordered.find(item => ["in_progress","awaiting_evidence","planned"].includes(item.status)) || ordered[0];
  if (!action) return <div className="dockEmpty">Esta célula todavía no tiene una misión jugable.</div>;
  const relatedEvidence = evidence.filter(row => row.action_id === action.id);

  async function submit() {
    if (!evidenceRef.trim()) return;
    await onSubmitEvidence(action, evidenceRef.trim());
    setEvidenceRef("");
  }

  return (
    <div className="dockPanelBody">
      <div className="dockTitleRow">
        <div><span className="sectionKicker">MISIÓN DE {business.name}</span><h2>{action.title}</h2></div>
        <StatusPill tone={action.status === "verified" ? "good" : action.status === "planned" ? "neutral" : "warn"}>{action.status}</StatusPill>
      </div>
      <p className="businessSummary">{action.description}</p>
      <section className="dockInfoBlock">
        <span className="sectionKicker">CONDICIÓN</span>
        <strong>{action.evidence_requirement === "automatic" ? "El sistema debe producir evidencia automáticamente." : "Necesita evidencia verificable."}</strong>
        <p>{Number(action.base_heat || 0) > 0 ? `Recompensa potencial: +${Math.round(Number(action.base_heat))} calor` : "El progreso se libera cuando exista evidencia válida."}</p>
      </section>
      {action.status === "planned" ? <button className="primaryButton" onClick={() => onStartAction(action)}>Iniciar misión →</button> : null}
      {action.status === "in_progress" && action.evidence_requirement !== "automatic" ? (
        <div className="dockEvidence">
          <input value={evidenceRef} onChange={e => setEvidenceRef(e.target.value)} placeholder="URL, comprobante, commit o referencia" />
          <button onClick={submit} disabled={!evidenceRef.trim()}>Enviar</button>
        </div>
      ) : null}
      {action.status === "in_progress" && action.evidence_requirement === "automatic" ? <div className="autoEvidence">Esperando una señal automática real…</div> : null}
      {action.status === "awaiting_evidence" ? <div className="autoEvidence">{relatedEvidence.length} evidencia(s) · esperando validación</div> : null}
    </div>
  );
}

function MapProgressPanel({ business, progress, gameState, globalGame }) {
  if (!business) return <div className="dockEmpty">Selecciona un negocio para ver su desarrollo.</div>;
  const stages = progress?.stages || [];
  return (
    <div className="dockPanelBody">
      <div className="dockTitleRow"><div><span className="sectionKicker">DESARROLLO</span><h2>{phaseLabel(progress?.level || 0)}</h2><p>{business.name}</p></div><b className="dockPercent">{progress?.percent || 0}%</b></div>
      <div className="evolutionTrack">{stages.map((row,index) => <span key={row.key} className={row.complete ? "done" : index === progress?.level ? "next" : ""}><i /></span>)}</div>
      <div className="evolutionLabels">{stages.map(row => <span key={row.key} className={row.complete ? "done" : ""}>{row.label}</span>)}</div>
      <section className="dockInfoBlock">
        <span className="sectionKicker">SIGUIENTE EVOLUCIÓN</span>
        <strong>{progress?.next ? progress.next.label : "Expansión"}</strong>
        <p>{progress?.next?.hint || "La célula completó el ciclo base."}</p>
      </section>
      <div className="businessFactsGrid">
        <div><span>Nivel global</span><b>{globalGame?.level || 1}</b></div>
        <div><span>XP LINK</span><b>{globalGame?.xp || 0}</b></div>
        <div><span>Temperatura</span><b>{Math.round(Number(gameState?.temperature || 0))}°</b></div>
        <div><span>Hitos</span><b>{progress?.verifiedActions || 0}</b></div>
      </div>
    </div>
  );
}

function BusinessListPanel({ businesses, selectedId, progressByBusiness, onSelectBusiness }) {
  return (
    <div className="dockPanelBody">
      <div className="dockTitleRow"><div><span className="sectionKicker">CÉLULAS DEL TERRITORIO</span><h2>Negocios</h2><p>{businesses.length} visibles en LINK</p></div></div>
      <div className="dockBusinessList">
        {businesses.map(business => {
          const progress = progressByBusiness.get(business.id);
          return (
            <button key={business.id} className={selectedId === business.id ? "active" : ""} onClick={() => onSelectBusiness(business.id)}>
              <span className="cellDot" data-level={progress?.level || 0} />
              <span><b>{business.name}</b><small>{businessModelLabel(business)} · {progress?.percent || 0}%</small></span>
              <em>›</em>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MapToolsPanel({ business, rrssProfile, onOpenFullBusiness }) {
  return (
    <div className="dockPanelBody">
      <div className="dockTitleRow"><div><span className="sectionKicker">HERRAMIENTAS</span><h2>Superficies conectadas</h2></div></div>
      <p className="businessSummary">Aquí iremos agregando módulos útiles para actuar sobre la misión sin llenar el mapa de ventanas permanentes.</p>
      <div className="toolModuleList">
        {business ? <button onClick={() => onOpenFullBusiness(business)}><b>Ficha completa</b><span>Identidad, modelo y contexto del negocio</span></button> : null}
        {business?.website ? <a href={business.website} target="_blank" rel="noreferrer"><b>Sitio / sistema</b><span>{business.website}</span></a> : null}
        {rrssProfile ? <a href="https://linkrrss.vercel.app" target="_blank" rel="noreferrer"><b>LINKRRSS</b><span>Conversaciones, publicaciones y señales</span></a> : null}
        <a href="https://linkcontrolgeneral.vercel.app" target="_blank" rel="noreferrer"><b>Control Central</b><span>Fuente viva y coordinación LINK</span></a>
      </div>
    </div>
  );
}

function MapPanelDock({
  collapsed, activePanel, onToggleCollapse, onSelectPanel,
  business, externalPlace, progress, gameState, globalGame, rrssProfile,
  actions, evidence, onStartAction, onSubmitEvidence, onOpenFullBusiness, onResearchPlace,
  businesses, progressByBusiness, selectedId, onSelectBusiness
}) {
  const panels = [
    ["ficha", "□", "Ficha"],
    ["mision", "◇", "Misión"],
    ["progreso", "↗", "Progreso"],
    ["negocios", "▦", "Negocios"],
    ["herramientas", "+", "Herramientas"]
  ];
  const showingExternal = externalPlace?.kind === "external";

  return (
    <aside className={`mapPanelDock ${collapsed ? "collapsed" : ""}`}>
      <div className="mapPanelRail">
        <button className="dockCollapseButton" onClick={onToggleCollapse} title={collapsed ? "Abrir panel" : "Plegar panel"}>{collapsed ? "‹" : "›"}</button>
        {panels.map(([id, icon, label]) => (
          <button key={id} className={activePanel === id && !collapsed ? "active" : ""} onClick={() => { onSelectPanel(id); if (collapsed) onToggleCollapse(); }} title={label}>
            <i>{icon}</i><span>{label}</span>
          </button>
        ))}
      </div>
      {!collapsed ? (
        <div className="mapPanelContent">
          {activePanel === "ficha" ? (
            showingExternal
              ? <ExternalBusinessFicha place={externalPlace} onResearchPlace={onResearchPlace} />
              : <BusinessFichaContent business={business} onOpenFullBusiness={onOpenFullBusiness} />
          ) : null}
          {activePanel === "mision" ? <MapMissionPanel business={business} actions={actions} evidence={evidence} onStartAction={onStartAction} onSubmitEvidence={onSubmitEvidence} /> : null}
          {activePanel === "progreso" ? <MapProgressPanel business={business} progress={progress} gameState={gameState} globalGame={globalGame} /> : null}
          {activePanel === "negocios" ? <BusinessListPanel businesses={businesses} selectedId={selectedId} progressByBusiness={progressByBusiness} onSelectBusiness={onSelectBusiness} /> : null}
          {activePanel === "herramientas" ? <MapToolsPanel business={business} rrssProfile={rrssProfile} onOpenFullBusiness={onOpenFullBusiness} /> : null}
        </div>
      ) : null}
    </aside>
  );
}

function BusinessDossier({ business, progress, onShowMap, models = [], stagesByModel, evidenceByModel, transactions = [] }) {
  if (!business) return null;
  const facts = business.owned_facts || {};
  const contract = facts.active_contract || facts.sold_product;
  const capabilities = Array.isArray(facts.capabilities) ? facts.capabilities : [];
  const productBranches = Array.isArray(facts.product_branches) ? facts.product_branches : [];
  return (
    <article className="fullBusinessDossier">
      <div className="dossierHead">
        <div><span className="sectionKicker">FICHA COMPLETA</span><h2>{business.name}</h2><p>{facts.tagline || business.sector}</p></div>
        <div className="dossierScore"><b>{progress?.percent || 0}%</b><span>{phaseLabel(progress?.level || 0)}</span></div>
      </div>
      <p className="dossierSummary">{business.summary || "Sin descripción consolidada."}</p>
      <div className="dossierColumns">
        <section><span className="sectionKicker">IDENTIDAD</span><dl><dt>Modelo</dt><dd>{businessModelLabel(business)}</dd><dt>Territorio</dt><dd>{business.city} · {business.country}</dd><dt>Estado</dt><dd>{String(facts.status || business.verification_status).replaceAll("_"," ")}</dd><dt>LINK ID</dt><dd>{business.global_id}</dd></dl></section>
        <section><span className="sectionKicker">NEGOCIO</span><dl><dt>Producto / contrato</dt><dd>{contract?.stage || contract?.name || contract?.code || "por consolidar"}</dd><dt>Modelo de cobro</dt><dd>{contract?.billing_model || "por consolidar"}</dd><dt>Valor</dt><dd>{moneyCLP(contract?.monthly_fee_clp || contract?.agreed_price_clp || contract?.price_clp) || "por consolidar"}</dd><dt>Google</dt><dd>{business.google_place_id ? "vinculado" : "sin Place ID"}</dd></dl></section>
      </div>
      {capabilities.length ? <section className="dossierList"><span className="sectionKicker">CAPACIDADES</span>{capabilities.map(item => <p key={item}>{item}</p>)}</section> : null}
      {productBranches.length ? <section className="dossierList"><span className="sectionKicker">LÍNEAS ACTIVAS</span>{productBranches.map(item => <p key={item.product_code || item.name}><b>{item.name}</b> · {item.status} · {moneyCLP(item.price_clp) || "sin precio"}</p>)}</section> : null}
      <BusinessFunnel models={models} stagesByModel={stagesByModel} evidenceByModel={evidenceByModel} businessName={business.name} />
      <div className="dockActions"><button className="primaryButton" onClick={() => onShowMap(business)}>Volver al mapa →</button>{business.website ? <a className="secondaryButton" href={business.website} target="_blank" rel="noreferrer">Abrir sistema ↗</a> : null}</div>
    </article>
  );
}


function ModelLibrary({ models, links, stages, evidence, artifacts, businesses, onOpenBusiness }) {
  const businessById = new Map(businesses.map(row => [row.id, row]));
  return (
    <div className="modelLibrary">
      {models.map(model => {
        const modelLinks = links.filter(row => row.model_id === model.id && ["active","proposed"].includes(row.status));
        const modelStages = stages.filter(row => row.model_id === model.id).sort((a,b) => Number(a.stage_number || 99) - Number(b.stage_number || 99));
        const modelEvidence = evidence.filter(row => row.model_id === model.id);
        const modelArtifacts = artifacts.filter(row => row.model_id === model.id);
        const verified = modelEvidence.filter(row => row.verified === true);
        const economic = verified.filter(isVerifiedEconomicProof);
        const origin = modelLinks.find(row => row.role === "origin");
        const originBusiness = origin ? businessById.get(origin.business_id) : null;
        const hasEconomicProof = economic.length > 0;
        const isMatureModel = ["evidenced","repeatable","productizable","business","replicable"].includes(String(model.maturity_stage || ""));
        return (
          <article className="modelCellCard" key={model.id}>
            <div className="modelCellHead">
              <div><span className="sectionKicker">{model.model_kind} · {model.economic_role}</span><h3>{model.name}</h3></div>
              <StatusPill tone={hasEconomicProof ? "good" : isMatureModel ? "neutral" : "warn"}>{hasEconomicProof ? "negocio comprobado" : isMatureModel ? "modelo evidenciado" : "modelo / hobby"}</StatusPill>
            </div>
            <div className="modelFlow">
              <div><span>Dolor</span><p>{model.pain_statement || "sin dolor consolidado"}</p></div>
              <i>→</i>
              <div><span>Tratamiento</span><p>{model.solution_statement || "sin tratamiento consolidado"}</p></div>
              <i>→</i>
              <div><span>Negocio</span><p>{originBusiness?.name || "todavía sin célula origen"}</p></div>
            </div>
            <div className="modelNumbers">
              <div><b>{moneyCLP(model.estimated_monthly_revenue_clp) || "—"}</b><span>ingreso modelo</span></div>
              <div><b>{economic.length}</b><span>evidencias económicas</span></div>
              <div><b>{modelStages.length}/6</b><span>Concha registrada</span></div>
              <div><b>{modelArtifacts.length}</b><span>artefactos ligados</span></div>
            </div>
            <div className="conchaMini">
              {["marketing","ventas","cierre","onboarding","entrega","postventa"].map((key,index) => {
                const row=modelStages.find(stage => stage.stage_key === key);
                const label=row?.metadata?.canonical_label || ["MAR","Ventas","Cierre","Boarding","Opera","Postventa"][index];
                return <span key={key} className={row && row.status !== "not_started" ? "live" : ""} title={row?.objective || label}>{label}</span>;
              })}
            </div>
            <div className="modelNextGate"><span className="sectionKicker">SIGUIENTE GATE</span><p>{model.next_gate || "Definir siguiente validación económica."}</p></div>
            <div className="modelActions">
              {originBusiness ? <button className="primaryButton" onClick={() => onOpenBusiness(originBusiness)}>Desarrollar célula →</button> : null}
              <span>{modelLinks.length} negocio(s) conectados</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}


function StageActionCard({ stage, evidence = [], model, businessName }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);
  const proofs = stageProofRows(evidence, stage.stage_key);
  const checked = proofs.length > 0;
  const label = stage.metadata?.canonical_label || stage.stage_key;
  const prompt = stage.metadata?.prompt_template || `Revisa ${label} de ${model.name} en ${businessName}. Usa sólo evidencia real. Dime qué está comprobado, qué falta, qué puede hacer ChatGPT y qué debe hacer una persona. Propón una sola acción verificable.`;
  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch { setShowPrompt(true); }
  }
  const executors = stage.metadata?.executor_options || ["chatgpt","human"];
  const executorLabels = { chatgpt:"ChatGPT", human:"Humano", hybrid:"ChatGPT + humano" };
  return (
    <article className={`stageActionCard ${checked ? "checked" : "pending"}`}>
      <div className="stageActionHead">
        <div><i>{stage.stage_number}</i><b>{label}</b></div>
        <StatusPill tone={checked ? "good" : "warn"}>{checked ? "comprobado" : "sin evidencia"}</StatusPill>
      </div>
      <p>{stage.objective}</p>
      <div className="stageRule"><span>Evidencia</span><strong>{stage.evidence_required}</strong></div>
      <div className="stageRecommendation"><span>Recomendación</span><strong>{stage.metadata?.recommendation || stage.next_action}</strong></div>
      <div className="executorRow">{executors.map(x => <span key={x}>{executorLabels[x] || x}</span>)}</div>
      {checked ? <div className="proofList">{proofs.slice(0,2).map(row => <small key={row.id}>✓ {row.result || row.evidence_type}</small>)}</div> : <small className="proofMissing">No avanza hasta tener prueba dentro de la célula.</small>}
      <div className="stageButtons">
        <button onClick={() => setShowPrompt(v => !v)}>{showPrompt ? "Ocultar" : "Trabajar en ChatGPT"}</button>
        <button onClick={copyPrompt}>{copied ? "Copiado ✓" : "Copiar prompt"}</button>
      </div>
      {showPrompt ? <pre className="stagePromptBox">{prompt}</pre> : null}
    </article>
  );
}

function BusinessFunnel({ models = [], stagesByModel, evidenceByModel, businessName }) {
  if (!models.length) return <section className="dossierList"><span className="sectionKicker">EMBUDO DE DESARROLLO</span><p>Esta ficha aún no tiene modelos ligados.</p></section>;
  return (
    <section className="businessFunnel">
      <div className="businessFunnelHead">
        <div><span className="sectionKicker">EMBUDO DEL NEGOCIO</span><h3>Lo esencial que debe funcionar</h3></div>
        <small>Comprobado dentro de la célula · no por intención.</small>
      </div>
      {models.map(model => {
        const stages=stagesByModel.get(model.id)||[];
        const evidence=evidenceByModel.get(model.id)||[];
        const economic=evidence.filter(isVerifiedEconomicProof);
        const contractual=evidence.filter(row => row.verified===true && Number(row.amount_clp||0)>0 && !isVerifiedEconomicProof(row));
        return (
          <div className="funnelCell" key={model.id}>
            <div className="funnelCellHead">
              <div><span className="sectionKicker">{model.link_metadata?.cell_label || "CÉLULA"}</span><h4>{model.name}</h4><p>{model.pain_statement}</p></div>
              <div className="proofCounter"><b>{economic.length}</b><span>prueba económica</span>{contractual.length ? <small>{contractual.length} señal contractual sin pago verificado</small> : null}</div>
            </div>
            <div className="funnelTrack">
              {stages.map(stage => <span key={stage.id} className={stageProofRows(evidence,stage.stage_key).length ? "done" : ""}>{stage.metadata?.canonical_label || stage.stage_key}</span>)}
            </div>
            <div className="stageActionGrid">
              {stages.map(stage => <StageActionCard key={stage.id} stage={stage} evidence={evidence} model={model} businessName={businessName} />)}
            </div>
            <div className="funnelGate"><span>Siguiente gate</span><strong>{model.next_gate || "Definir siguiente validación."}</strong></div>
          </div>
        );
      })}
    </section>
  );
}


export default function GameShell() {
  const [view, setView] = useState("concha");
  const [railCollapsed, setRailCollapsed] = useState(true);
  const [businesses, setBusinesses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [session, setSession] = useState(null);
  const [member, setMember] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [privateData, setPrivateData] = useState({
    missions: [], workspaces: [], integrations: [], events: [], activity: [],
    gameStates: [], gameActions: [], gameEvidence: [],
    models: [], modelLinks: [], modelStages: [], modelEvidence: [], modelArtifacts: [],
    rrss: [], financialPolicies: [], transactions: [], paymentProviders: [], cron: [], alerts: [], memoryCounts: null
  });
  const [notice, setNotice] = useState("");
  const [mapDockCollapsed, setMapDockCollapsed] = useState(false);
  const [mapDockPanel, setMapDockPanel] = useState("ficha");
  const [externalPlace, setExternalPlace] = useState(null);

  const selected = useMemo(
    () => businesses.find(row => row.id === selectedId) || businesses[0] || null,
    [businesses, selectedId]
  );

  const gameByBusiness = useMemo(() => {
    const map = new Map();
    for (const row of privateData.gameStates) if (!map.has(row.business_id)) map.set(row.business_id, row);
    return map;
  }, [privateData.gameStates]);

  const rrssByBusiness = useMemo(() => new Map(privateData.rrss.map(row => [row.business_id, row])), [privateData.rrss]);

  const actionsByBusiness = useMemo(() => {
    const map = new Map();
    for (const action of privateData.gameActions) {
      if (!map.has(action.business_id)) map.set(action.business_id, []);
      map.get(action.business_id).push(action);
    }
    return map;
  }, [privateData.gameActions]);

  const modelsByBusiness = useMemo(() => {
    const byId = new Map(privateData.models.map(model => [model.id, model]));
    const map = new Map();
    for (const link of privateData.modelLinks) {
      const model = byId.get(link.model_id);
      if (!model) continue;
      if (!map.has(link.business_id)) map.set(link.business_id, []);
      map.get(link.business_id).push({ ...model, link_role: link.role, link_status: link.status, link_metadata: link.metadata });
    }
    return map;
  }, [privateData.models, privateData.modelLinks]);

  const stagesByModel = useMemo(() => {
    const map = new Map();
    for (const row of privateData.modelStages) {
      if (!map.has(row.model_id)) map.set(row.model_id, []);
      map.get(row.model_id).push(row);
    }
    for (const rows of map.values()) rows.sort((a,b) => Number(a.stage_number || 99) - Number(b.stage_number || 99));
    return map;
  }, [privateData.modelStages]);

  const evidenceByModel = useMemo(() => {
    const map = new Map();
    for (const row of privateData.modelEvidence) {
      if (!map.has(row.model_id)) map.set(row.model_id, []);
      map.get(row.model_id).push(row);
    }
    return map;
  }, [privateData.modelEvidence]);

  const progressByBusiness = useMemo(() => {
    const map = new Map();
    for (const business of businesses) {
      const actions = actionsByBusiness.get(business.id) || [];
      const verifiedActions = actions.filter(action => action.status === "verified");
      const linkedModels = modelsByBusiness.get(business.id) || [];
      const primaryModel = linkedModels.find(model => model.link_role === "origin") || linkedModels[0] || null;
      const modelEvidence = primaryModel ? (evidenceByModel.get(primaryModel.id) || []) : [];
      const concha = primaryModel ? (stagesByModel.get(primaryModel.id) || []) : [];
      const transactions = privateData.transactions.filter(row => row.business_id === business.id || row.business_global_id === business.global_id);
      const paidTransactions = transactions.filter(row => ["paid","settled","confirmed","completed"].includes(String(row.status || "").toLowerCase()));
      const verifiedEconomicEvidence = modelEvidence.filter(isVerifiedEconomicProof);
      const branchEvidence = Array.isArray(business.owned_facts?.product_branches)
        ? business.owned_facts.product_branches.some(row => String(row.financial_state?.payment_status || "").includes("paid"))
        : false;
      const activated = paidTransactions.length > 0 || verifiedEconomicEvidence.length > 0 || branchEvidence;
      const recurringSignal = activated && linkedModels.some(model =>
        ["evidenced","productizable","replicable","business"].includes(String(model.maturity_stage || "")) &&
        ["monthly","per_session","recurring"].includes(String(model.model_definition?.billing || ""))
      );
      const conchaStarted = concha.length >= 6 && concha.filter(row => row.status && row.status !== "not_started").length >= 4;
      const delegated = business.owned_facts?.cell_state?.delegated === true;
      const autonomous = business.owned_facts?.cell_state?.autonomous === true;
      const expansion = business.owned_facts?.cell_state?.expansion === true || linkedModels.some(model => model.maturity_stage === "replicable");

      const stages = [
        { key: "opportunity", label: "Oportunidad", complete: linkedModels.length > 0 || business.verification_status === "verified", hint: "definir dolor, tratamiento y modelo" },
        { key: "activated", label: "Activado", complete: activated, hint: "conseguir una transacción económica verificable" },
        { key: "recurrent", label: "Recurrente", complete: recurringSignal, hint: "demostrar repetición del ingreso o servicio" },
        { key: "systematized", label: "Sistematizado", complete: conchaStarted, hint: "dejar las seis etapas operando con artefactos y evidencia" },
        { key: "delegated", label: "Delegado", complete: delegated, hint: "transferir ejecución sin perder control ni evidencia" },
        { key: "autonomous", label: "Autónomo", complete: autonomous, hint: "operar sin intervención habitual del Director" },
        { key: "expansion", label: "Expansión", complete: expansion && autonomous, hint: "replicar por mitosis o recombinar por meiosis" }
      ];
      const completeCount = stages.filter(stage => stage.complete).length;
      const level = Math.max(0, Math.min(6, completeCount - 1));
      const percent = Math.round((completeCount / stages.length) * 100);
      map.set(business.id, {
        level, percent, stages, next: stages.find(stage => !stage.complete) || null,
        verifiedActions: verifiedActions.length,
        transactionCount: transactions.length,
        paidTransactionCount: paidTransactions.length,
        linkedModelCount: linkedModels.length,
        conchaStageCount: concha.length,
        economicEvidenceCount: verifiedEconomicEvidence.length,
        activated,
        primaryModelId: primaryModel?.id || null
      });
    }
    return map;
  }, [businesses, actionsByBusiness, modelsByBusiness, evidenceByModel, stagesByModel, privateData.transactions]);

  const globalGame = useMemo(() => {
    const verifiedActions = privateData.gameActions.filter(action => action.status === "verified");
    const verifiedActionIds = new Set(verifiedActions.map(action => action.id));
    const verifiedEvidence = privateData.gameEvidence.filter(row => row.verification_status === "verified" && verifiedActionIds.has(row.action_id));
    const activeConnections = privateData.integrations.filter(row => row.status === "active").length;
    const sales = privateData.events.filter(row => ["sale.confirmed","reservation.completed","payment.recorded","operation.completed"].includes(row.event_type)).length;
    const stagePoints = [...progressByBusiness.values()].reduce((sum, row) => sum + row.level, 0);
    const xp = verifiedActions.length * 120 + verifiedEvidence.length * 40 + activeConnections * 60 + sales * 90 + stagePoints * 35;
    const nextLevelXp = 500;
    const level = Math.floor(xp / nextLevelXp) + 1;
    return {
      xp,
      level,
      levelXp: xp % nextLevelXp,
      nextLevelXp,
      verifiedActions: verifiedActions.length,
      activeConnections,
      sales
    };
  }, [privateData.gameActions, privateData.gameEvidence, privateData.integrations, privateData.events, progressByBusiness]);

  const loadPublic = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("link_world_businesses")
      .select("id,global_id,slug,name,sector,city,country,google_place_id,website,summary,owned_facts,evidence,created_from,verification_status,public_workspace,updated_at")
      .eq("public_workspace", true)
      .order("name");
    if (error) {
      setNotice("No pudimos leer los negocios públicos de LINK CONTROL CENTRAL.");
      return;
    }
    setBusinesses(data || []);
    setSelectedId(current => current || data?.[0]?.id || null);
  }, []);

  const loadPrivate = useCallback(async () => {
    if (!supabase || !member) return;
    const [
      missionsRead, workspacesRead, integrationsRead, eventsRead, activityRead,
      gameStatesRead, gameActionsRead, gameEvidenceRead, modelReads, rrssRead, financeReads,
      cronRead, alertsRead, memoryReads
    ] = await Promise.all([
      supabase.from("agent_missions").select("id,mission_code,business_global_id,stage_key,title,problem_statement,diagnosis,expected_outcome,created_by_agent,status,priority,assigned_agent_slug,metadata,updated_at").order("updated_at", { ascending: false }).limit(60),
      supabase.from("link_dot_workspaces").select("workspace_key,app_key,name,description,owner_linkdot_slug,owner_director_slug,route,status,metadata").order("name"),
      supabase.from("integration_connections").select("provider,connection_key,mode,status,last_seen_at,last_error,metadata").order("provider"),
      supabase.from("event_bus").select("id,source_provider,event_type,entity_type,global_id,occurred_at,received_at").order("received_at", { ascending: false }).limit(160),
      supabase.from("link_world_activity").select("id,action,target_type,target_id,origin,note,created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("link_game_state_snapshots").select("business_id,temperature,conversion_percent,state,last_verified_action_at,next_action_due_at,reason,captured_at").order("captured_at", { ascending: false }).limit(100),
      supabase.from("link_game_actions").select("id,business_id,mission_request_id,category,title,description,executor_type,evidence_requirement,status,base_heat,heat_awarded,conversion_before,conversion_after,prompt,next_prompt,occurred_at,verified_at,expires_at,metadata,created_at,updated_at").order("updated_at", { ascending: false }).limit(160),
      supabase.from("link_game_evidence").select("id,action_id,evidence_type,evidence_ref,summary,verification_status,submitted_by_type,verified_at,created_at").order("created_at", { ascending: false }).limit(200),
      Promise.all([
        supabase.from("link_world_models").select("id,model_key,name,pain_statement,solution_statement,model_kind,maturity_stage,economic_role,estimated_monthly_revenue_clp,estimated_monthly_cost_clp,director_hours_monthly,next_gate,model_definition,metrics,status,metadata").eq("status","active").order("updated_at",{ascending:false}),
        supabase.from("link_world_model_business_links").select("id,model_id,business_id,role,status,evidence,metadata,updated_at").in("status",["active","proposed"]).order("updated_at",{ascending:false}),
        supabase.from("link_world_model_stage_state").select("id,model_id,business_id,stage_key,stage_number,status,objective,strategy,next_action,evidence_required,metadata,updated_at").order("stage_number"),
        supabase.from("link_world_model_evidence").select("id,model_id,business_id,evidence_type,source_system,source_ref,result,amount_clp,verified,confidence,occurred_at,metadata,created_at").order("created_at",{ascending:false}),
        supabase.from("link_world_model_stage_artifacts").select("id,model_id,stage_key,artifact_id,role,status,metadata,created_at").order("created_at",{ascending:false})
      ]),
      supabase.from("link_rrss_profiles").select("id,business_id,name,slug,status,metadata").order("name"),
      Promise.all([
        supabase.from("link_financial_policies").select("id,business_id,policy_key,collection_model,payment_provider,default_currency,settlement_model,status,sandbox_enabled,production_enabled,updated_at").order("updated_at", { ascending: false }),
        supabase.from("link_world_transactions").select("id,business_id,business_global_id,direction,transaction_type,status,amount,currency,payment_method,occurred_at,due_at,paid_at").order("occurred_at", { ascending: false }).limit(100),
        supabase.from("link_payment_provider_accounts").select("id,business_id,provider,environment,status,webhook_status,verified_at,last_webhook_at,last_error,owner_scope,owner_global_id").order("updated_at", { ascending: false })
      ]),
      supabase.from("link_cron_registry").select("id,cron_key,name,description,cycle_label,schedule_config,status,source_system,updated_at,metadata").order("name"),
      supabase.from("link_rrss_notifications").select("id,business_id,notification_type,title,body,is_read,created_at,metadata").eq("is_read", false).order("created_at", { ascending: false }).limit(60),
      Promise.all([
        supabase.from("deep_memories").select("*", { count: "exact", head: true }),
        supabase.from("link_cortex_documents").select("*", { count: "exact", head: true }),
        supabase.from("link_learnings").select("*", { count: "exact", head: true }),
        supabase.from("link_daily_intelligence_reports").select("*", { count: "exact", head: true })
      ])
    ]);

    const failures = [
      missionsRead, workspacesRead, integrationsRead, eventsRead, activityRead,
      gameStatesRead, gameActionsRead, gameEvidenceRead, rrssRead, cronRead, alertsRead,
      ...modelReads, ...financeReads, ...memoryReads
    ].filter(result => result?.error);
    if (failures.length) console.warn("LINK WORLD GAME · protected read errors", failures.map(result => result.error?.message));

    setPrivateData({
      missions: safeRows(missionsRead),
      workspaces: safeRows(workspacesRead),
      integrations: safeRows(integrationsRead),
      events: safeRows(eventsRead),
      activity: safeRows(activityRead),
      gameStates: safeRows(gameStatesRead),
      gameActions: safeRows(gameActionsRead),
      gameEvidence: safeRows(gameEvidenceRead),
      models: safeRows(modelReads[0]),
      modelLinks: safeRows(modelReads[1]),
      modelStages: safeRows(modelReads[2]),
      modelEvidence: safeRows(modelReads[3]),
      modelArtifacts: safeRows(modelReads[4]),
      rrss: safeRows(rrssRead),
      financialPolicies: safeRows(financeReads[0]),
      transactions: safeRows(financeReads[1]),
      paymentProviders: safeRows(financeReads[2]),
      cron: safeRows(cronRead),
      alerts: safeRows(alertsRead),
      memoryCounts: {
        memories: memoryReads[0]?.count ?? 0,
        cortex: memoryReads[1]?.count ?? 0,
        learnings: memoryReads[2]?.count ?? 0,
        reports: memoryReads[3]?.count ?? 0
      }
    });
  }, [member]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setNotice("Falta la conexión Supabase.");
      return;
    }
    let alive = true;
    (async () => {
      await loadPublic();
      const { data: { session: current } } = await supabase.auth.getSession();
      if (!alive) return;
      setSession(current);
      if (current) {
        const check = await supabase.rpc("link_world_is_member");
        if (!alive) return;
        setMember(!check.error && check.data === true);
      }
      setLoading(false);
    })();
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, next) => {
      setSession(next);
      if (!next) {
        setMember(false);
        setPrivateData(prev => ({ ...prev, missions: [], workspaces: [], integrations: [], events: [], activity: [], gameStates: [], gameActions: [], gameEvidence: [], models: [], modelLinks: [], modelStages: [], modelEvidence: [], modelArtifacts: [], rrss: [], financialPolicies: [], transactions: [], paymentProviders: [], cron: [], alerts: [], memoryCounts: null }));
        return;
      }
      const check = await supabase.rpc("link_world_is_member");
      setMember(!check.error && check.data === true);
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [loadPublic]);

  useEffect(() => { void loadPrivate(); }, [loadPrivate]);

  useEffect(() => {
    if (!member || !supabase) return;
    const channel = supabase
      .channel("link-world-game-events")
      .on("postgres_changes", { event: "*", schema: "public", table: "event_bus" }, () => void loadPrivate())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [member, loadPrivate]);

  async function startGameAction(action) {
    if (!supabase || !member || !action?.id) return;
    setNotice("");
    const { error } = await supabase
      .from("link_game_actions")
      .update({ status: "in_progress" })
      .eq("id", action.id)
      .eq("status", "planned");
    if (error) {
      setNotice("No pude iniciar la misión: " + error.message);
      return;
    }
    setNotice("Misión iniciada · ahora necesita ejecución y evidencia real.");
    await loadPrivate();
  }

  async function submitGameEvidence(action, ref) {
    if (!supabase || !member || !action?.id || !ref) return;
    setNotice("");
    const evidenceType = /^https?:\/\//i.test(ref) ? "url" : "other";
    const { error: evidenceError } = await supabase.from("link_game_evidence").insert({
      action_id: action.id,
      evidence_type: evidenceType,
      evidence_ref: ref,
      summary: "Evidencia enviada desde LINK WORLD GAME para revisión.",
      verification_status: "pending",
      submitted_by_type: "human"
    });
    if (evidenceError) {
      setNotice("No pude registrar la evidencia: " + evidenceError.message);
      return;
    }
    const { error: actionError } = await supabase.from("link_game_actions").update({ status: "awaiting_evidence" }).eq("id", action.id);
    if (actionError) setNotice("La evidencia quedó registrada, pero no pude mover la misión a verificación.");
    else setNotice("Evidencia registrada · la misión quedó esperando validación.");
    await loadPrivate();
  }

  async function researchExternalPlace(place) {
    if (!place?.placeId || !window.google?.maps) return;
    setNotice("");
    try {
      const { Place } = await window.google.maps.importLibrary("places");
      const googlePlace = new Place({ id: place.placeId, requestedLanguage: "es", requestedRegion: "CL" });
      await googlePlace.fetchFields({
        fields: ["id", "displayName", "formattedAddress", "primaryTypeDisplayName", "websiteURI", "nationalPhoneNumber", "internationalPhoneNumber", "rating", "userRatingCount", "googleMapsURI", "businessStatus", "regularOpeningHours"]
      });
      setExternalPlace({
        ...place,
        displayName: googlePlace.displayName || place.displayName,
        formattedAddress: googlePlace.formattedAddress || place.formattedAddress,
        primaryTypeDisplayName: googlePlace.primaryTypeDisplayName || place.primaryTypeDisplayName,
        websiteURI: googlePlace.websiteURI || place.websiteURI,
        nationalPhoneNumber: googlePlace.nationalPhoneNumber || place.nationalPhoneNumber,
        internationalPhoneNumber: googlePlace.internationalPhoneNumber || "",
        rating: googlePlace.rating ?? place.rating,
        userRatingCount: googlePlace.userRatingCount ?? place.userRatingCount,
        googleMapsURI: googlePlace.googleMapsURI || place.googleMapsURI,
        businessStatus: googlePlace.businessStatus || "",
        openNow: googlePlace.regularOpeningHours?.openNow ?? null,
        weekdayText: googlePlace.regularOpeningHours?.weekdayDescriptions || [],
        researched: true
      });
      setMapDockPanel("ficha");
      setMapDockCollapsed(false);
      setNotice("Ficha Google actualizada · todavía no se guardó como negocio LINK.");
    } catch (error) {
      setNotice("No pude ampliar esta ficha desde Google Places: " + (error?.message || "error desconocido"));
    }
  }

  function handleExplorePlace(place) {
    if (place?.kind === "linked" && place.businessId) {
      setSelectedId(place.businessId);
      setExternalPlace(null);
    } else if (place?.kind === "external") {
      setExternalPlace(place);
    }
    setMapDockPanel("ficha");
    setMapDockCollapsed(false);
  }

  function handleSelectBusiness(id) {
    setSelectedId(id);
    setExternalPlace(null);
    setMapDockPanel("ficha");
  }

  function openFullBusiness(business) {
    if (!business?.id) return;
    setSelectedId(business.id);
    setExternalPlace(null);
    setView("negocios");
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setView("mundo");
  }

  const showMap = business => {
    setSelectedId(business.id);
    setExternalPlace(null);
    setMapDockPanel("ficha");
    setMapDockCollapsed(false);
    setView("mundo");
  };

  const openCount = privateData.missions.filter(row => !["verified", "cancelled", "closed"].includes(row.status)).length;
  const alertCount = privateData.alerts.filter(row => row.is_read !== true).length;
  const selectedModels = selected ? (modelsByBusiness.get(selected.id) || []) : [];
  const selectedTransactions = selected ? privateData.transactions.filter(row => row.business_id === selected.id || row.business_global_id === selected.global_id) : [];

  return (
    <main className="gameApp">
      <header className="gameTopbar">
        <button className="brandButton" onClick={() => setView("concha")}>
          <span className="brandMark">••<br/>••</span>
          <span><b>LINK WORLD</b><small>Control central jugable</small></span>
        </button>
        <div className="topTabs">
          {TOP.map(([id, label]) => <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}>{label}</button>)}
        </div>
        <div className="topSession">
          <span className={`liveDot ${member ? "on" : ""}`} />
          <span>{member ? "Ecosistema conectado" : "Capa pública"}</span>
          {member ? <button onClick={signOut}>Salir</button> : <button onClick={() => setLoginOpen(true)}>Entrar</button>}
        </div>
      </header>

      <div className={`gameBody ${railCollapsed ? "railIsCollapsed" : ""}`}>
        <aside className="leftRail">
          <button className="railCollapseToggle" aria-label={railCollapsed ? "Abrir menú lateral" : "Plegar menú lateral"} aria-expanded={!railCollapsed} onClick={() => setRailCollapsed(value => !value)}>{railCollapsed ? "☰" : "‹"}</button>
          <div className="railStatus">
            <b>{businesses.length}</b><span>células visibles</span>
          </div>
          <nav className="railNav">
            {NAV.map(([id, icon, label]) => (
              <button key={id} title={label} aria-label={label} className={view === id ? "active" : ""} onClick={() => setView(id)}>
                <i>{icon}</i><span>{label}</span>
                {id === "misiones" && member && openCount ? <em>{openCount}</em> : null}
                {id === "alertas" && member && alertCount ? <em>{alertCount}</em> : null}
              </button>
            ))}
          </nav>
          <div className="railFooter">
            <span>Supabase</span><b className={hasSupabaseConfig ? "okText" : "warnText"}>{hasSupabaseConfig ? "conectado" : "pendiente"}</b>
          </div>
        </aside>

        <section className="mainSurface">
          {notice ? <div className="globalNotice">{notice}<button onClick={() => setNotice("")}>×</button></div> : null}
          {loading ? <div className="loadingScreen">Sincronizando LINK WORLD…</div> : null}

          {!loading ? (
            <div hidden={view !== "concha"}><ConchaWorld businesses={businesses} selectedId={selected?.id} onSelect={handleSelectBusiness} privateData={privateData} member={member} onLogin={() => setLoginOpen(true)} onOpenBusiness={openFullBusiness} renderMission={row => <MissionCard key={row.id || row.mission_code} row={row} businessName={businesses.find(b => b.global_id === row.business_global_id)?.name} />} /></div>
          ) : null}

          {!loading && view === "mundo" ? (
            <div className={`worldLayout mapDockLayout ${mapDockCollapsed ? "dockIsCollapsed" : ""}`}>
              <div className="mapGameStage">
                <TerritoryMap
                  businesses={businesses}
                  selectedBusiness={selected}
                  onSelectBusiness={handleSelectBusiness}
                  progressByBusiness={progressByBusiness}
                  onExplorePlace={handleExplorePlace}
                />
              </div>
              <MapPanelDock
                collapsed={mapDockCollapsed}
                activePanel={mapDockPanel}
                onToggleCollapse={() => setMapDockCollapsed(value => !value)}
                onSelectPanel={setMapDockPanel}
                business={externalPlace?.kind === "external" ? null : selected}
                externalPlace={externalPlace}
                progress={progressByBusiness.get(selected?.id)}
                gameState={gameByBusiness.get(selected?.id)}
                globalGame={globalGame}
                rrssProfile={rrssByBusiness.get(selected?.id)}
                actions={actionsByBusiness.get(selected?.id) || []}
                evidence={privateData.gameEvidence}
                onStartAction={startGameAction}
                onSubmitEvidence={submitGameEvidence}
                onOpenFullBusiness={openFullBusiness}
                onResearchPlace={researchExternalPlace}
                businesses={businesses}
                progressByBusiness={progressByBusiness}
                selectedId={selected?.id}
                onSelectBusiness={handleSelectBusiness}
              />
            </div>
          ) : null}

          {!loading && view === "modelos" ? (
            member ? (
              <section className="contentView">
                <div className="viewHead"><div><span className="sectionKicker">DOLOR → MODELO → NEGOCIO</span><h1>Modelos económicos de LINK</h1></div><span>{privateData.models.length} modelos activos</span></div>
                <p className="viewIntro">Aquí no se premian tareas. Cada modelo debe demostrar dolor, tratamiento, evidencia económica y una célula capaz de recorrer la Concha. Los modelos sin evidencia permanecen como hobby o experimento.</p>
                <ModelLibrary models={privateData.models} links={privateData.modelLinks} stages={privateData.modelStages} evidence={privateData.modelEvidence} artifacts={privateData.modelArtifacts} businesses={businesses} onOpenBusiness={openFullBusiness} />
              </section>
            ) : <LockPanel title="Modelos económicos de LINK" onOpenLogin={() => setLoginOpen(true)} />
          ) : null}

          {!loading && view === "negocios" ? (
            <section className="contentView">
              <div className="viewHead"><div><span className="sectionKicker">CÉLULAS LINK</span><h1>Fichas de negocios</h1></div><span>{businesses.length} visibles</span></div>
              <BusinessDossier business={selected} progress={progressByBusiness.get(selected?.id)} onShowMap={showMap} models={selectedModels} stagesByModel={stagesByModel} evidenceByModel={evidenceByModel} transactions={selectedTransactions} />
              <div className="businessGrid businessGridCompact">
                {businesses.map(b => (
                  <article key={b.id} className={`businessCard ${selected?.id === b.id ? "selectedBusinessCard" : ""}`}>
                    <div className="cardTop"><StatusPill tone={b.verification_status === "verified" ? "good" : "warn"}>{b.verification_status}</StatusPill><small>{b.city}</small></div>
                    <h3>{b.name}</h3><p>{b.summary || b.sector}</p>
                    <div className="miniMeta"><span>{businessModelLabel(b)}</span><span>{progressByBusiness.get(b.id)?.percent || 0}% desarrollo</span></div>
                    <div className="cardActions"><button onClick={() => setSelectedId(b.id)}>Ver ficha</button><button onClick={() => showMap(b)}>Mapa</button>{b.website ? <a href={b.website} target="_blank" rel="noreferrer">Sistema ↗</a> : null}</div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {!loading && view === "tableros" ? (
            member ? (
              <section className="contentView">
                <div className="viewHead"><div><span className="sectionKicker">MESAS REALES</span><h1>Tableros conectados</h1></div><span>{privateData.workspaces.length} mesas</span></div>
                <div className="workspaceGrid">
                  {privateData.workspaces.map(row => {
                    const url = resolveWorkspaceUrl(row);
                    return <article className="workspaceCard" key={row.workspace_key}>
                      <div className="workspaceIcon">▦</div>
                      <div><span className="sectionKicker">{row.owner_linkdot_slug}</span><h3>{row.name}</h3><p>{row.description || row.metadata?.workspace_role || "Mesa especializada LINK"}</p></div>
                      {url ? <a href={url} target="_blank" rel="noreferrer">Abrir mesa ↗</a> : <StatusPill tone="warn">sin ruta</StatusPill>}
                    </article>;
                  })}
                </div>
              </section>
            ) : <LockPanel title="Tableros del ecosistema" onOpenLogin={() => setLoginOpen(true)} />
          ) : null}

          {!loading && view === "misiones" ? (
            member ? (
              <section className="contentView">
                <div className="viewHead"><div><span className="sectionKicker">MODO DIOS · CHATGPT</span><h1>Pendientes reales</h1></div><span>{openCount} activos</span></div>
                <div className="missionList">
                  {privateData.missions.map(row => {
                    const businessName = businesses.find(business => business.global_id === row.business_global_id)?.name;
                    return <MissionCard key={row.mission_code} row={row} businessName={businessName} />;
                  })}
                </div>
              </section>
            ) : <LockPanel title="Pendientes y LINKDOTs" onOpenLogin={() => setLoginOpen(true)} />
          ) : null}

          {!loading && (view === "eventos" || view === "red") ? (
            member ? (
              <section className="contentView">
                <div className="viewHead"><div><span className="sectionKicker">{view === "red" ? "MICELIO" : "EVENT BUS"}</span><h1>{view === "red" ? "Red del ecosistema" : "Eventos reales"}</h1></div><span>{view === "red" ? privateData.integrations.length + " integraciones" : privateData.events.length + " señales"}</span></div>
                {view === "red" ? (
                  <div className="networkColumns">
                    <div className="networkPanel"><h3>Integraciones</h3>{privateData.integrations.map((row, i) => <div className="networkRow" key={i}><span><b>{row.provider}</b><small>{row.connection_key}</small></span><StatusPill tone={row.status === "active" ? "good" : "warn"}>{row.status}</StatusPill></div>)}</div>
                    <div className="networkPanel"><h3>Relación de superficies</h3>{privateData.workspaces.map(row => <div className="networkRow" key={row.workspace_key}><span><b>{row.name}</b><small>{row.app_key}</small></span><span className="thinText">{row.owner_linkdot_slug}</span></div>)}</div>
                  </div>
                ) : (
                  <div className="timelineList">
                    {privateData.events.map(row => <article className="timelineRow" key={row.id}><i className="eventDot"/><div><span>{row.source_provider} · {row.entity_type}</span><h3>{row.event_type}</h3><small>{row.global_id || "evento de sistema"}</small></div><div className="rowEnd"><small>{fmtDate(row.occurred_at || row.received_at)}</small></div></article>)}
                  </div>
                )}
              </section>
            ) : <LockPanel title={view === "red" ? "Micelio privado" : "Event Bus"} onOpenLogin={() => setLoginOpen(true)} />
          ) : null}

          {!loading && view === "economia" ? (
            member ? (
              <section className="contentView">
                <div className="viewHead"><div><span className="sectionKicker">FIN · TRANSVERSAL</span><h1>Verdad económica por célula</h1></div><a href="https://linkcontrolgeneral.vercel.app" target="_blank" rel="noreferrer">Abrir Control Central ↗</a></div>
                <div className="economyGrid">
                  {businesses.map(business => {
                    const policies = privateData.financialPolicies.filter(row => row.business_id === business.id);
                    const providers = privateData.paymentProviders.filter(row => row.business_id === business.id);
                    const tx = privateData.transactions.filter(row => row.business_id === business.id);
                    const activePolicy = policies.find(row => row.status === "active" || row.production_enabled) || policies[0];
                    return <article className="economyCard" key={business.id}>
                      <span className="sectionKicker">{activePolicy?.default_currency || tx[0]?.currency || "CLP"}</span>
                      <h3>{business.name}</h3>
                      <p>{activePolicy ? `${activePolicy.collection_model || "cobro"} · ${activePolicy.payment_provider || "proveedor por definir"}` : "Política financiera no expuesta en esta capa."}</p>
                      <div className="miniMeta"><span>{tx.length} movimientos</span><span>{providers.length} proveedor(es)</span></div>
                      <StatusPill tone={activePolicy?.production_enabled ? "good" : activePolicy ? "neutral" : "warn"}>{activePolicy?.production_enabled ? "producción" : activePolicy?.status || "sin ruta"}</StatusPill>
                    </article>;
                  })}
                </div>
                <div className="gameStateTable">
                  <h3>Estado jugable por negocio</h3>
                  {[...gameByBusiness.entries()].map(([id, row]) => {
                    const b = businesses.find(x => x.id === id);
                    if (!b) return null;
                    return <div className="gameStateRow" key={id}><span><b>{b.name}</b><small>{row.reason}</small></span><strong>{Math.round(Number(row.temperature || 0))}°</strong><span>{Math.round(Number(row.conversion_percent || 0))}%</span><StatusPill tone={row.state?.includes("red") ? "warn" : "neutral"}>{row.state}</StatusPill></div>;
                  })}
                </div>
              </section>
            ) : <LockPanel title="FIN y economía del juego" onOpenLogin={() => setLoginOpen(true)} />
          ) : null}

          {!loading && view === "cron" ? (
            member ? <section className="contentView"><div className="viewHead"><div><span className="sectionKicker">CRON</span><h1>Ritmos del organismo</h1></div><span>{privateData.cron.length} rutinas</span></div><div className="timelineList">{privateData.cron.map(row => <article className="timelineRow" key={row.id || row.cron_key}><i className="eventDot"/><div><span>{row.status} · {row.source_system || "LINK"}</span><h3>{row.name || row.cron_key}</h3><small>{row.cycle_label || row.description || "ciclo persistente"}</small></div><div className="rowEnd"><small>{fmtDate(row.updated_at)}</small></div></article>)}</div></section>
            : <LockPanel title="Cron del ecosistema" onOpenLogin={() => setLoginOpen(true)} />
          ) : null}

          {!loading && view === "alertas" ? (
            member ? <section className="contentView"><div className="viewHead"><div><span className="sectionKicker">SEÑALES</span><h1>Alertas y conversaciones que requieren atención</h1></div><span>{alertCount} sin leer</span></div><div className="timelineList">{privateData.alerts.length ? privateData.alerts.map(row => <article className="timelineRow" key={row.id}><i className="priorityDot priority-high"/><div><span>{row.notification_type || "LINKRRSS"}</span><h3>{row.title}</h3><small>{row.body || "Señal pendiente"}</small></div><div className="rowEnd"><StatusPill tone="warn">{row.is_read ? "leída" : "pendiente"}</StatusPill><small>{fmtDate(row.created_at)}</small></div></article>) : <div className="emptyState">No hay notificaciones pendientes en la capa autorizada.</div>}</div></section>
            : <LockPanel title="Alertas del organismo" onOpenLogin={() => setLoginOpen(true)} />
          ) : null}

          {!loading && view === "memoria" ? (
            member ? <section className="contentView"><div className="viewHead"><div><span className="sectionKicker">HIPOCAMPO + CORTEX</span><h1>Memoria del organismo</h1></div><a href="https://linkcontrolgeneral.vercel.app" target="_blank" rel="noreferrer">Abrir Control Central ↗</a></div><div className="memoryGrid"><article><b>{privateData.memoryCounts?.memories ?? 0}</b><span>recuerdos profundos</span></article><article><b>{privateData.memoryCounts?.cortex ?? 0}</b><span>documentos Cortex</span></article><article><b>{privateData.memoryCounts?.learnings ?? 0}</b><span>aprendizajes</span></article><article><b>{privateData.memoryCounts?.reports ?? 0}</b><span>informes diarios</span></article></div><div className="contextBlock"><span className="sectionKicker">CONTRATO</span><strong>Cortex encuentra · Hipocampo contextualiza · ChatGPT ayuda a decidir · LINKDOTs ejecutan · LINK WORLD conserva evidencia.</strong></div></section>
            : <LockPanel title="Hipocampo y Cortex" onOpenLogin={() => setLoginOpen(true)} />
          ) : null}

          {!loading && view === "configuracion" ? (
            <section className="contentView">
              <div className="viewHead"><div><span className="sectionKicker">ESTADO TÉCNICO</span><h1>Conexiones del juego</h1></div><span>{member ? "miembro LINK" : "capa pública"}</span></div>
              <div className="configGrid">
                <article><span className="sectionKicker">GOOGLE</span><h3>Maps + Places</h3><p>Territorio real, Place IDs, búsqueda y geocodificación.</p><StatusPill tone="good">operativo</StatusPill></article>
                <article><span className="sectionKicker">SUPABASE</span><h3>LINK CONTROL CENTRAL</h3><p>Fuente viva del organismo. RLS conserva la separación público/miembro.</p><StatusPill tone={hasSupabaseConfig ? "good" : "warn"}>{hasSupabaseConfig ? "conectado" : "pendiente"}</StatusPill></article>
                <article><span className="sectionKicker">VERCEL</span><h3>LINK WORLD GAME</h3><p>Superficie jugable y deploy persistente.</p><StatusPill tone="good">production</StatusPill></article>
                <article><span className="sectionKicker">MICELIO</span><h3>Mesas + integraciones</h3><p>{member ? privateData.integrations.length + " integraciones leídas desde CONTROL CENTRAL." : "Entra como miembro para inspeccionar las conexiones privadas."}</p><StatusPill tone={member ? "good" : "neutral"}>{member ? "visible" : "protegido"}</StatusPill></article>
              </div>
            </section>
          ) : null}
        </section>
      </div>

      {loginOpen ? <LoginPanel onClose={() => setLoginOpen(false)} /> : null}
    </main>
  );
}
