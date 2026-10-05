"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import TerritoryMap from "./TerritoryMap";
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
  ["mundo", "◎", "Mundo"],
  ["misiones", "◇", "Misiones"],
  ["tableros", "▦", "Tableros"],
  ["cron", "◷", "Cron"],
  ["negocios", "□", "Negocios"],
  ["alertas", "!", "Alertas"],
  ["memoria", "≋", "Memoria"],
  ["configuracion", "⚙", "Configuración"]
];

const TOP = [
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

function BusinessInspector({ business, gameState, rrssProfile, onShowMap }) {
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

      <div className="contextStats">
        <div><b>{business.google_place_id ? "✓" : "—"}</b><span>Google Place</span></div>
        <div><b>{Math.round(temp)}°</b><span>temperatura</span></div>
        <div><b>{gameState ? Math.round(Number(gameState.conversion_percent || 0)) + "%" : "—"}</b><span>conversión</span></div>
        <div><b>{rrssProfile ? "✓" : "—"}</b><span>RRSS</span></div>
      </div>

      {gameState ? (
        <div className="contextBlock">
          <span className="sectionKicker">ESTADO JUGABLE</span>
          <strong>{state.replaceAll("_", " ")}</strong>
          <p>{gameState.reason || "La temperatura cambia sólo con evidencia verificable."}</p>
        </div>
      ) : null}

      <div className="actionStack">
        <button className="primaryButton" onClick={() => onShowMap(business)}>Ubicar en territorio →</button>
        {website ? <a className="secondaryButton" href={website} target="_blank" rel="noreferrer">Abrir sistema del negocio ↗</a> : null}
        <a className="secondaryButton" href="https://link-world-delta.vercel.app" target="_blank" rel="noreferrer">Abrir ficha LINK ↗</a>
        {rrssProfile ? <a className="secondaryButton" href="https://linkrrss.vercel.app" target="_blank" rel="noreferrer">Abrir LINKRRSS ↗</a> : null}
      </div>
    </aside>
  );
}

