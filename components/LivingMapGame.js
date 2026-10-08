"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const W = 1600;
const H = 900;
const CENTER = { x: 790, y: 438 };
const LINK_ID = { x: 278, y: 438 };

const STAGES = [
  { key:"marketing", label:"MAR", note:"escucha\nnecesidad", x:704, y:316 },
  { key:"ventas", label:"VENTA", note:"propuesta\noportunidad", x:874, y:316 },
  { key:"cierre", label:"CIERRE", note:"compromiso", x:956, y:438 },
  { key:"onboarding", label:"BOARDING", note:"preparación", x:874, y:560 },
  { key:"entrega", label:"OPERACIONES", note:"entrega", x:704, y:560 },
  { key:"postventa", label:"POSTVENTA", note:"aprendizaje", x:624, y:438 }
];

const GOVERNANCE = [
  ["director","DIRECTOR","coordinación\nmisiones / decisiones"],
  ["pulso","PULSO VIVO","observación\nestado en tiempo real"],
  ["hipocampo","HIPOCAMPO","memoria\ncontexto histórico"],
  ["cortex","CORTEX","interpretación\nanálisis / simulación"],
  ["show","LINK SHOW","interfaz\nvoz / visual"],
  ["administracion","ADMINISTRACIÓN","agentes / políticas\npermisos / seguridad"],
  ["conexiones","CONEXIONES","proveedores\nintegraciones"]
];

const INPUT_CAPS = [
  ["LINKRRSS","comunicaciones"],
  ["QR / LINK ID","identidad"],
  ["TRANSLATE","traducción"],
  ["WEBSITE","sitios de negocios"],
  ["PROVEEDORES","contactos"],
  ["EVENTOS","activaciones"],
  ["OTROS","canales"]
];

const CHANNELS = ["Instagram","WhatsApp","Website","QR físico","Mail","Teléfono","Referidos","Eventos","Proveedores","Otros"];

const ARTIFACTS = [
  ["AGENTIC CRM","crm comercial"],
  ["PROPUESTA","cotizaciones"],
  ["PAYMENTS","MP / Stripe / Global66"],
  ["HOTEL EXPERIENCE","reservas y experiencia"],
  ["TAXIHOTEL","traslados / operación"],
  ["LINK VOICE","voz + interfaz"],
  ["LINK MOBILE","app móvil"],
  ["LINK FACTORY","creación de artefactos"],
  ["DIGITAL WEB","sitios y contenido"],
  ["LINK CONTROL","software / CRM"],
  ["OTROS","herramientas"]
];

const TRANSVERSALS = [
  ["MAR","escucha"],["RRSS","comunicación"],["VENTAS","comercial"],["CIERRE","compromisos"],
  ["BOARDING","preparación"],["OPERACIONES","entrega"],["POSTVENTA","aprendizaje"],
  ["FIN","verdad económica"],["PERSONAS","identidad"],["EVIDENCIAS","prueba"],
  ["ARTEFACTOS","capacidades"],["EVOLUCIÓN","madurez"]
];

const REPRODUCTION = [
  ["EVIDENCIAS","registro"],["APRENDIZAJE","insights"],["GÉNESIS","de dolor a solución"],
  ["ARTEFACTOS","productos reutilizables"],["MODELOS","estandarización"],
  ["EVOLUCIÓN","madurez"],["MITOSIS / MEIOSIS","reproducción"]
];

const INFRA = [
  ["SUPABASE","estado vivo","▱"],
  ["GITHUB","código canónico","●"],
  ["VERCEL","publicación","▲"],
  ["CLOUDFLARE","runtime / edge","☁"]
];

function cap(value="") {
  return String(value).replace(/\s+/g," ").trim();
}

function shortBusiness(name="") {
  return cap(name).replace(/Travelers/i,"Travelers").replace(/Experience/i,"Experience");
}

function stageTone(state) {
  const v=String(state||"");
  if (/blocked|failed|error/.test(v)) return "blocked";
  if (/waiting|approval|retry/.test(v)) return "attention";
  if (/verified|completed|approved/.test(v)) return "verified";
  if (/active|working|processing|queued/.test(v)) return "active";
  return "neutral";
}

