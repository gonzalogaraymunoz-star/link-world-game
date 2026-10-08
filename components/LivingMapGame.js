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
  ["LINKRRSS","primer artefacto MAR"],
  ["QR","canal físico → LINK ID"],
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
  ["LINK KARAOKE","karaoke · cola / DJ / identidad"],
  ["LINKRRSS","Instagram / Zernio / comunicación"],
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

const LINK_WORLD_BASE = "https://link-world-9h0.pages.dev";
const CARACOL_ID = "31333b84-79fa-4c52-b974-977145ec9e9a";
const CARACOL_GLOBAL_ID = "LNK-BIZ-8940CF9AD521445D";

const STAGE_DIMENSIONS = {
  marketing:"marketing",
  ventas:"ventas",
  cierre:"cierre",
  onboarding:"onboarding",
  entrega:"entrega",
  postventa:"postventa"
};

const TRANSVERSAL_DIMENSIONS = {
  MAR:"marketing", RRSS:"rrss", VENTAS:"ventas", CIERRE:"cierre",
  BOARDING:"onboarding", OPERACIONES:"entrega", POSTVENTA:"postventa",
  FIN:"fin", PERSONAS:"personas", EVIDENCIAS:"evidencias",
  ARTEFACTOS:"artefactos", EVOLUCIÓN:"evolucion"
};

const REPRO_DIMENSIONS = {
  EVIDENCIAS:"evidencias", APRENDIZAJE:"evolucion", GÉNESIS:"genesis",
  ARTEFACTOS:"artefactos", MODELOS:"modelos", EVOLUCIÓN:"evolucion",
  "MITOSIS / MEIOSIS":"reproduccion"
};

const BUSINESS_PROFILES = {
  caracol: {
    label: "CARACOL",
    rule: "2 modelos activos · una identidad común",
    channels: ["Instagram"],
    inputCaps: ["LINKRRSS","QR"],
    models: [
      {
        key: "marketing",
        name: "MARKETING",
        modelId: "97f17cef-c53d-4858-b354-c56e20dcd15b",
        dimension: "marketing",
        maturity: "evidenced",
        note: "Instagram → Zernio → LINKRRSS → LINK ID → MAR",
        detail: "Servicio mensual de Contenido / RRSS. Caracol es la célula de origen.",
        nextGate: "Demostrar un segundo ciclo pagado o instalar el mismo modelo en un segundo cliente."
      },
      {
        key: "karaoke",
        name: "KARAOKE",
        modelId: "5c08f32e-25c5-421d-91aa-9d5f2fc508cf",
        dimension: "entrega",
        maturity: "productizable",
        note: "LINK Karaoke · lunes / miércoles / viernes",
        detail: "Servicio recurrente por sesión. LINK Karaoke conserva identidad, canción, cola e historial.",
        nextGate: "Empaquetar la oferta para un segundo local y comprobar adquisición, precio y operación fuera de Caracol."
      }
    ],
    artifacts: ["LINK KARAOKE","LINKRRSS"],
    transversals: ["MAR","RRSS","VENTAS","CIERRE","BOARDING","OPERACIONES","POSTVENTA","FIN","PERSONAS","EVIDENCIAS","ARTEFACTOS","EVOLUCIÓN"],
    stageState: {
      marketing: "active",
      ventas: "active",
      cierre: "active",
      onboarding: "active",
      entrega: "verified",
      postventa: "active"
    },
    infrastructure: {
      github: [
        { label:"LINKRRSS", href:"https://github.com/gonzalogaraymunoz-star/linkrrss" },
        { label:"LINK WORLD / GAME", href:"https://github.com/gonzalogaraymunoz-star/link-world-game" }
      ],
      vercel: [
        
      ],
      cloudflare: [
        { label:"LINK WORLD GAME", href:"https://link-world-game.pages.dev" },
        { label:"LINKRRSS", href:"https://linkrrss.gonzalogaraymunoz.workers.dev" },
        { label:"LINK WORLD", href:"https://link-world-9h0.pages.dev" }
      ]
    },
    reproduction: {
      "EVIDENCIAS":"La célula ya conserva evidencia operativa y económica; la verificación sigue perteneciendo a FIN/Evidencias.",
      "APRENDIZAJE":"Marketing y Karaoke devuelven señales a la misma memoria de Caracol sin duplicar Personas.",
      "GÉNESIS":"Los dolores repetidos pueden convertirse en mejoras de LINKRRSS, LINK Karaoke o nuevos artefactos.",
      "ARTEFACTOS":"Artefactos comprobados en Caracol pueden reutilizarse en otras células conservando trazabilidad.",
      "MODELOS":"Marketing Caracol está evidenciado; Karaoke Caracol está productizable. Son modelos distintos dentro del mismo contexto cliente.",
      "EVOLUCIÓN":"Caracol avanza por evidencia real; una capacidad no cambia de madurez sólo porque exista en la interfaz.",
      "MITOSIS / MEIOSIS":"No se declara una réplica nueva sin evidencia. Karaoke tiene gate explícito para probarse en un segundo local."
    },
    evidence: "Lo comprobado se muestra; lo propuesto se mantiene como pendiente. GAME no fabrica evidencia.",
    next: "Cerrar cada etapa con estado, misión y evidencia real."
  }
};

