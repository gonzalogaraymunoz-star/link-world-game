"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CONCHA_STAGES, getCellModels, getCellStages, getCellEvidence, stageSignal } from '../lib/concha.mjs';
import { DIMENSIONS, scopeBusinessRows, scopeMissions } from '../lib/world-navigation.mjs';

const READS = {
  nervioso: true,
  personas: ['link_persons','id,universal_code,display_name,status,primary_business_id,updated_at','primary_business_id'],
  artefactos: ['link_dot_artifacts','id,business_id,name,description,artifact_type,status,route,source_system,updated_at','business_id'],
  genesis: ['link_genesis_instances','id,instance_key,business_id,parent_instance_id,instance_role,status,development_stage,certification_status,inherited_component_keys,updated_at','business_id'],
  reproduccion: ['link_genesis_components','id,component_key,business_id,component_type,name,clone_policy,status,summary,updated_at','business_id'],
  handoffs: ['agent_stage_handoffs','id,business_global_id,from_stage_key,to_stage_key,status,summary,blocker,updated_at','business_global_id']
};
const NOTES = {
  nervioso:'Señales, regulación, decisión y verificación. El contrato vigente se resuelve desde CONTROL CENTRAL.',
  fin:'FIN conserva el estado económico. Una captura o una tarea completada no certifican un pago.',
  rrss:'Los canales conectan identidad y conversación con el recorrido comercial de cada célula.',
  personas:'Identidad universal. Esta vista muestra la asociación primaria registrada con una célula.',
  evidencias:'Cada resultado pertenece a su negocio y modelo. Verificación y existencia son estados distintos.',
  artefactos:'Herramientas y entregables reutilizables, con su origen y estado registrado.',
  evolucion:'Aprender del recorrido real sin convertir actividades en resultados económicos.',
  director:'Priorizar excepciones, desbloquear decisiones y coordinar el siguiente movimiento.',
  pulso:'Observar señales y ritmos. El Director coordina; cada dimensión ejecuta.',
  hipocampo:'Memoria contextual del organismo. Los conteos disponibles son transversales.',
  cortex:'Conocimiento e interpretación del organismo. Los conteos disponibles son transversales.',
  show:'Una mesa de conversación situada en el negocio, dimensión y modelo actuales.',
  modelos:'Dolor, tratamiento y evidencia: el conocimiento común aplicado a cada célula.',
  genesis:'Instancias registradas, desarrollo y certificación. Una instancia técnica no demuestra un negocio autónomo.',
  reproduccion:'Mitosis hereda capacidades; Meiosis combina componentes para probar una nueva hipótesis.',
  conexiones:'Proveedores y conexiones normalizadas. El negocio conserva su contexto sin duplicar integraciones.',
  administracion:'Acceso y gobierno del espacio de trabajo.',
  mesas:'Superficies de trabajo del ecosistema, abiertas desde su registro original.',
  misiones:'Problema, responsable y siguiente resultado esperado.',
  eventos:'Señales recibidas del ecosistema y su origen.'
};
const text = value => typeof value==='object' ? JSON.stringify(value) : value;
export function EvidenceList({rows}) {
  return <RecordList rows={rows} title={r=>r.evidence_type || 'Evidencia'} detail={r=>text(r.result) || r.source_ref} badge={r=>r.verified===true?'Verificada':'Sin verificar'} />;
}
export function RecordList({rows,title,detail,badge,empty='No hay registros disponibles para este contexto.',renderAction}) {
  if(!rows.length) return <div className="ledgerEmpty">{empty}</div>;
  return <div className="ledgerRecords">{rows.map((r,i)=><article className="ledgerRecord" key={r.id||r.workspace_key||r.connection_key||i}><div><span className="ledgerIndex">{String(i+1).padStart(2,'0')}</span><h3>{title(r)}</h3>{detail(r)?<p>{detail(r)}</p>:null}</div><div className="ledgerRecordEnd">{badge?<span className="ledgerBadge">{badge(r)||'Sin estado'}</span>:null}{renderAction?.(r)}</div></article>)}</div>;
}
function Section({title,children}) {return <section className="ledgerSection"><h2>{title}</h2>{children}</section>;}