function Wire({ d, className="", active=false }) {
  return <path d={d} className={`mapWire ${className} ${active?"isActive":""}`} />;
}

function MovingPulse({ path, tone="orange", id }) {
  if (!path) return null;
  return (
    <g key={id} className={`movingPulse pulse-${tone}`}>
      <circle r="5">
        <animateMotion dur="1.35s" path={path} fill="freeze" calcMode="spline" keySplines=".22 .8 .2 1" />
        <animate attributeName="opacity" values="0;1;1;0" dur="1.35s" fill="freeze" />
      </circle>
    </g>
  );
}

export default function LivingMapGame(){
  const viewportRef=useRef(null);
  const timerRef=useRef(null);
  const [layout,setLayout]=useState({scale:1,portrait:false,w:W,h:H});
  const [theme,setTheme]=useState("day");
  const [businesses,setBusinesses]=useState([]);
  const [journeys,setJourneys]=useState([]);
  const [scopes,setScopes]=useState([]);
  const [member,setMember]=useState(false);
  const [selectedBusiness,setSelectedBusiness]=useState(null);
  const [selectedStage,setSelectedStage]=useState(null);
  const [activeGov,setActiveGov]=useState(null);
  const [activeArtifact,setActiveArtifact]=useState(null);
  const [activeTransversal,setActiveTransversal]=useState(null);
  const [activeRepro,setActiveRepro]=useState(null);
  const [pulse,setPulse]=useState(null);
  const [flight,setFlight]=useState(null);
  const [motion,setMotion]=useState(false);
  const [status,setStatus]=useState("Explora el organismo.");

  useEffect(()=>{
    try{
      const saved=window.localStorage.getItem("link-world-game-theme");
      if(["day","gray","night"].includes(saved)) setTheme(saved);
    }catch{}
  },[]);

  useEffect(()=>{
    try{window.localStorage.setItem("link-world-game-theme",theme);}catch{}
  },[theme]);

  useEffect(()=>{
    const resize=()=>{
      const w=window.innerWidth,h=window.innerHeight;
      const portrait=h>w && w<800;
      const scale=portrait ? h/H : Math.min(w/W,h/H);
      setLayout({scale,portrait,w:W*scale,h:H*scale});
    };
    resize();
    window.addEventListener("resize",resize);
    return()=>window.removeEventListener("resize",resize);
  },[]);

  const loadPublic=useCallback(async()=>{
    if(!supabase) return;
    const read=await supabase
      .from("link_world_businesses")
      .select("id,global_id,slug,name,sector,verification_status,public_workspace")
      .eq("public_workspace",true)
      .order("name");
    if(!read.error) setBusinesses(read.data||[]);
  },[]);

  const loadPrivate=useCallback(async()=>{
    if(!supabase || !member) return;
    const [j,s]=await Promise.all([
      supabase.from("link_business_agent_journey_v")
        .select("business_id,business_global_id,stage_number,stage_key,stage_name,mission_status,evidence_requested,evidence_validated")
        .order("business_name").order("stage_number"),
      supabase.from("agent_scope_state")
        .select("business_global_id,stage_key,state,current_focus,updated_at")
        .order("updated_at",{ascending:false})
    ]);
    if(!j.error) setJourneys(j.data||[]);
    if(!s.error) setScopes(s.data||[]);
  },[member]);

  useEffect(()=>{
    if(!supabase) return;
    void loadPublic();
    let alive=true;
    supabase.auth.getSession().then(async({data})=>{
      if(!alive || !data?.session) return;
      const check=await supabase.rpc("link_world_is_member");
      if(alive) setMember(!check.error && check.data===true);
    });
    const {data:listener}=supabase.auth.onAuthStateChange(async(_event,session)=>{
      if(!session){setMember(false);setJourneys([]);setScopes([]);return;}
      const check=await supabase.rpc("link_world_is_member");
      setMember(!check.error && check.data===true);
    });
    return()=>{alive=false;listener.subscription.unsubscribe();};
  },[loadPublic]);

  useEffect(()=>{ if(member) void loadPrivate(); },[member,loadPrivate]);

  useEffect(()=>{
    const initial=new URLSearchParams(window.location.search).get("business");
    if(!initial) return;
    const found=businesses.find(b=>b.id===initial);
    if(found) setSelectedBusiness(found);
  },[businesses]);

  const selectedStageState=useMemo(()=>{
    if(!selectedBusiness || !selectedStage) return "neutral";
    const scope=scopes.find(row=>row.business_global_id===selectedBusiness.global_id && row.stage_key===selectedStage);
    if(scope) return scope.state;
    const journey=journeys.find(row=>row.business_id===selectedBusiness.id && row.stage_key===selectedStage);
    return journey?.mission_status || "neutral";
  },[selectedBusiness,selectedStage,scopes,journeys]);

  const businessRows=useMemo(()=>businesses.slice(0,8),[businesses]);

  function clearFocus(){
    setSelectedStage(null);setActiveGov(null);setActiveArtifact(null);setActiveTransversal(null);setActiveRepro(null);
  }

  function triggerPulse(path,tone,label){
    setPulse({id:Date.now(),path,tone});
    setStatus(label);
    window.setTimeout(()=>setPulse(null),1450);
  }

  function chooseChannel(index,label){
    clearFocus();
    const y=392+index*18;
    const path=`M 60 ${y} C 145 ${y} 188 420 245 438 C 355 470 520 365 704 316`;
    triggerPulse(path,"orange",`${label} → LINK ID → MAR`);
    setSelectedStage("marketing");
  }

  function chooseGovernance(index,id,label){
    clearFocus();setActiveGov(id);
    const x=430+index*116;
    const path=`M ${x} 126 C ${x} 205 690 205 790 284`;
    triggerPulse(path,"violet",label);
  }

  function chooseArtifact(index,label){
    clearFocus();setActiveArtifact(index);
    const y=286+index*34;
    const path=`M 1115 ${y} C 1050 ${y} 1010 395 955 438`;
    triggerPulse(path,"blue",label);
  }

  function chooseStage(key,label){
    setSelectedStage(key);setActiveArtifact(null);setActiveGov(null);
    setStatus(selectedBusiness ? `${label} · ${selectedBusiness.name}` : label);
    const index=STAGES.findIndex(s=>s.key===key);
    const a=STAGES[index], b=STAGES[(index+1)%STAGES.length];
    triggerPulse(`M ${a.x} ${a.y} Q 790 438 ${b.x} ${b.y}`,"orange",selectedBusiness ? `${label} · ${selectedBusiness.name}` : label);
  }

  function chooseBusiness(row,index){
    if(motion) return;
    clearFocus();
    const source={x:1376,y:284+index*69};
    setFlight({name:row.name,fromX:source.x,fromY:source.y,toX:CENTER.x,toY:CENTER.y,direction:"in"});
    setMotion(true);
    setStatus(`${row.name} entra al núcleo`);
    window.clearTimeout(timerRef.current);
    timerRef.current=window.setTimeout(()=>{
      setSelectedBusiness(row);
      setFlight(null);setMotion(false);
      const q=new URLSearchParams(window.location.search);
      q.set("business",row.id);
      window.history.replaceState({},"","?"+q.toString());
      setStatus(`${row.name} · misma Concha, distinto contexto`);
    },900);
  }

  function leaveBusiness(){
    if(!selectedBusiness || motion) return;
    const index=Math.max(0,businessRows.findIndex(b=>b.id===selectedBusiness.id));
    const target={x:1376,y:284+index*69};
    setFlight({name:selectedBusiness.name,fromX:CENTER.x,fromY:CENTER.y,toX:target.x,toY:target.y,direction:"out"});
    setMotion(true);
    setStatus(`${selectedBusiness.name} vuelve a su lugar`);
    window.clearTimeout(timerRef.current);
    timerRef.current=window.setTimeout(()=>{
      setSelectedBusiness(null);setSelectedStage(null);setFlight(null);setMotion(false);
      const q=new URLSearchParams(window.location.search);q.delete("business");
      window.history.replaceState({},"",q.toString()?"?"+q.toString():"/");
      setStatus("CONCHA · 6 etapas · mismo organismo");
    },850);
  }

  function selectTransversal(index,label){
    clearFocus();setActiveTransversal(index);
    setStatus(label);
    triggerPulse(`M ${520+index*67} 706 C ${520+index*67} 660 760 625 790 596`,"violet",label);
  }

  function selectRepro(index,label){
    clearFocus();setActiveRepro(index);setStatus(label);
    triggerPulse(`M ${390+index*130} 790 C ${390+index*130} 740 705 726 790 705`,"violet",label);
  }

  const stageStatusByKey=useMemo(()=>{
    const out={};
    STAGES.forEach(stage=>{
      if(!selectedBusiness){out[stage.key]="neutral";return;}
      const scope=scopes.find(row=>row.business_global_id===selectedBusiness.global_id && row.stage_key===stage.key);
      const journey=journeys.find(row=>row.business_id===selectedBusiness.id && row.stage_key===stage.key);
      out[stage.key]=scope?.state || journey?.mission_status || "neutral";
    });
    return out;
  },[selectedBusiness,scopes,journeys]);

  return (
    <main className={`livingMapGame theme-${theme} ${layout.portrait?"portraitMap":""}`}>
      <div className="mapViewport" ref={viewportRef}>
        <div className="mapStageHolder" style={{width:layout.w,height:layout.h}}>
          <section className="mapStage" style={{transform:`scale(${layout.scale})`}} aria-label="LINK WORLD GAME · Mapa Maestro interactivo">
            <svg className="mapSvg" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
              <defs>
                <marker id="arrowOrange" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0,0 L6,3.5 L0,7 Z" className="arrowOrange"/></marker>
                <filter id="softGlow"><feGaussianBlur stdDeviation="5"/></filter>
              </defs>

              <path d="M330 198 C420 45 1165 45 1305 205" className="outerArc"/>
              <path d="M330 198 C300 255 275 320 278 366" className="outerArc warm"/>
              <path d="M1305 205 C1355 275 1358 650 1275 708" className="outerArc green"/>
              <path d="M280 500 C265 665 410 720 520 720" className="outerArc"/>
              <path d="M520 720 C720 720 1100 720 1275 708" className="outerArc"/>

              {GOVERNANCE.map((_,i)=>{
                const x=430+i*116;
                return <Wire key={"g"+i} d={`M ${x} 126 C ${x} 205 695 200 790 285`} className="govWire" active={activeGov===GOVERNANCE[i][0]}/>;
              })}

              {CHANNELS.map((_,i)=><Wire key={"c"+i} d={`M 58 ${392+i*18} C 145 ${392+i*18} 187 420 246 438`} className="entryWire"/>)}
              {INPUT_CAPS.map((_,i)=><Wire key={"i"+i} d={`M 394 ${316+i*38} C 510 ${316+i*38} 540 365 624 438`} className="entryCapWire"/>)}
              <Wire d="M 315 438 C 415 475 525 370 624 438" className="warmWire"/>

              <circle cx={CENTER.x} cy={CENTER.y} r="185" className="conchaHalo"/>
              <circle cx={CENTER.x} cy={CENTER.y} r="151" className="conchaOrbit"/>
              {STAGES.map((stage,i)=>{
                const next=STAGES[(i+1)%STAGES.length];
                return <path key={stage.key} d={`M ${stage.x} ${stage.y} Q ${CENTER.x} ${CENTER.y} ${next.x} ${next.y}`} className={`stageFlow ${selectedStage===stage.key?"active":""}`} markerEnd="url(#arrowOrange)"/>;
              })}

              {ARTIFACTS.map((_,i)=><Wire key={"a"+i} d={`M 956 438 C 1015 ${390+i*10} 1040 ${286+i*34} 1114 ${286+i*34}`} className="artifactWire" active={activeArtifact===i}/>)}
              {businessRows.map((_,i)=><Wire key={"b"+i} d={`M 1218 ${320+i*21} C 1295 ${320+i*21} 1308 ${284+i*69} 1354 ${284+i*69}`} className="businessWire"/>)}

              {TRANSVERSALS.map((_,i)=><Wire key={"t"+i} d={`M ${520+i*67} 706 C ${520+i*67} 660 760 625 790 596`} className="transWire" active={activeTransversal===i}/>)}
              {REPRODUCTION.map((_,i)=><Wire key={"r"+i} d={`M ${390+i*130} 790 C ${390+i*130} 745 705 726 790 705`} className="reproWire" active={activeRepro===i}/>)}

              {pulse ? <MovingPulse {...pulse}/> : null}
            </svg>

            <header className="mapIdentity">
              <small>LINK WORLD</small>
              <h1>LINK<span>·</span></h1>
              <h2>MAPA MAESTRO</h2>
              <h3>LA CONCHA ETERNA</h3>
              <i/>
              <p>Un solo organismo.<br/>Células que operan,<br/>artefactos que se comparten,<br/>inteligencia que aprende<br/>y se reproduce.</p>
            </header>

            <section className="governance">
              <h4>GOBIERNO E INTELIGENCIA</h4>
              <div className="govNodes">
                {GOVERNANCE.map(([id,label,note],i)=>(
                  <button key={id} className={activeGov===id?"active":""} onClick={()=>chooseGovernance(i,id,label)}>
                    <i/><b>{label}</b><small>{note.split("\n").map((line,j)=><span key={j}>{line}</span>)}</small>
                  </button>
                ))}
              </div>
              <p>VISIÓN · DECISIONES · CONTEXTO · EVENTOS</p>
            </section>

            <section className="worldReal">
              <h4>MUNDO REAL</h4>
              <p>personas<br/>proveedores<br/>canales<br/>señales</p>
              <div className="channelList">
                {CHANNELS.map((label,i)=><button key={label} onClick={()=>chooseChannel(i,label)}><i/>{label}</button>)}
              </div>
            </section>

            <button className="linkIdNode" onClick={()=>{clearFocus();setStatus("LINK ID · registro de ingresos");}}>
              <b>LINK ID</b><small>registro de ingresos</small>
            </button>

            <section className="inputCaps">
              <h4>CAPACIDADES DE ENTRADA</h4>
              {INPUT_CAPS.map(([label,note],i)=>(
                <button key={label} onClick={()=>chooseChannel(Math.min(i,CHANNELS.length-1),label)}>
                  <i/><span><b>{label}</b><small>{note}</small></span>
                </button>
              ))}
            </section>

            <section className="cellTitle">
              <h4>CÉLULA / NEGOCIO</h4>
              <p>misma lógica en todas las células</p>
            </section>

            <div className="stageRing">
              {STAGES.map((stage,i)=>{
                const tone=stageTone(stageStatusByKey[stage.key]);
                return (
                  <button key={stage.key} className={`stageNode stage-${i} ${selectedStage===stage.key?"active":""} tone-${tone}`} style={{left:stage.x,top:stage.y}} onClick={()=>chooseStage(stage.key,stage.label)}>
                    <i/><b>{stage.label}</b><small>{stage.note.split("\n").map((line,j)=><span key={j}>{line}</span>)}</small>
                  </button>
                );
              })}
            </div>

            <button className={`conchaCore ${selectedBusiness?"businessCore":""} ${motion?"inMotion":""}`} style={{left:CENTER.x,top:CENTER.y}} onClick={selectedBusiness?leaveBusiness:()=>setStatus("CONCHA · 6 etapas · misma información · distinto contexto")}>
              <b>{selectedBusiness ? shortBusiness(selectedBusiness.name) : "CONCHA"}</b>
              <small>{selectedBusiness ? "CÉLULA / NEGOCIO" : <>6 ETAPAS<br/>MISMA INFORMACIÓN<br/>DISTINTO CONTEXTO</>}</small>
              {selectedStage && selectedBusiness ? <em>{STAGES.find(s=>s.key===selectedStage)?.label} · {stageTone(selectedStageState)}</em> : null}
            </button>

            {flight ? (
              <div className={`flyingCell ${flight.direction}`} style={{
                "--fx":flight.fromX+"px","--fy":flight.fromY+"px","--tx":flight.toX+"px","--ty":flight.toY+"px"
              }}>
                <b>{shortBusiness(flight.name)}</b>
              </div>
            ):null}

            <section className="artifacts">
              <h4>ARTEFACTOS</h4>
              {ARTIFACTS.map(([label,note],i)=>(
                <button key={label} className={activeArtifact===i?"active":""} onClick={()=>chooseArtifact(i,label)}>
                  <i/><span><b>{label}</b><small>{note}</small></span>
                </button>
              ))}
            </section>

            <section className="businesses">
              <h4>CÉLULAS / NEGOCIOS</h4>
              {businessRows.map((row,i)=>(
                <button key={row.id} className={selectedBusiness?.id===row.id?"selected":""} onClick={()=>chooseBusiness(row,i)}>
                  <i/><span><b>{row.name}</b><small>{row.sector || "CÉLULA / NEGOCIO"}</small></span>
                </button>
              ))}
              <button className="newCell" onClick={()=>setStatus("Nuevas células nacen desde evidencia, aprendizaje y reproducción.")}><i/><span><b>…</b><small>nuevas células</small></span></button>
            </section>

            <section className="transversals">
              <h4>CAPACIDADES TRANSVERSALES</h4>
              <div>
                {TRANSVERSALS.map(([label,note],i)=>(
                  <button key={label} className={activeTransversal===i?"active":""} onClick={()=>selectTransversal(i,label)}>
                    <i/><b>{label}</b><small>{note}</small>
                  </button>
                ))}
              </div>
            </section>

            <section className="reproduction">
              <h4>REPRODUCCIÓN</h4>
              <div>
                {REPRODUCTION.map(([label,note],i)=>(
                  <button key={label} className={activeRepro===i?"active":""} onClick={()=>selectRepro(i,label)}>
                    <i/><b>{label}</b><small>{note}</small>
                  </button>
                ))}
              </div>
              <p>CADA APRENDIZAJE PUEDE SER UNA NUEVA CÉLULA</p>
            </section>

            <section className="infrastructure">
              <div className="infraIntro"><b>INFRAESTRUCTURA TÉCNICA</b><small>sostiene el organismo.<br/>no es una etapa del negocio.</small></div>
              <div className="infraNodes">
                {INFRA.map(([label,note,icon])=><button key={label} onClick={()=>setStatus(`${label} · ${note}`)}><em>{icon}</em><span><b>{label}</b><small>{note}</small></span></button>)}
              </div>
            </section>

            <aside className="mapLegend">
              <span><i className="orange"/>FLUJO CONCHA</span>
              <span><i className="blue"/>ARTEFACTOS</span>
              <span><i className="green"/>NEGOCIOS / CÉLULAS</span>
              <span><i className="violet"/>TRANSVERSALES / INTELIGENCIA</span>
              <span><i className="gray"/>INFRAESTRUCTURA</span>
            </aside>

            <aside className="mapMode">
              <button className={theme==="day"?"active":""} onClick={()=>setTheme("day")} title="Día">☀</button>
              <button className={theme==="gray"?"active":""} onClick={()=>setTheme("gray")} title="Gris">◐</button>
              <button className={theme==="night"?"active":""} onClick={()=>setTheme("night")} title="Noche">☾</button>
            </aside>

            <div className="interactionStatus" aria-live="polite"><i/>{status}</div>
          </section>
        </div>
      </div>
      {layout.portrait ? <div className="horizontalHint">desliza horizontalmente para recorrer LINK</div> : null}
    </main>
  );
}