function businessProfile(row){
  const name=String(row?.name||"").toLowerCase();
  if(name.includes("caracol")) return BUSINESS_PROFILES.caracol;
  return null;
}

function cap(value="") {
  return String(value).replace(/\s+/g," ").trim();
}

function shortBusiness(name="") {
  return cap(name).replace(/Travelers/i,"Travelers").replace(/Experience/i,"Experience");
}

function worldUrl(business, dimension="concha", modelId=null) {
  const q = new URLSearchParams();
  q.set("dimension", dimension);
  if (business?.id) q.set("business", business.id);
  if (modelId) q.set("model", modelId);
  return LINK_WORLD_BASE + "/?" + q.toString();
}

function rrssUrl(business, section="home") {
  const q = new URLSearchParams();
  if (business?.slug || business?.id) q.set("business", business.slug || business.id);
  q.set("section", section);
  q.set("dimension", "rrss");
  q.set("from", "game");
  return "https://linkrrss.gonzalogaraymunoz.workers.dev/?" + q.toString();
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
  const [missions,setMissions]=useState([]);
  const [cellArtifacts,setCellArtifacts]=useState([]);
  const [linkIds,setLinkIds]=useState([]);
  const [member,setMember]=useState(false);
  const [experiment,setExperiment]=useState(null);
  const [inspector,setInspector]=useState(null);
  const [lensFolded,setLensFolded]=useState(false);
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
      const q=new URLSearchParams(window.location.search);
      setExperiment(q.get("experiment"));
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
    const [j,s,m,a,l]=await Promise.all([
      supabase.from("link_business_agent_journey_v")
        .select("business_id,business_global_id,stage_number,stage_key,stage_name,mission_status,evidence_requested,evidence_validated")
        .order("business_name").order("stage_number"),
      supabase.from("agent_scope_state")
        .select("business_global_id,stage_key,state,current_focus,updated_at")
        .order("updated_at",{ascending:false}),
      supabase.from("agent_missions")
        .select("id,mission_code,business_global_id,stage_key,title,status,priority,metadata,updated_at")
        .order("updated_at",{ascending:false}),
      supabase.from("link_dot_artifacts")
        .select("id,business_id,artifact_key,name,description,artifact_type,route,status,source_system,source_table,updated_at")
        .order("updated_at",{ascending:false}),
      supabase.from("link_lead_identities")
        .select("id,business_id,status,universal_code,created_at")
        .order("created_at",{ascending:false})
    ]);
    if(!j.error) setJourneys(j.data||[]);
    if(!s.error) setScopes(s.data||[]);
    if(!m.error) setMissions(m.data||[]);
    if(!a.error) setCellArtifacts(a.data||[]);
    if(!l.error) setLinkIds(l.data||[]);
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
      if(!session){setMember(false);setJourneys([]);setScopes([]);setMissions([]);setCellArtifacts([]);setLinkIds([]);return;}
      const check=await supabase.rpc("link_world_is_member");
      setMember(!check.error && check.data===true);
    });
    return()=>{alive=false;listener.subscription.unsubscribe();};
  },[loadPublic]);

  useEffect(()=>{ if(member) void loadPrivate(); },[member,loadPrivate]);

  useEffect(()=>{
    const q=new URLSearchParams(window.location.search);
    const initial=q.get("business") || (q.get("experiment")==="caracol" ? "caracol" : null);
    if(!initial) return;
    const token=String(initial).toLowerCase();
    const found=businesses.find(b=>b.id===initial || b.global_id===initial || String(b.slug||"").toLowerCase()===token || String(b.name||"").toLowerCase()===token);
    if(found) setSelectedBusiness(found);
  },[businesses]);

  const selectedStageState=useMemo(()=>{
    if(!selectedBusiness || !selectedStage) return "neutral";
    const scope=scopes.find(row=>row.business_global_id===selectedBusiness.global_id && row.stage_key===selectedStage);
    if(scope) return scope.state;
    const journey=journeys.find(row=>row.business_id===selectedBusiness.id && row.stage_key===selectedStage);
    return journey?.mission_status || "neutral";
  },[selectedBusiness,selectedStage,scopes,journeys]);

  const businessRows=useMemo(()=>{
    if(experiment==="caracol") return businesses.filter(b=>String(b.slug||b.name||"").toLowerCase().includes("caracol"));
    return businesses.slice(0,8);
  },[businesses,experiment]);
  const selectedProfile=useMemo(()=>businessProfile(selectedBusiness),[selectedBusiness]);
  const businessMissions=useMemo(()=>selectedBusiness ? missions.filter(row=>row.business_global_id===selectedBusiness.global_id) : [],[missions,selectedBusiness]);
  const businessArtifacts=useMemo(()=>selectedBusiness ? cellArtifacts.filter(row=>row.business_id===selectedBusiness.id) : [],[cellArtifacts,selectedBusiness]);
  const businessLinkIds=useMemo(()=>selectedBusiness ? linkIds.filter(row=>row.business_id===selectedBusiness.id) : [],[linkIds,selectedBusiness]);
  const visibleArtifacts=useMemo(()=>selectedProfile ? ARTIFACTS.filter(([label])=>selectedProfile.artifacts.includes(label)) : ARTIFACTS,[selectedProfile]);
  const visibleInputCaps=useMemo(()=>selectedProfile ? INPUT_CAPS.filter(([label])=>selectedProfile.inputCaps.includes(label)) : INPUT_CAPS,[selectedProfile]);
  const visibleChannels=useMemo(()=>selectedProfile ? CHANNELS.filter(label=>selectedProfile.channels.includes(label)) : CHANNELS,[selectedProfile]);

  function clearFocus(){
    setSelectedStage(null);setActiveGov(null);setActiveArtifact(null);setActiveTransversal(null);setActiveRepro(null);setInspector(null);
  }

  function openLens(kind, payload={}){
    if(!selectedBusiness){
      setStatus("Selecciona primero una célula para ver cómo esta área la refleja.");
      return;
    }
    const profile=selectedProfile;
    const title=payload.title || payload.label || selectedBusiness.name;
    const base={kind,title,kicker:payload.kicker||selectedBusiness.name,summary:payload.summary||"",items:payload.items||[],dimension:payload.dimension||"concha",modelId:payload.modelId||null,links:payload.links||[]};
    setLensFolded(false);
    setInspector(base);
  }

  function openLinkId(){
    if(!selectedBusiness){setStatus("Selecciona una célula para ver su LINK ID.");return;}
    const count=businessLinkIds.filter(row=>row.status==="active").length;
    openLens("linkid",{
      kicker:"LINK ID · "+selectedBusiness.name,
      title:"Identidad común de la célula",
      summary:"Marketing y Karaoke pueden originar contactos distintos, pero LINK conserva una sola capa relacional de Personas/Identidad.",
      items: member ? [
        count+" LINK ID activos vinculados a "+selectedBusiness.name,
        "Cada identidad conserva su origen y puede relacionarse con distintos modelos sin duplicar a la persona."
      ] : [
        "La cantidad real de identidades se muestra al entrar como Miembro LINK.",
        "La arquitectura mantiene una sola identidad y conserva el origen de cada señal."
      ],
      dimension:"personas"
    });
  }

  function openModel(model){
    const rows=model.key==="marketing"
      ? businessMissions.filter(row=>["marketing","transversal"].includes(row.stage_key))
      : [];
    openLens("model",{
      kicker:selectedBusiness.name+" · MODELO",
      title:model.name,
      summary:model.detail,
      items:[
        "Madurez: "+model.maturity,
        ...(rows.length ? rows.slice(0,4).map(row=>row.status+" · "+row.title) : ["Sin misión específica persistida para este modelo en GAME."]),
        "Siguiente gate: "+model.nextGate
      ],
      dimension:model.dimension,
      modelId:model.modelId
    });
  }

  function openInputCapability(label,note){
    if(!selectedBusiness){setStatus("Selecciona una célula para contextualizar esta capacidad.");return;}
    openLens(label==="LINKRRSS"?"rrss":"input",{
      kicker:selectedBusiness.name+" · CAPACIDAD DE ENTRADA",
      title:label,
      summary:note,
      items:[
        label==="LINKRRSS" ? "Instagram → Zernio → LINKRRSS → LINK ID → MAR → ciclo, conservando el contexto." : "",
        label==="QR" ? "El QR registra una señal; LINK ID identifica antes de derivarla a MAR, sin duplicar personas." : "",
        label==="EVENTOS" ? "Las activaciones presenciales pueden entrar como señales y conservar origen." : ""
      ].filter(Boolean),
      dimension:label==="LINKRRSS"?"rrss":label==="QR"?"personas":"marketing",
      links:label==="LINKRRSS"?[{label:"Abrir LINK RRSS · "+selectedBusiness.name,href:rrssUrl(selectedBusiness,"home")}]:[]
    });
  }

  function openInfrastructure(label,note){
    if(!selectedBusiness){setStatus("Selecciona una célula para ver su infraestructura.");return;}
    const key=String(label).toLowerCase();
    const links=selectedProfile?.infrastructure?.[key] || [];
    openLens("infra",{
      kicker:selectedBusiness.name+" · INFRAESTRUCTURA",
      title:label,
      summary:note+" · muestra únicamente los destinos conocidos para la célula activa.",
      items: links.length ? links.map(item=>item.label) : ["No hay un destino específico verificado para "+label+" en esta célula."],
      dimension:"concha",
      links
    });
  }

  function triggerPulse(path,tone,label){
    setPulse({id:Date.now(),path,tone});
    setStatus(label);
    window.setTimeout(()=>setPulse(null),1450);
  }

  function chooseChannel(index,label){
    setSelectedStage(null);setActiveGov(null);setActiveArtifact(null);setActiveTransversal(null);setActiveRepro(null);
    const y=392+index*18;
    const path=`M 60 ${y} C 145 ${y} 188 420 245 438 C 355 470 520 365 704 316`;
    triggerPulse(path,"orange",`${label} → LINK ID → MAR`);
    setSelectedStage("marketing");
    if(selectedBusiness && label==="Instagram"){
      window.location.href=rrssUrl(selectedBusiness,"connections");
      return;
    }
    openLens("input",{
      kicker:selectedBusiness ? selectedBusiness.name+" · MUNDO REAL" : "MUNDO REAL",
      title:label,
      summary:selectedBusiness ? label+" es una entrada observada para "+selectedBusiness.name+" en este contexto." : "Selecciona una célula para contextualizar esta entrada.",
      dimension:"marketing"
    });
  }

  function chooseGovernance(index,id,label){
    setSelectedStage(null);setActiveArtifact(null);setActiveTransversal(null);setActiveRepro(null);setActiveGov(id);
    const x=430+index*116;
    const path=`M ${x} 126 C ${x} 205 690 205 790 284`;
    triggerPulse(path,"violet",label);
    const rows=businessMissions.filter(row=>row.status!=="verified");
    openLens("governance",{
      kicker:selectedBusiness ? selectedBusiness.name+" · GOBIERNO" : "GOBIERNO",
      title:label,
      summary:selectedBusiness ? label+" observa o coordina el contexto de "+selectedBusiness.name+"; no reemplaza la dimensión que ejecuta." : "",
      items:id==="pulso" ? rows.slice(0,4).map(row=>row.status+" · "+row.title) : [],
      dimension:id==="pulso"?"pulso":id==="director"?"director":"concha"
    });
  }

  function chooseArtifact(index,label){
    setSelectedStage(null);setActiveGov(null);setActiveTransversal(null);setActiveRepro(null);setActiveArtifact(index);
    const y=286+index*34;
    const path=`M 1115 ${y} C 1050 ${y} 1010 395 955 438`;
    triggerPulse(path,"blue",label);
    if(selectedBusiness && label==="LINKRRSS"){
      window.location.href=rrssUrl(selectedBusiness,"home");
      return;
    }
    const persisted=businessArtifacts.filter(row=>String(row.name||"").toUpperCase().includes(label.replace("LINKRRSS","LINK")));
    openLens("artifact",{
      kicker:selectedBusiness ? selectedBusiness.name+" · ARTEFACTO" : "ARTEFACTO",
      title:label,
      summary:persisted[0]?.description || "Capacidad reutilizable activada para la célula.",
      items:persisted.length ? persisted.slice(0,4).map(row=>row.status+" · "+row.name) : ["Relacionado a "+selectedBusiness?.name+" por su modelo activo."],
      dimension:"artefactos"
    });
  }

  function chooseStage(key,label){
    setSelectedStage(key);setActiveArtifact(null);setActiveGov(null);setActiveTransversal(null);setActiveRepro(null);
    setStatus(selectedBusiness ? `${label} · ${selectedBusiness.name}` : label);
    const index=STAGES.findIndex(s=>s.key===key);
    const a=STAGES[index], b=STAGES[(index+1)%STAGES.length];
    triggerPulse(`M ${a.x} ${a.y} A 151 151 0 0 1 ${b.x} ${b.y}`,"orange",selectedBusiness ? `${label} · ${selectedBusiness.name}` : label);
    const rows=businessMissions.filter(row=>row.stage_key===key);
    openLens("stage",{
      kicker:selectedBusiness ? selectedBusiness.name+" · CONCHA" : "CONCHA",
      title:label,
      summary:selectedBusiness ? "Mesa de "+label+" filtrada por "+selectedBusiness.name+"." : "",
      items:rows.length ? rows.slice(0,5).map(row=>row.status+" · "+row.title) : ["Sin misión persistida para esta etapa."],
      dimension:STAGE_DIMENSIONS[key]||"concha"
    });
  }

  function chooseBusiness(row,index){
    if(motion) return;
    if(selectedBusiness?.id===row.id){ leaveBusiness(); return; }
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
      q.set("business",row.slug || row.id);
      window.history.replaceState({},"","?"+q.toString());
      const profile=businessProfile(row);
      setStatus(profile ? `${row.name} · ${profile.rule}` : `${row.name} · misma Concha, distinto contexto`);
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
    setSelectedStage(null);setActiveGov(null);setActiveArtifact(null);setActiveRepro(null);setActiveTransversal(index);
    setStatus(label);
    triggerPulse(`M ${520+index*67} 706 C ${520+index*67} 660 760 625 790 596`,"violet",label);
    const dimension=TRANSVERSAL_DIMENSIONS[label]||"concha";
    let items=[];
    if(label==="ARTEFACTOS") items=businessArtifacts.length ? businessArtifacts.slice(0,6).map(row=>row.status+" · "+row.name) : (selectedProfile?.artifacts||[]);
    if(label==="EVOLUCIÓN") items=[selectedProfile?.reproduction?.EVOLUCIÓN].filter(Boolean);
    if(label==="EVIDENCIAS") items=[selectedProfile?.evidence].filter(Boolean);
    openLens("transversal",{
      kicker:selectedBusiness ? selectedBusiness.name+" · CAPACIDAD TRANSVERSAL" : "CAPACIDAD TRANSVERSAL",
      title:label,
      summary:selectedBusiness ? "Misma capacidad de LINK, filtrada por "+selectedBusiness.name+"; no es una copia." : "",
      items,
      dimension
    });
  }

  function selectRepro(index,label){
    setSelectedStage(null);setActiveGov(null);setActiveArtifact(null);setActiveTransversal(null);setActiveRepro(index);setStatus(label);
    triggerPulse(`M ${390+index*130} 790 C ${390+index*130} 740 705 726 790 705`,"violet",label);
    openLens("reproduction",{
      kicker:selectedBusiness ? selectedBusiness.name+" · REPRODUCCIÓN" : "REPRODUCCIÓN",
      title:label,
      summary:selectedProfile?.reproduction?.[label] || "Esta capacidad sólo cambia cuando existe evidencia suficiente.",
      items:label==="MODELOS" ? selectedProfile?.models?.map(model=>model.name+" · "+model.maturity) || [] : [],
      dimension:REPRO_DIMENSIONS[label]||"reproduccion"
    });
  }

  const stageStatusByKey=useMemo(()=>{
    const out={};
    STAGES.forEach(stage=>{
      if(!selectedBusiness){out[stage.key]="neutral";return;}
      const scope=scopes.find(row=>row.business_global_id===selectedBusiness.global_id && row.stage_key===stage.key);
      const journey=journeys.find(row=>row.business_id===selectedBusiness.id && row.stage_key===stage.key);
      out[stage.key]=scope?.state || journey?.mission_status || selectedProfile?.stageState?.[stage.key] || "neutral";
    });
    return out;
  },[selectedBusiness,scopes,journeys,selectedProfile]);

  return (
    <main className={`livingMapGame theme-${theme} ${layout.portrait?"portraitMap":""} ${experiment==="caracol"?"experiment-caracol":""}`}>
      <div className="mapViewport" ref={viewportRef}>
        <div className="mapStageHolder" style={{width:layout.w,height:layout.h}}>
          <section className={`mapStage ${selectedBusiness?"cellEngaged":""} ${motion?"cellMoving":""} ${inspector?`lens-${inspector.kind}`:""}`} style={{transform:`scale(${layout.scale})`}} aria-label="LINK WORLD GAME · Mapa Maestro interactivo">
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

              {visibleChannels.map((_,i)=><Wire key={"c"+i} d={`M 58 ${392+i*18} C 145 ${392+i*18} 187 420 246 438`} className="entryWire"/>)}
              {visibleInputCaps.map((_,i)=><Wire key={"i"+i} d={`M 394 ${316+i*38} C 510 ${316+i*38} 540 365 624 438`} className="entryCapWire"/>)}
              <Wire d="M 315 438 C 415 475 525 370 624 438" className="warmWire"/>

              <circle cx={CENTER.x} cy={CENTER.y} r="185" className="conchaHalo"/>
              <circle cx={CENTER.x} cy={CENTER.y} r="151" className="conchaOrbit"/>
              {STAGES.map((stage,i)=>{
                const next=STAGES[(i+1)%STAGES.length];
                return <path key={stage.key} d={`M ${stage.x} ${stage.y} A 151 151 0 0 1 ${next.x} ${next.y}`} className={`stageFlow ${selectedStage===stage.key?"active":""}`} markerEnd="url(#arrowOrange)"/>;
              })}

              {visibleArtifacts.map((_,i)=><Wire key={"a"+i} d={`M 956 438 C 1015 ${390+i*10} 1040 ${286+i*34} 1114 ${286+i*34}`} className="artifactWire" active={activeArtifact===i}/>)}
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

            <section className="governance reactiveZone">
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

            <section className="worldReal reactiveZone">
              <h4>MUNDO REAL</h4>
              <p>personas<br/>proveedores<br/>canales<br/>señales</p>
              <div className="channelList">
                {visibleChannels.map((label,i)=><button key={label} onClick={()=>chooseChannel(i,label)}><i/>{label}</button>)}
              </div>
            </section>

            <button className={`linkIdNode ${inspector?.kind==="linkid"?"active":""}`} onClick={()=>{setSelectedStage(null);setActiveGov(null);setActiveArtifact(null);setActiveTransversal(null);setActiveRepro(null);setStatus("LINK ID · "+(selectedBusiness?.name||"registro de ingresos"));openLinkId();}}>
              <b>LINK ID</b><small>registro de ingresos</small>
            </button>

            <section className="inputCaps reactiveZone">
              <h4>CAPACIDADES DE ENTRADA</h4>
              {visibleInputCaps.map(([label,note],i)=>(
                <button key={label} onClick={()=>{setSelectedStage(null);setActiveGov(null);setActiveArtifact(null);setActiveTransversal(null);setActiveRepro(null);openInputCapability(label,note);setStatus(label+" · "+(selectedBusiness?.name||"LINK"));}}>
                  <i/><span><b>{label}</b><small>{note}</small></span>
                </button>
              ))}
            </section>

            <section className="cellTitle reactiveZone">
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

            </button>

            {selectedProfile ? (
              <aside aria-label="Contexto activo de Caracol" style={{
                position:"absolute",left:580,top:603,width:420,zIndex:8,
                border:"1px solid var(--line)",borderRadius:14,
                background:"color-mix(in srgb,var(--paper2) 92%,transparent)",
                boxShadow:"0 14px 34px var(--shadow)",padding:"10px 12px",
                display:"grid",gridTemplateColumns:"1fr 1fr",gap:8
              }}>
                <div style={{gridColumn:"1 / -1",display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:10}}>
                  <b style={{fontSize:8,letterSpacing:".12em"}}>{selectedProfile.label} · MODELOS ACTIVOS</b>
                  <small style={{fontSize:6,color:"var(--muted)"}}>{selectedProfile.rule}</small>
                </div>
                {selectedProfile.models.map(model=>(
                  <button key={model.name} onClick={()=>{setStatus(`${model.name} · ${model.note}`);window.location.href=worldUrl(selectedBusiness,model.dimension,model.modelId);}} style={{
                    border:"1px solid var(--line)",borderRadius:10,background:"transparent",color:"var(--ink)",
                    padding:"8px 9px",textAlign:"left",cursor:"pointer",minHeight:54
                  }}>
                    <b style={{display:"block",fontSize:7,letterSpacing:".08em"}}>{model.name}</b>
                    <small style={{display:"block",fontSize:6,color:"var(--green)",marginTop:3}}>{model.note}</small>
                    <span style={{display:"block",fontSize:5.5,lineHeight:1.35,color:"var(--muted)",marginTop:4}}>{model.detail}</span>
                  </button>
                ))}
                <div style={{gridColumn:"1 / -1",display:"flex",justifyContent:"space-between",gap:12,fontSize:5.5,color:"var(--muted)"}}>
                  <span>{selectedProfile.evidence}</span>
                  <span style={{whiteSpace:"nowrap"}}>faltantes → pendiente</span>
                </div>
              </aside>
            ) : null}

            {flight ? (
              <div className={`flyingCell ${flight.direction}`} style={{
                "--fx":flight.fromX+"px","--fy":flight.fromY+"px","--tx":flight.toX+"px","--ty":flight.toY+"px"
              }}>
                <b>{shortBusiness(flight.name)}</b>
              </div>
            ):null}

            <section className="artifacts reactiveZone">
              <h4>ARTEFACTOS</h4>
              {visibleArtifacts.map(([label,note],i)=>(
                <button key={label} className={(activeArtifact===i || !!selectedProfile?.artifacts?.includes(label))?"active":""} onClick={()=>chooseArtifact(i,label)}>
                  <i/><span><b>{label}</b><small>{note}</small></span>
                </button>
              ))}
            </section>

            <section className="businesses reactiveZone">
              <h4>CÉLULAS / NEGOCIOS</h4>
              {businessRows.map((row,i)=>(
                <button key={row.id} className={selectedBusiness?.id===row.id?"selected":""} onClick={()=>chooseBusiness(row,i)}>
                  <i/><span><b>{row.name}</b><small>{row.sector || "CÉLULA / NEGOCIO"}</small></span>
                </button>
              ))}
              <button className="newCell" onClick={()=>setStatus("Nuevas células nacen desde evidencia, aprendizaje y reproducción.")}><i/><span><b>…</b><small>nuevas células</small></span></button>
            </section>

            <section className="transversals reactiveZone">
              <h4>CAPACIDADES TRANSVERSALES</h4>
              <div>
                {TRANSVERSALS.map(([label,note],i)=>(
                  <button key={label} className={(activeTransversal===i || !!selectedProfile?.transversals?.includes(label))?"active":""} onClick={()=>selectTransversal(i,label)}>
                    <i/><b>{label}</b><small>{note}</small>
                  </button>
                ))}
              </div>
            </section>

            <section className="reproduction reactiveZone">
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

            <section className="infrastructure reactiveZone">
              <div className="infraIntro"><b>INFRAESTRUCTURA TÉCNICA</b><small>sostiene el organismo.<br/>no es una etapa del negocio.</small></div>
              <div className="infraNodes">
                {INFRA.map(([label,note,icon])=><button key={label} onClick={()=>{openInfrastructure(label,note);setStatus(`${label} · ${selectedBusiness?.name||note}`);}}><em>{icon}</em><span><b>{label}</b><small>{note}</small></span></button>)}
              </div>
            </section>

            <aside className="mapLegend">
              <span><i className="orange"/>FLUJO CONCHA</span>
              <span><i className="blue"/>ARTEFACTOS</span>
              <span><i className="green"/>NEGOCIOS / CÉLULAS</span>
              <span><i className="violet"/>TRANSVERSALES / INTELIGENCIA</span>
              <span><i className="gray"/>INFRAESTRUCTURA</span>
            </aside>

            {inspector ? (
              <aside className={`cellLens ${lensFolded?"isFolded":""}`} aria-label="Reflejo de la célula activa">
                <div className="cellLensHead">
                  <div><span>{inspector.kicker}</span><h3>{inspector.title}</h3></div>
                  <div className="cellLensControls">
                    <button onClick={()=>setLensFolded(value=>!value)} aria-label={lensFolded?"Desplegar panel":"Plegar panel"} aria-expanded={!lensFolded} title={lensFolded?"Desplegar panel":"Plegar para ver el mapa completo"}>{lensFolded?"▸":"‹"}</button>
                    <button onClick={()=>setInspector(null)} aria-label="Cerrar panel" title="Cerrar panel">×</button>
                  </div>
                </div>
                {inspector.summary ? <p className="cellLensSummary">{inspector.summary}</p> : null}
                {inspector.items?.length ? <div className="cellLensItems">{inspector.items.map((item,i)=><div key={i}><i/><span>{item}</span></div>)}</div> : null}
                {inspector.links?.length ? <div className="cellLensLinks">{inspector.links.map(link=><a key={link.href} href={link.href} target="_blank" rel="noreferrer">{link.label} ↗</a>)}</div> : null}
                <div className="cellLensActions">
                  <a href={inspector.kind==="rrss"?rrssUrl(selectedBusiness,"home"):worldUrl(selectedBusiness,inspector.dimension,inspector.modelId)} target="_blank" rel="noreferrer">{inspector.kind==="rrss"?"Abrir LINK RRSS →":"Abrir en LINK WORLD →"}</a>
                  <small>GAME observa · LINK WORLD trabaja · ChatGPT / modo Dios resuelve</small>
                </div>
              </aside>
            ) : null}

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