export default function DimensionWorkspace({view,business,businesses,data,member,onLogin,onNavigate,modelId,onModelChange,renderMission,resolveWorkspaceUrl}) {
  const stage = CONCHA_STAGES.find(r=>r.key===view);
  const models = business?getCellModels(data,business.id):data.models;
  const selectedModel = models.find(r=>r.id===modelId) || (business?models[0]:null);
  const stages = business?getCellStages(data,business.id,selectedModel?.id):data.modelStages.filter(r=>!selectedModel||r.model_id===selectedModel.id);
  const proofs = business?getCellEvidence(data,business.id,selectedModel?.id,stage?.key):data.modelEvidence.filter(r=>(!selectedModel||r.model_id===selectedModel.id)&&(!stage||r.metadata?.stage_key===stage.key));
  const missions = scopeMissions(data.missions,business,stage?.key);
  const readKey = stage?'handoffs':READS[view]?view:null;
  const [remote,setRemote] = useState({key:'',rows:[],loading:false,error:''});
  const requestKey = `${readKey}:${business?.id||'all'}:${member}`;
  useEffect(()=>{
    if(!member||!readKey||!supabase) return;
    let active=true;
    setRemote({key:requestKey,rows:[],loading:true,error:''});
    async function load() {
      let result;
      if(readKey==='nervioso') {
        const namespace=await supabase.from('memory_namespaces').select('id,metadata').eq('scope_type','system').eq('scope_key','link-nervous-system').maybeSingle();
        const key=namespace.data?.metadata?.canonical_contract_key;
        if(namespace.error||!key){result={data:[],error:{message:'Contrato no accesible'}};}
        else result=await supabase.from('deep_memories').select('id,memory_key,structured_data,updated_at').eq('namespace_id',namespace.data.id).eq('memory_key',key).is('archived_at',null).or(`valid_until.is.null,valid_until.gt.${new Date().toISOString()}`).limit(1);
      } else {
        const [table,columns,businessColumn] = READS[readKey];
        let query=supabase.from(table).select(columns).order('updated_at',{ascending:false}).limit(100);
        if(business) query=query.eq(businessColumn,businessColumn==='business_global_id'?business.global_id:business.id);
        result=await query;
      }
      if(active)setRemote({key:requestKey,rows:result.data||[],loading:false,error:result.error?'No pudimos leer esta fuente con el acceso actual.':''});
    }
    load().catch(()=>{if(active)setRemote({key:requestKey,rows:[],loading:false,error:'No pudimos consultar la fuente.'});});
    return()=>{active=false;};
  },[requestKey,readKey,business?.id,business?.global_id,member]);
  const extra = remote.key===requestKey?remote.rows:[];
  const scoped = key=>scopeBusinessRows(data[key],business);
  const attention = missions.filter(r=>['blocked','attention','approval_required'].includes(r.status)||['urgent','critical','high'].includes(r.priority));
  const stateRows = stage?stages.filter(r=>r.stage_key===stage.key):stages;
  const safeHref = url=>/^https:\/\//.test(url||'')?url:null;
  const workspaceLink = r=>{const href=safeHref(resolveWorkspaceUrl(r));return href?<a href={href} target="_blank" rel="noreferrer">Abrir mesa ↗</a>:null;};
  const stageMissions = <div className="ledgerMissions">{missions.length?missions.map(renderMission):<div className="ledgerEmpty">Sin misiones registradas para este contexto.</div>}</div>;
  return <section className="dimensionWorkspace" key={view} aria-label={`Dimensión ${DIMENSIONS[view]?.label}`}>
    <div className="ledgerHero"><span className="sectionKicker">{DIMENSIONS[view]?.groupLabel} / {business?.name||'Todo LINK'}</span><h1>{DIMENSIONS[view]?.label}</h1><p>{stage?stage.note+'. El mismo recorrido, desde una célula o desde todo LINK.':NOTES[view]}</p></div>
    {!member?<div className="ledgerAccess"><span>ESPACIO DE TRABAJO</span><h2>Entra para consultar los registros de LINK.</h2><p>La estructura está disponible. Misiones, evidencia y datos operativos requieren acceso de miembro.</p><button className="ledgerPrimary" onClick={onLogin}>Entrar al ecosistema</button></div>:<>
      {(stage||['evidencias','evolucion','modelos','show','reproduccion'].includes(view))&&models.length?<label className="ledgerModel">Modelo <select value={selectedModel?.id||''} onChange={e=>onModelChange(e.target.value)}>{!business?<option value="">Todos los modelos</option>:null}{models.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>:null}
      {readKey&&remote.key===requestKey&&remote.loading?<p role="status">Consultando la fuente…</p>:null}
      {readKey&&remote.key===requestKey&&remote.error?<div className="ledgerReadError" role="alert">{remote.error}</div>:null}
      {stage?<>
        <Section title="Mesa de la etapa"><RecordList rows={stateRows} title={r=>business?.name||`${businesses.find(b=>b.id===r.business_id)?.name||'Célula registrada'} · ${data.models.find(m=>m.id===r.model_id)?.name||'Modelo registrado'}`} detail={r=>[r.objective,r.strategy,r.next_action].filter(Boolean).join(' · ')} badge={r=>stageSignal(r,proofs.filter(p=>p.business_id===r.business_id&&p.model_id===r.model_id)).label}/></Section>
        <Section title="Misiones">{stageMissions}</Section><Section title="Evidencia de esta etapa"><EvidenceList rows={proofs}/></Section>
        <Section title="Traspasos"><RecordList rows={extra.filter(r=>r.from_stage_key===view||r.to_stage_key===view)} title={r=>`${r.from_stage_key} → ${r.to_stage_key}`} detail={r=>r.blocker||r.summary} badge={r=>r.status}/></Section>
      </>:null}
      {view==='nervioso'?<NervousPanel rows={extra}/>:null}
      {view==='misiones'?<Section title="Trabajo registrado">{stageMissions}</Section>:null}
      {view==='director'?<><Section title="Excepciones"><div className="ledgerMissions">{attention.length?attention.map(renderMission):<div className="ledgerEmpty">No hay excepciones registradas entre las misiones cargadas.</div>}</div></Section><Section title="Señales pendientes"><RecordList rows={scoped('alerts')} title={r=>r.title} detail={r=>r.body} badge={r=>r.is_read?'Leída':'Pendiente'}/></Section></>:null}
      {view==='fin'?<><Section title="Movimientos"><RecordList rows={scoped('transactions')} title={r=>`${r.amount} ${r.currency} · ${r.transaction_type}`} detail={r=>r.paid_at?`Pago registrado: ${r.paid_at}`:`${r.direction} · ${r.payment_method||'Sin medio registrado'}`} badge={r=>r.status}/></Section><Section title="Políticas de cobro"><RecordList rows={scoped('financialPolicies')} title={r=>r.policy_key} detail={r=>`${r.collection_model} · ${r.payment_provider||'Sin proveedor'}`} badge={r=>r.status}/></Section><Section title="Proveedores"><RecordList rows={scoped('paymentProviders')} title={r=>r.provider} detail={r=>`${r.environment} · webhook ${r.webhook_status}`} badge={r=>r.status}/></Section></>:null}
      {view==='rrss'?<><Section title="Identidades de canal"><RecordList rows={scoped('rrss')} title={r=>r.name} detail={r=>r.slug} badge={r=>r.status}/></Section><Section title="Atención de canal"><RecordList rows={scoped('alerts')} title={r=>r.title} detail={r=>r.body} badge={r=>r.notification_type}/></Section></>:null}
      {view==='personas'?<Section title="Personas registradas"><RecordList rows={extra} title={r=>r.display_name} detail={r=>r.universal_code} badge={r=>r.status}/></Section>:null}
      {view==='artefactos'?<Section title="Catálogo"><RecordList rows={extra} title={r=>r.name} detail={r=>r.description} badge={r=>`${r.artifact_type} · ${r.status}`}/></Section>:null}
      {view==='evidencias'?<Section title="Resultados del modelo"><EvidenceList rows={proofs}/></Section>:null}
      {view==='evolucion'?<><Section title="Recorrido comprobable"><RecordList rows={stages} title={r=>CONCHA_STAGES.find(s=>s.key===r.stage_key)?.label||r.stage_key} detail={r=>r.next_action} badge={r=>stageSignal(r,proofs.filter(p=>p.business_id===r.business_id&&p.model_id===r.model_id&&p.metadata?.stage_key===r.stage_key)).label}/></Section><button onClick={()=>onNavigate('reproduccion')}>Explorar reproducción ↗</button></>:null}
      {view==='modelos'?<Section title="Modelos del contexto"><RecordList rows={models} title={r=>r.name} detail={r=>`${r.pain_statement||''} · ${r.solution_statement||''}`} badge={r=>r.maturity_stage||r.status}/></Section>:null}
      {view==='genesis'?<Section title="Instancias"><RecordList rows={extra} title={r=>r.instance_key} detail={r=>`${r.instance_role||'Instancia'} · ${r.development_stage||'Etapa sin registrar'} · ${r.inherited_component_keys?.length||0} componentes heredados`} badge={r=>r.certification_status||r.status}/></Section>:null}
      {view==='reproduccion'?<><div className="reproductionRules"><article><span>01 / MITOSIS</span><h2>Replicar capacidades.</h2><p>Modelos, plantillas, artefactos, políticas y roles. La nueva célula comienza su propia Concha.</p></article><article><span>02 / MEIOSIS</span><h2>Combinar y experimentar.</h2><p>Una hipótesis nueva reúne componentes. Génesis registra y valida su desarrollo.</p></article></div><p className="ledgerScopeNote">Las ventas, pagos, evidencias y estados de clientes permanecen en su célula de origen. Esta mesa consulta componentes; no crea ni certifica nuevas células.</p><Section title="Componentes y política de herencia"><RecordList rows={extra} title={r=>r.name} detail={r=>r.summary} badge={r=>r.clone_policy||'Sin política registrada'}/></Section><button onClick={()=>onNavigate('genesis')}>Ver instancias en Génesis ↗</button></>:null}
      {['hipocampo','cortex'].includes(view)?<><div className="ledgerMetrics">{Object.entries(data.memoryCounts||{}).map(([key,count])=><article key={key}><b>{count??'—'}</b><span>{{memories:'Recuerdos',cortex:'Documentos',learnings:'Aprendizajes',reports:'Informes'}[key]||key}</span></article>)}</div><p className="ledgerScopeNote">Inventario transversal. Esta fuente no ofrece una búsqueda por negocio en esta mesa.</p><a href="https://linkcontrolgeneral.vercel.app" target="_blank" rel="noreferrer">Consultar Control Central ↗</a></>:null}
      {view==='pulso'?<Section title="Ritmos registrados"><RecordList rows={business?data.cron.filter(r=>r.metadata?.business_id===business.id||(business.global_id&&r.metadata?.business_global_id===business.global_id)):data.cron} title={r=>r.name||r.cron_key} detail={r=>r.cycle_label||r.description} badge={r=>r.status}/></Section>:null}
      {view==='conexiones'?<><p className="ledgerScopeNote">Registro transversal de proveedores. Solo se filtran conexiones con una asociación explícita al negocio.</p><Section title="Conexiones"><RecordList rows={business?data.integrations.filter(r=>r.metadata?.business_id===business.id||(business.global_id&&r.metadata?.business_global_id===business.global_id)):data.integrations} title={r=>r.provider} detail={r=>`${r.connection_key} · ${r.last_error||r.mode||'Sin modo registrado'}`} badge={r=>r.status}/></Section></>:null}
      {view==='mesas'?<Section title="Mesas disponibles"><RecordList rows={business?data.workspaces.filter(r=>r.metadata?.business_id===business.id||(business.global_id&&r.metadata?.business_global_id===business.global_id)):data.workspaces} title={r=>r.name} detail={r=>r.description} badge={r=>r.status} renderAction={workspaceLink}/></Section>:null}
      {view==='eventos'?<Section title="Señales recibidas"><RecordList rows={business?data.events.filter(r=>r.global_id===business.global_id):data.events} title={r=>r.event_type} detail={r=>`${r.source_provider} · ${r.entity_type} · ${r.occurred_at||r.received_at}`} badge={r=>r.global_id||'Sistema'}/></Section>:null}
      {view==='show'?<ShowContext business={business} model={selectedModel}/>:null}
      {view==='administracion'?<div className="ledgerAccess"><span>ACCESO ACTUAL</span><h2>Miembro del ecosistema.</h2><p>Los registros siguen los permisos de CONTROL CENTRAL. Roles, conexiones y políticas se administran en su sistema de origen.</p><a href="https://linkcontrolgeneral.vercel.app" target="_blank" rel="noreferrer">Abrir administración ↗</a></div>:null}
    </>}
  </section>;
}
function ShowContext({business,model}) {
  const [copied,setCopied]=useState(false);
  const prompt=`LINK SHOW. Contexto: ${business?.name||'Todo LINK'}. business_id: ${business?.id||'transversal'}. Modelo: ${model?.name||'Todos'}. model_id: ${model?.id||'transversal'}. Consulta la memoria y evidencia autorizadas; distingue hechos, hipótesis y decisiones. Propón el siguiente movimiento sin certificar pagos ni ejecutar acciones externas.`;
  return <Section title="Preparar conversación"><p className="ledgerScopeNote">Contexto para continuar con LINK. No hay un chat de agente conectado a esta mesa todavía.</p><textarea aria-label="Contexto de LINK SHOW" readOnly value={prompt}/><button className="ledgerPrimary" onClick={async()=>{try{await navigator.clipboard.writeText(prompt);setCopied(true);}catch{setCopied(false);}}}>{copied?'Contexto copiado':'Copiar contexto'}</button></Section>;
}

function NervousPanel({rows}) {
  const contract=rows[0]?.structured_data;
  if(!contract)return <div className="ledgerEmpty">El contrato vigente no está disponible en esta lectura.</div>;
  const organs=[
    ['Tálamo','Enrutar la señal y entregar contexto.',contract.thalamus_contract_key],
    ['Homeostasis','Comparar lo observado con lo esperado.',contract.contracts?.homeostasis],
    ['Hipotálamo','Regular prioridad y condiciones.',contract.hypothalamus_contract_key],
    ['Núcleos Basales','Seleccionar o inhibir una conducta.',contract.basal_contract_key],
    ['Pares LINK','Transportar señales y acciones sin conceder permisos.',contract.cranial_pairs_contract_key],
    ['Cerebelo','Contrastar el procedimiento con su resultado.',contract.cerebellum_contract_key],
    ['Respiración LINK','Sincronizar mediante el ciclo existente.',contract.breathing_contract_key],
    ['Metabolismo','Integrar la célula y sus cambios estructurales.',contract.metabolism_contract_key]
  ].filter(r=>r[2]);
  return <><div className="ledgerMetrics"><article><b>{contract.version||'—'}</b><span>Versión del contrato vigente</span></article><article><b>{organs.length}</b><span>Contratos de función referenciados</span></article></div><p className="ledgerScopeNote">Contrato transversal de CONTROL CENTRAL. Seleccionar una célula conserva la perspectiva; esta mesa no activa agentes ni modifica su autonomía.</p><Section title="Funciones del sistema"><div className="nervousGrid">{organs.map(([name,note,key])=><article key={key}><span>CONTRATO REFERENCIADO</span><h3>{name}</h3><p>{note}</p></article>)}</div></Section><Section title="Pulso y regulación"><RecordList rows={contract.current_pulse_runtime?[{id:'pulse',...contract.current_pulse_runtime}]:[]} title={r=>`Pulso · ${r.runtime}`} detail={r=>`${r.frequency} · modo ${r.mode}`} badge={r=>r.status}/><p className="ledgerScopeNote">Estado declarado en el contrato, actualizado el {rows[0]?.updated_at?.slice(0,10)||'fecha no disponible'}. La lectura del contrato no comprueba por sí sola cada ejecutor.</p></Section></>;
}
