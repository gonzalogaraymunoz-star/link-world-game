"use client";
import { useState } from 'react';
import { LinkIcon } from './WorldNavigation';
import { DIMENSIONS, scopeMissions, scopeBusinessRows } from '../lib/world-navigation.mjs';
import { CONCHA_STAGES, getCellModels, getCellEvidence } from '../lib/concha.mjs';
import { EvidenceList, RecordList } from './DimensionWorkspace';

const TABS=[['contexto','Contexto','orbit'],['atencion','Atención','attention'],['evidencia','Evidencia','evidence'],['recorrido','Recorrido','cycle'],['celulas','Células','grid'],['historial','Historial','history']];
export default function WorldContextDock({business,businesses,view,data,member,onLogin,onSelect,onClear,onNavigate,history,modelId,onModelChange,onOpenBusiness,mapInfo,mapActions,mapProgress}) {
  const [collapsed,setCollapsed]=useState(true);
  const [tab,setTab]=useState('contexto');
  const [query,setQuery]=useState('');
  const tabs=view==='mundo'?[...TABS,['lugar','Lugar','orbit'],['trabajo','Acciones','branch'],['avance','Desarrollo','signal']]:TABS;
  const activeTab=tabs.some(r=>r[0]===tab)?tab:'contexto';
  const stage=CONCHA_STAGES.find(r=>r.key===view);
  const models=member?(business?getCellModels(data,business.id):data.models):[];
  const model=models.find(r=>r.id===modelId)||(business?models[0]:null);
  const proofs=member?(business?getCellEvidence(data,business.id,model?.id,stage?.key):data.modelEvidence.filter(r=>(!model||r.model_id===model.id)&&(!stage||r.metadata?.stage_key===stage.key))):[];
  const attention=member?scopeMissions(data.missions,business,stage?.key).filter(r=>['blocked','attention','approval_required'].includes(r.status)||['high','urgent','critical'].includes(r.priority)):[];
  return <aside className={`worldContextDock ${collapsed?'isFolded':''}`} aria-label="Panel contextual">
    <button className="contextFold" aria-label={collapsed?'Abrir panel contextual':'Plegar panel contextual'} aria-expanded={!collapsed} onClick={()=>setCollapsed(v=>!v)}><LinkIcon name="panel"/>{!collapsed?<span>Contexto vivo</span>:null}</button>
    <div className="contextTabs" role="tablist" aria-label="Herramientas de contexto">{tabs.map(([id,label,icon])=><button role="tab" aria-selected={activeTab===id&&!collapsed} aria-controls="context-content" title={label} aria-label={label} key={id} className={activeTab===id&&!collapsed?'active':''} onClick={()=>{setTab(id);setCollapsed(false);}}><LinkIcon name={icon}/>{!collapsed?<span>{label}</span>:null}</button>)}</div>
    {!collapsed?<div id="context-content" className="contextContent" role="tabpanel" aria-label={tabs.find(r=>r[0]===tab)?.[1]}>
      {activeTab==='contexto'?<><span className="sectionKicker">PERSPECTIVA ACTUAL</span><h2>{business?.name||'Todo LINK'}</h2><p>{DIMENSIONS[view]?.label} / {model?.name||'Todos los modelos'}</p>{business?<><p>{business.summary||business.sector}</p><button onClick={()=>onOpenBusiness(business)}>Abrir ficha ↗</button><button onClick={onClear}>Volver a Todo LINK</button></>:<p>Elige una célula para recorrer las mismas dimensiones desde su contexto.</p>}{models.length?<label className="ledgerModel">Modelo<select value={model?.id||''} onChange={e=>onModelChange(e.target.value)}>{!business?<option value="">Todos</option>:null}{models.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>:null}</>:null}
      {['atencion','evidencia','recorrido'].includes(activeTab)&&!member?<div className="ledgerEmpty"><p>Entra para consultar el trabajo y la evidencia de este contexto.</p><button className="ledgerPrimary" onClick={onLogin}>Entrar</button></div>:null}
      {activeTab==='atencion'&&member?<><h2>Requiere atención</h2><RecordList rows={attention} title={r=>r.title} detail={r=>r.problem_statement} badge={r=>r.status}/><RecordList rows={scopeBusinessRows(data.alerts,business)} title={r=>r.title} detail={r=>r.body} badge={r=>'Señal'}/></>:null}
      {activeTab==='evidencia'&&member?<><h2>Evidencia del contexto</h2><EvidenceList rows={proofs}/></>:null}
      {activeTab==='recorrido'&&member?<><h2>La Concha</h2><p>Accede a cada etapa conservando la célula y el modelo.</p><div className="contextJourney">{CONCHA_STAGES.map((s,i)=><button key={s.key} onClick={()=>onNavigate(s.key)} className={view===s.key?'active':''}><span>0{i+1}</span><b>{s.label}</b><LinkIcon name="chevron"/></button>)}</div></>:null}
      {activeTab==='celulas'?<><h2>Elegir perspectiva</h2><input aria-label="Buscar célula" placeholder="Buscar célula" value={query} onChange={e=>setQuery(e.target.value)}/><button className={!business?'active':''} onClick={onClear}>Todo LINK</button><div className="contextCells">{businesses.filter(r=>r.name.toLowerCase().includes(query.toLowerCase())).map(r=><button key={r.id} className={business?.id===r.id?'active':''} onClick={()=>onSelect(r.id)}><b>{r.name}</b><small>{r.sector}</small></button>)}</div></>:null}
      {activeTab==='historial'?<><h2>Recorrido reciente</h2><div className="contextHistory">{history.slice().reverse().map((r,i)=><button key={i} onClick={()=>onNavigate(r.dimension,r.business,r.model)}><b>{DIMENSIONS[r.dimension]?.label}</b><small>{businesses.find(b=>b.id===r.business)?.name||'Todo LINK'}</small></button>)}</div></>:null}
      {activeTab==='lugar'?mapInfo:null}
      {activeTab==='trabajo'?(member?mapActions:<div className="ledgerEmpty"><p>Entra para trabajar sobre las acciones de esta célula.</p><button onClick={onLogin}>Entrar</button></div>):null}
      {activeTab==='avance'?(member?mapProgress:<div className="ledgerEmpty">El desarrollo requiere datos autorizados.</div>):null}
    </div>:null}
  </aside>;
}
