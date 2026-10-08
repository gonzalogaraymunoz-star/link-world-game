"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { CONCHA_STAGES } from "../lib/concha.mjs";
import { buildControlUrl, buildWorldUrl, contextFromBusiness, readLinkContext } from "../lib/link-app-context.mjs";

const EMPTY_STAGE = { state: "empty", current_focus: null, mission: null, journey: null };

function human(value) {
  const map = {
    verified: "Verificado",
    completed: "Completado",
    active: "Activo",
    approved: "Aprobado",
    working: "Trabajando",
    processing: "Trabajando",
    queued: "En cola",
    watching: "Observando",
    blocked: "Bloqueado",
    waiting_approval: "Espera aprobación",
    awaiting_approval: "Espera aprobación",
    waiting_evidence: "Espera evidencia",
    retry_wait: "Reintentando",
    draft: "En desarrollo",
    needs_review: "En revisión"
  };
  return map[String(value || "")] || value || "Sin estado";
}

function tone(value) {
  const v = String(value || "");
  if (/blocked|failed|error/.test(v)) return "danger";
  if (/waiting|awaiting|retry|review/.test(v)) return "warn";
  if (/verified|completed|approved/.test(v)) return "good";
  if (/active|working|processing|queued/.test(v)) return "active";
  return "quiet";
}