export default function GameShell() {
  const [view, setView] = useState("mundo");
  const [businesses, setBusinesses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [session, setSession] = useState(null);
  const [member, setMember] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [privateData, setPrivateData] = useState({
    missions: [], workspaces: [], integrations: [], events: [], activity: [],
    gameStates: [], rrss: [], financialPolicies: [], transactions: [], paymentProviders: [], cron: [], alerts: [], memoryCounts: null
  });
  const [notice, setNotice] = useState("");

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

  const loadPublic = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("link_world_businesses")
      .select("id,global_id,slug,name,sector,city,country,google_place_id,website,summary,verification_status,public_workspace,updated_at")
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
    const queries = await Promise.all([
      supabase.from("agent_missions").select("mission_code,business_global_id,stage_key,title,status,priority,assigned_agent_slug,updated_at").order("updated_at", { ascending: false }).limit(60),
      supabase.from("link_dot_workspaces").select("workspace_key,app_key,name,description,owner_linkdot_slug,owner_director_slug,route,status,metadata").order("name"),
      supabase.from("integration_connections").select("provider,connection_key,mode,status,last_seen_at,last_error,metadata").order("provider"),
      supabase.from("event_bus").select("id,source_provider,event_type,entity_type,global_id,occurred_at,received_at").order("received_at", { ascending: false }).limit(120),
      supabase.from("link_world_activity").select("id,action,target_type,target_id,origin,note,created_at").order("created_at", { ascending: false }).limit(80),
      supabase.from("link_game_state_snapshots").select("business_id,temperature,conversion_percent,state,next_action_due_at,reason,captured_at").order("captured_at", { ascending: false }).limit(80),
      supabase.from("link_rrss_profiles").select("id,business_id,name,slug,status,metadata").order("name"),
      Promise.all([
        supabase.from("link_financial_policies").select("id,business_id,policy_key,collection_model,payment_provider,default_currency,settlement_model,status,sandbox_enabled,production_enabled,updated_at").order("updated_at", { ascending: false }),
        supabase.from("link_world_transactions").select("id,business_id,business_global_id,direction,transaction_type,status,amount,currency,payment_method,occurred_at,due_at,paid_at").order("occurred_at", { ascending: false }).limit(80),
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

    const finance = queries[7];
    const memory = queries[10];
    const failures = queries
      .slice(0, 10)
      .flatMap((result, index) => Array.isArray(result) ? result.map((part, partIndex) => ({ result: part, label: `q${index}.${partIndex}` })) : [{ result, label: `q${index}` }])
      .filter(item => item.result?.error);
    if (failures.length) {
      console.warn("LINK WORLD GAME · protected reads with errors", failures.map(item => [item.label, item.result.error?.message]));
    }
    setPrivateData({
      missions: safeRows(queries[0]),
      workspaces: safeRows(queries[1]),
      integrations: safeRows(queries[2]),
      events: safeRows(queries[3]),
      activity: safeRows(queries[4]),
      gameStates: safeRows(queries[5]),
      rrss: safeRows(queries[6]),
      financialPolicies: safeRows(finance[0]),
      transactions: safeRows(finance[1]),
      paymentProviders: safeRows(finance[2]),
      cron: safeRows(queries[8]),
      alerts: safeRows(queries[9]),
      memoryCounts: {
        memories: memory[0]?.count ?? 0,
        cortex: memory[1]?.count ?? 0,
        learnings: memory[2]?.count ?? 0,
        reports: memory[3]?.count ?? 0
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
        setPrivateData(prev => ({ ...prev, missions: [], workspaces: [], integrations: [], events: [], activity: [], gameStates: [], rrss: [], financialPolicies: [], transactions: [], paymentProviders: [], cron: [], alerts: [], memoryCounts: null }));
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

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setView("mundo");
  }

  const showMap = business => {
    setSelectedId(business.id);
    setView("mundo");
  };

  const openCount = privateData.missions.filter(row => !["verified", "cancelled", "closed"].includes(row.status)).length;
  const alertCount = privateData.alerts.filter(row => row.is_read !== true).length;

  return (
    <main className="gameApp">
      <header className="gameTopbar">
        <button className="brandButton" onClick={() => setView("mundo")}>
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

      <div className="gameBody">
        <aside className="leftRail">
          <div className="railStatus">
            <b>{businesses.length}</b><span>células visibles</span>
          </div>
          <nav className="railNav">
            {NAV.map(([id, icon, label]) => (
              <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}>
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

          {!loading && view === "mundo" ? (
            <div className="worldLayout">
              <TerritoryMap businesses={businesses} selectedBusiness={selected} onSelectBusiness={setSelectedId} />
              <BusinessInspector business={selected} gameState={gameByBusiness.get(selected?.id)} rrssProfile={rrssByBusiness.get(selected?.id)} onShowMap={showMap} />
            </div>
          ) : null}

          {!loading && view === "negocios" ? (
            <section className="contentView">
              <div className="viewHead"><div><span className="sectionKicker">CÉLULAS LINK</span><h1>Negocios del ecosistema</h1></div><span>{businesses.length} visibles</span></div>
              <div className="businessGrid">
                {businesses.map(b => (
                  <article key={b.id} className="businessCard">
                    <div className="cardTop"><StatusPill tone={b.verification_status === "verified" ? "good" : "warn"}>{b.verification_status}</StatusPill><small>{b.city}</small></div>
                    <h3>{b.name}</h3><p>{b.sector}</p>
                    <div className="miniMeta"><span>{b.google_place_id ? "Google ✓" : "Google por vincular"}</span><span>{gameByBusiness.get(b.id)?.state || "sin capa juego"}</span></div>
                    <div className="cardActions"><button onClick={() => showMap(b)}>Mapa</button>{b.website ? <a href={b.website} target="_blank" rel="noreferrer">Sistema ↗</a> : null}</div>
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
                <div className="viewHead"><div><span className="sectionKicker">DIRECTOR / DOTs</span><h1>Misiones vivas</h1></div><span>{openCount} activas</span></div>
                <div className="timelineList">
                  {privateData.missions.map(row => <article key={row.mission_code} className="timelineRow">
                    <i className={`priorityDot priority-${row.priority}`} />
                    <div><span>{row.stage_key} · {row.assigned_agent_slug || "sin asignar"}</span><h3>{row.title}</h3><small>{row.mission_code}</small></div>
                    <div className="rowEnd"><StatusPill tone={row.status === "active" ? "good" : "neutral"}>{row.status}</StatusPill><small>{fmtDate(row.updated_at)}</small></div>
                  </article>)}
                </div>
              </section>
            ) : <LockPanel title="Misiones del Director y LINKDOTs" onOpenLogin={() => setLoginOpen(true)} />
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
                <div className="viewHead"><div><span className="sectionKicker">FIN</span><h1>Economía del ecosistema</h1></div><a href="https://linkcontrolgeneral.vercel.app" target="_blank" rel="noreferrer">Abrir Control Central ↗</a></div>
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
            member ? <section className="contentView"><div className="viewHead"><div><span className="sectionKicker">HIPOCAMPO + CORTEX</span><h1>Memoria del organismo</h1></div><a href="https://linkcontrolgeneral.vercel.app" target="_blank" rel="noreferrer">Abrir Control Central ↗</a></div><div className="memoryGrid"><article><b>{privateData.memoryCounts?.memories ?? 0}</b><span>recuerdos profundos</span></article><article><b>{privateData.memoryCounts?.cortex ?? 0}</b><span>documentos Cortex</span></article><article><b>{privateData.memoryCounts?.learnings ?? 0}</b><span>aprendizajes</span></article><article><b>{privateData.memoryCounts?.reports ?? 0}</b><span>informes diarios</span></article></div><div className="contextBlock"><span className="sectionKicker">CONTRATO</span><strong>Cortex encuentra · Hipocampo contextualiza · Director decide · LINKDOTs ejecutan.</strong></div></section>
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