export default function BusinessEvolutionGame() {
  const [businesses,setBusinesses] = useState([]);
  const [journeys,setJourneys] = useState([]);
  const [scopes,setScopes] = useState([]);
  const [missions,setMissions] = useState([]);
  const [member,setMember] = useState(false);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [businessId,setBusinessId] = useState(null);
  const [stageKey,setStageKey] = useState("marketing");
  const [theme,setTheme] = useState("gray");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [authBusy,setAuthBusy] = useState(false);

  useEffect(() => {
    const ctx = readLinkContext(window.location.search);
    if (ctx.business) setBusinessId(ctx.business);
    if (ctx.stage) setStageKey(ctx.stage);
    try {
      const saved = window.localStorage.getItem("link-game-theme");
      if (["day","gray","night"].includes(saved)) setTheme(saved);
    } catch {}
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem("link-game-theme",theme); } catch {}
  }, [theme]);

  const loadPublic = useCallback(async () => {
    if (!supabase) return;
    const result = await supabase
      .from("link_world_businesses")
      .select("id,global_id,slug,name,sector,city,verification_status,public_workspace")
      .eq("public_workspace",true)
      .order("name");
    if (result.error) throw result.error;
    setBusinesses(result.data || []);
    setBusinessId(current => current || result.data?.[0]?.id || null);
  }, []);

  const loadPrivate = useCallback(async () => {
    if (!supabase || !member) return;
    const [journeyRead,scopeRead,missionRead] = await Promise.all([
      supabase.from("link_business_agent_journey_v")
        .select("business_id,business_global_id,business_slug,business_name,stage_number,stage_key,stage_name,customer_state_in,customer_state_out,director_slug,director_name,director_runtime,runtime_route,autonomy_mode,execution_enabled,mission_id,mission_code,mission_title,expected_outcome,mission_status,priority,evidence_requested,evidence_received,evidence_validated,evidence_rejected,last_evidence_at")
        .order("business_name").order("stage_number"),
      supabase.from("agent_scope_state")
        .select("scope_key,agent_slug,business_global_id,business_name,stage_key,stage_name,state,priority,current_focus,current_mission_id,current_mission_code,last_signal_at,next_review_at,updated_at")
        .order("updated_at",{ascending:false}),
      supabase.from("agent_missions")
        .select("id,mission_code,business_global_id,stage_key,title,status,priority,expected_outcome,updated_at")
        .order("updated_at",{ascending:false}).limit(160)
    ]);
    const firstError = [journeyRead,scopeRead,missionRead].find(row => row.error)?.error;
    if (firstError) throw firstError;
    setJourneys(journeyRead.data || []);
    setScopes(scopeRead.data || []);
    setMissions(missionRead.data || []);
  }, [member]);

  useEffect(() => {
    if (!supabase) {
      setError("LINK WORLD GAME no tiene conexión Supabase.");
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        await loadPublic();
        const { data:{session} } = await supabase.auth.getSession();
        if (!alive) return;
        if (session) {
          const check = await supabase.rpc("link_world_is_member");
          if (!alive) return;
          setMember(!check.error && check.data === true);
        }
      } catch (err) {
        if (alive) setError(err?.message || "No se pudo cargar LINK WORLD GAME.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    const {data:listener}=supabase.auth.onAuthStateChange(async(_event,session)=>{
      if (!session) { setMember(false); setJourneys([]); setScopes([]); setMissions([]); return; }
      const check=await supabase.rpc("link_world_is_member");
      setMember(!check.error && check.data===true);
    });
    return()=>{alive=false;listener.subscription.unsubscribe();};
  }, [loadPublic]);

  useEffect(() => {
    if (!member) return;
    void loadPrivate().catch(err => setError(err?.message || "No se pudo leer el recorrido del negocio."));
  }, [member,loadPrivate]);

  const business = businesses.find(row => row.id === businessId) || null;

  useEffect(() => {
    if (!business) return;
    const q = new URLSearchParams(window.location.search);
    q.set("business",business.id);
    if (business.global_id) q.set("business_global",business.global_id);
    q.set("stage",stageKey);
    window.history.replaceState({},"","?" + q.toString());
  },[business,stageKey]);

  const businessJourneys = useMemo(
    () => journeys.filter(row => row.business_id === business?.id),
    [journeys,business?.id]
  );

  const stageRows = useMemo(() => CONCHA_STAGES.map(stage => {
    const journey = businessJourneys.find(row => row.stage_key === stage.key) || null;
    const scope = scopes.find(row => row.business_global_id === business?.global_id && row.stage_key === stage.key) || null;
    const mission = missions.find(row =>
      row.business_global_id === business?.global_id &&
      row.stage_key === stage.key &&
      !["verified","closed","cancelled"].includes(row.status)
    ) || null;
    return {
      ...stage,
      journey,
      scope,
      mission,
      state: scope?.state || mission?.status || journey?.mission_status || (journey ? "watching" : "empty"),
      current_focus: scope?.current_focus || mission?.title || journey?.mission_title || null
    };
  }),[businessJourneys,scopes,missions,business?.global_id]);

  const selected = stageRows.find(row => row.key === stageKey) || stageRows[0] || EMPTY_STAGE;
  const recognized = stageRows.filter(row => row.journey).length;
  const attention = stageRows.filter(row => /blocked|waiting_approval|awaiting_approval|retry/.test(String(row.state))).length;

  const context = contextFromBusiness(business,{
    stage:selected?.key,
    mission:selected?.mission?.mission_code || selected?.journey?.mission_code || null
  });

  async function login(event) {
    event.preventDefault();
    if (!supabase || !email || !password) return;
    setAuthBusy(true); setError("");
    const result = await supabase.auth.signInWithPassword({email,password});
    if (result.error) setError(result.error.message);
    setAuthBusy(false);
  }

  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  if (loading) return <main className={`gameLab theme-${theme}`}><div className="gameLoading">Sincronizando LINK WORLD GAME…</div></main>;

  return (
    <main className={`gameLab theme-${theme}`}>
      <header className="gameLabTop">
        <div className="gameLabBrand">
          <span>LINK</span>
          <b>WORLD GAME</b>
          <small>Estabilización de negocios</small>
        </div>

        <div className="gameLabContext">
          <select value={business?.id || ""} onChange={e=>setBusinessId(e.target.value || null)} aria-label="Negocio activo">
            {businesses.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
        </div>

        <div className="gameLabActions">
          <div className="gameTheme" role="group" aria-label="Apariencia">
            <button className={theme==="day"?"active":""} onClick={()=>setTheme("day")} title="Día">☀</button>
            <button className={theme==="gray"?"active":""} onClick={()=>setTheme("gray")} title="Gris">◐</button>
            <button className={theme==="night"?"active":""} onClick={()=>setTheme("night")} title="Noche">☾</button>
          </div>
          <a href={buildWorldUrl(context,"game")}>WORLD</a>
          <a href={buildControlUrl(context,"game")}>CONTROL</a>
          {member ? <button onClick={logout}>Salir</button> : null}
        </div>
      </header>

      {!member ? (
        <section className="gameAccess">
          <span>CAPA OPERATIVA</span>
          <h1>Entra para trabajar las seis etapas reales.</h1>
          <p>La ficha pública identifica la célula. Misiones, evidencia y estado de etapa sólo aparecen para miembros autorizados.</p>
          <form onSubmit={login}>
            <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" />
            <input type="password" placeholder="Contraseña" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" />
            <button type="submit" disabled={authBusy}>{authBusy ? "Entrando…" : "Entrar"}</button>
          </form>
          {error ? <div className="gameError">{error}</div> : null}
        </section>
      ) : (
        <section className="gameLabBody">
          <div className="gameBusinessHead">
            <div>
              <span>{business?.verification_status === "verified" ? "NEGOCIO COMPROBADO" : "CÉLULA EN DESARROLLO"}</span>
              <h1>{business?.name || "Selecciona un negocio"}</h1>
              <p>{business?.sector || "Sin sector registrado"}{business?.city ? ` · ${business.city}` : ""}</p>
            </div>
            <div className="gameBusinessScore">
              <b>{recognized}/6</b>
              <span>etapas reconocidas</span>
              {attention ? <small>{attention} requieren atención</small> : <small>sin bloqueos visibles</small>}
            </div>
          </div>

          <div className="gameJourney" aria-label="Concha del negocio">
            {stageRows.map((stage,index) => (
              <button key={stage.key} className={`${stage.key===selected.key?"selected":""} tone-${tone(stage.state)}`} onClick={()=>setStageKey(stage.key)}>
                <span>0{index+1}</span>
                <b>{stage.label}</b>
                <i />
              </button>
            ))}
          </div>

          <section className="gameStage">
            <div className="gameStageTitle">
              <span>ETAPA {String(stageRows.findIndex(row=>row.key===selected.key)+1).padStart(2,"0")}</span>
              <h2>{selected.label}</h2>
              <em className={`state tone-${tone(selected.state)}`}>{human(selected.state)}</em>
            </div>

            <div className="gameStageGrid">
              <article>
                <small>FOCO ACTUAL</small>
                <p>{selected.current_focus || "Sin foco operativo registrado."}</p>
              </article>
              <article>
                <small>RESULTADO ESPERADO</small>
                <p>{selected.mission?.expected_outcome || selected.journey?.expected_outcome || selected.journey?.customer_state_out || "Sin resultado persistido."}</p>
              </article>
              <article>
                <small>EVIDENCIA</small>
                <p>{selected.journey ? `${selected.journey.evidence_validated || 0} validada · ${selected.journey.evidence_requested || 0} solicitada` : "Sin recorrido canónico registrado."}</p>
              </article>
              <article>
                <small>RESPONSABLE</small>
                <p>{selected.journey?.director_name || selected.journey?.director_slug || selected.scope?.agent_slug || "Sin responsable registrado."}</p>
              </article>
            </div>

            <div className="gameStageFooter">
              <a className="primary" href={buildControlUrl(context,"game")}>Abrir gobierno de esta etapa →</a>
              <a href={buildWorldUrl(context,"game")}>Ver esta célula dentro de LINK →</a>
            </div>
          </section>

          {error ? <div className="gameError">{error}</div> : null}
        </section>
      )}
    </main>
  );
}
