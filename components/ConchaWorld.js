"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { CONCHA_STAGES, getCellModels, getCellStages, getCellEvidence, getRelatedCellIds, stageSignal } from '../lib/concha.mjs';

const GOVERNANCE = [['director', 'Director', 'Coordinación'], ['memoria', 'Hipocampo', 'Memoria'], ['memoria', 'Cortex', 'Interpretación'], ['cron', 'Pulso Vivo', 'Observación']];
const CAPACITIES = [['economia', 'FIN', 'Estado económico'], ['red', 'RRSS', 'Canales'], ['negocios', 'Personas', 'Identidad'], ['tableros', 'Artefactos', 'Herramientas'], ['modelos', 'Modelos', 'Conocimiento'], ['modelos', 'Evolución', 'Aprendizaje']];
const emptyData = { models: [], modelLinks: [], modelStages: [], modelEvidence: [], modelArtifacts: [], missions: [], workspaces: [] };

export default function ConchaWorld({ businesses, selectedId, onSelect, privateData, member, onLogin, onOpenBusiness, renderMission }) {
  const [focused, setFocused] = useState(false);
  const [stageKey, setStageKey] = useState(null);
  const [modelId, setModelId] = useState('');
  const [collapsed, setCollapsed] = useState(true);
  const [theme, setTheme] = useState('paper');
  const [paused, setPaused] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [query, setQuery] = useState('');
  const [dimension, setDimension] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const returnTimer = useRef(null);
  const root = useRef(null);
  const data = member ? privateData : emptyData;
  const business = focused ? businesses.find(row => row.id === selectedId) : null;
  const models = getCellModels(data, business?.id);
  const model = models.find(row => row.id === modelId) || models[0];
  const stages = getCellStages(data, business?.id, model?.id);
  const related = getRelatedCellIds(data, business?.id);
  const stage = CONCHA_STAGES.find(row => row.key === stageKey);
  const stageRow = stages.find(row => row.stage_key === stageKey);
  const proofs = getCellEvidence(data, business?.id, model?.id, stageKey);
  const missions = (data.missions || []).filter(row => (!business || row.business_global_id === business.global_id) && (!stageKey || row.stage_key === stageKey));
  const visibleCells = useMemo(() => businesses.filter(row => row.name.toLowerCase().includes(query.toLowerCase())), [businesses, query]);
  const scopedModels = new Set(models.map(row => row.id));
  const artifacts = (data.modelArtifacts || []).filter(row => scopedModels.has(row.model_id) && (!stageKey || row.stage_key === stageKey));

  useEffect(() => {
    const escape = e => { if (e.key === 'Escape' && !root.current?.closest('[hidden]')) { setStageKey(null); setDimension(null); } };
    window.addEventListener('keydown', escape);
    return () => { window.removeEventListener('keydown', escape); clearTimeout(returnTimer.current); };
  }, []);

  function enterCell(id) {
    clearTimeout(returnTimer.current); setLeaving(false); onSelect(id); setFocused(true); setStageKey(null); setDimension(null); setModelId('');
  }
  function backWorld() { setFocused(false); setStageKey(null); setDimension(null); }
  function openStage(key) { clearTimeout(returnTimer.current); setLeaving(false); setDimension(null); setStageKey(key); setCollapsed(false); }
  function closeStage() { setLeaving(true); clearTimeout(returnTimer.current); returnTimer.current = setTimeout(() => { setStageKey(null); setLeaving(false); }, 300); }
  function openDimension(id, name) { setStageKey(null); setDimension({ id, name }); setCollapsed(false); }
  const cx = 550, cy = 375;
  const position = i => { const angle = (-90 + i * 60) * Math.PI / 180; return { x: cx + Math.cos(angle) * 162, y: cy + Math.sin(angle) * 162 }; };

  return (
    <section ref={root} className={`conchaWorld theme-${theme} ${collapsed ? 'inspectorFolded' : ''} ${paused ? 'motionPaused' : ''} ${stage ? 'inStage' : ''}`} aria-label="Organismo interactivo LINK">
      <div className="conchaToolbar">
        <div className="conchaBreadcrumb" aria-label="Ruta dimensional">
          <button onClick={backWorld}>LINK</button>
          {business ? <><span>/</span><button onClick={() => { setStageKey(null); setDimension(null); }}>{business.name}</button><span>/</span><button onClick={() => { setStageKey(null); setDimension(null); }}>Concha</button></> : <span>/ Organismo</span>}
          {stage || dimension ? <><span>/</span><b>{stage?.label || dimension?.name}</b></> : null}
        </div>
        <div className="conchaControls">
          <button title="Alejar" aria-label="Alejar" onClick={() => setZoom(v => Math.max(.65, v - .15))}>−</button>
          <button title="Restablecer vista" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
          <button title="Acercar" aria-label="Acercar" onClick={() => setZoom(v => Math.min(1.6, v + .15))}>+</button>
          <button onClick={() => setPaused(v => !v)} aria-pressed={paused}>{paused ? 'Reanudar' : 'Pausar'}</button>
          <button title="Cambiar apariencia" onClick={() => setTheme(v => v === 'paper' ? 'night' : 'paper')}>{theme === 'paper' ? 'Noche' : 'Día'}</button>
          <button aria-label="Pantalla completa" title="Pantalla completa" onClick={() => { if (document.fullscreenElement) document.exitFullscreen?.(); else root.current?.requestFullscreen?.(); }}>⛶</button>
        </div>
      </div>

      <div className="conchaBody">
        <div className="organismViewport">
          <div className="organismHeading"><span>MAPA MAESTRO DEL ORGANISMO</span><h1>{business ? business.name : 'Todo se conecta.'}</h1><p>{business ? 'Una célula al centro. Todo LINK a su alrededor.' : 'Entra en una célula para observar LINK desde su lugar.'}</p></div>
          <div className="organismCanvas" style={{ '--zoom': zoom }}>
            <svg className="organismWires" viewBox="0 0 1120 730" aria-hidden="true">
              <defs><radialGradient id="cellGlow"><stop offset="0%" stopColor="var(--cell-tint)" stopOpacity=".17"/><stop offset="100%" stopColor="var(--cell-tint)" stopOpacity="0"/></radialGradient></defs>
              <ellipse cx={cx} cy={cy} rx="232" ry="218" fill="url(#cellGlow)"/>
              {[144, 205, 230].map(r => <circle key={r} cx={cx} cy={cy} r={r} className="orbitLine"/>)}
              <circle cx={cx} cy={cy} r="162" className="conchaOrbit"/>
              {CONCHA_STAGES.map((row, i) => { const p = position(i); const signal = stageSignal(stages.find(s => s.stage_key === row.key), getCellEvidence(data, business?.id, model?.id, row.key)); return <path key={row.key} d={`M ${cx} ${cy} Q ${cx + (p.x-cx)*.1} ${p.y} ${p.x} ${p.y}`} className={`stageWire ${business ? 'isFocused' : ''} ${signal.state}`} style={{ '--wire-color': row.color }}/>; })}
              {GOVERNANCE.map((row, i) => <path key={i} d={`M ${355 + i*130} 116 Q ${355+i*130} 170 ${cx} ${cy-225}`} className="structureWire"/>)}
              {CAPACITIES.map((row, i) => <path key={i} d={`M ${260+i*128} 657 Q ${260+i*128} 560 ${cx} ${cy+210}`} className="structureWire"/>)}
              <path d={`M 154 377 Q 288 230 ${cx-222} ${cy}`} className="structureWire"/>
              {businesses.map((row, i) => { const y = 248 + i*76; return <path key={row.id} d={`M 965 ${y} C 815 ${y} 825 ${cy} ${cx+232} ${cy}`} className={business && related.has(row.id) ? 'relationWire' : 'cellGuide'}/>; })}
            </svg>

            <div className="worldIdentity"><span className="microLabel">ORGANISMO</span><button className="linkHeart" onClick={backWorld}><b>LINK</b><small>Conocimiento común</small></button><p>El contexto cambia.<br/>La identidad se conserva.</p></div>
            <div className="governanceNodes">{GOVERNANCE.map(([id,name,note]) => <button key={name} onClick={() => openDimension(id,name)}><i/><b>{name}</b><small>{note}</small></button>)}</div>
            <div className="conchaRing" aria-label="Seis etapas de la Concha">
              {CONCHA_STAGES.map((row,i) => {
                const p = position(i); const signal = stageSignal(stages.find(s => s.stage_key === row.key), getCellEvidence(data,business?.id,model?.id,row.key));
                return <button key={row.key} className={`conchaStage signal-${signal.state}`} style={{ left: p.x, top: p.y, '--stage-color': row.color }} onClick={() => openStage(row.key)} aria-label={`Abrir ${row.label}${business ? ' de '+business.name : ' transversal'}`}><span>0{i+1}</span><b>{row.label}</b><small>{business && member ? signal.label : row.note}</small></button>;
              })}
            </div>
            <button className={`conchaNucleus ${business ? 'cellEntered' : ''}`} key={business?.id || 'world'} style={{ left: cx, top: cy, '--entry-x': '430px', '--entry-y': `${248 + businesses.findIndex(row=>row.id===business?.id)*76 - cy}px` }} onClick={() => { setStageKey(null); setDimension(null); setCollapsed(false); }}><span>{business ? 'CÉLULA CENTRAL' : 'LA CONCHA'}</span><b>{business?.name || 'Vida del negocio'}</b><small>{model?.name || (business ? business.sector : '6 etapas · un solo contexto')}</small></button>
            <div className="businessSatellites"><span className="microLabel">CÉLULAS DEL ORGANISMO</span>{businesses.map(row => <button key={row.id} className={`${business?.id === row.id ? 'selected' : ''} ${related.has(row.id) ? 'related' : ''}`} onClick={() => enterCell(row.id)} aria-pressed={business?.id === row.id}><i/><span><b>{row.name}</b><small>{business?.id === row.id ? 'En el centro' : related.has(row.id) ? 'Modelo compartido' : row.sector || 'Célula LINK'}</small></span><em>↗</em></button>)}{!businesses.length ? <p>No hay células disponibles en esta capa.</p> : null}</div>
            <div className="capacityNodes">{CAPACITIES.map(([id,name,note]) => <button key={name} onClick={() => openDimension(id,name)}><i/><b>{name}</b><small>{note}</small></button>)}</div>
          </div>
          <div className="conchaMobileCells" aria-label="Elegir negocio">{businesses.map(row => <button key={row.id} aria-pressed={business?.id === row.id} onClick={() => enterCell(row.id)}>{row.name}</button>)}</div>
          <div className="organismFooter"><span><i/> Líneas tenues: estructura de LINK</span><span>Líneas verdes: modelo compartido registrado</span><span>{business ? 'Contexto: '+business.name : 'Contexto: todo LINK'}</span></div>

          {stage ? <section className={`dimensionRoom ${leaving ? 'roomLeaving' : ''}`} style={{ '--room-x': `${position(CONCHA_STAGES.findIndex(s=>s.key===stage.key)).x/1120*100}%`, '--room-y': `${position(CONCHA_STAGES.findIndex(s=>s.key===stage.key)).y/730*100}%` }} key={`${business?.id || 'all'}-${model?.id || 'none'}-${stage.key}`} aria-label={`Mesa de ${stage.label}`}>
            <header><button onClick={closeStage}>← Volver a la Concha</button><span>{business?.name || 'LINK TRANSVERSAL'} / {stage.label}</span></header>
            <div className="dimensionIntro"><span className="microLabel">MESA DE TRABAJO · {business ? 'CÉLULA' : 'TRANSVERSAL'}</span><h2>{stage.label}</h2><p>{stage.note}. {business ? `Contexto de ${business.name}.` : 'Contexto de todas las células.'}</p></div>
            <nav className="dimensionTabs" aria-label="Cambiar etapa">{CONCHA_STAGES.map(s => <button key={s.key} className={stage.key===s.key ? 'active' : ''} onClick={() => openStage(s.key)}>{s.label}</button>)}</nav>
            {!member ? <div className="conchaPrivate"><b>La mesa operativa requiere tu acceso LINK.</b><p>La estructura es visible. Entra para consultar objetivos, misiones y evidencia autorizada de esta etapa.</p><button onClick={onLogin}>Entrar a LINK →</button></div> : <>
              {business && models.length > 1 ? <label className="conchaModelSelect">Modelo de esta célula<select value={model?.id || ''} onChange={e=>setModelId(e.target.value)}>{models.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label> : null}
              {business ? <div className="roomSections">
                <article><span className="microLabel">ESTADO</span><h3>{stageSignal(stageRow,proofs).label}</h3><p>{stageRow?.objective || 'Esta etapa todavía no tiene un objetivo registrado para este modelo y esta célula.'}</p></article>
                <article><span className="microLabel">SIGUIENTE ACCIÓN</span><h3>{stageRow?.next_action || 'Sin acción registrada'}</h3><p>{stageRow?.evidence_required || 'La evidencia requerida todavía no está definida.'}</p></article>
              </div> : null}
              <section className="roomEvidence"><span className="microLabel">EVIDENCIA DE ESTA CÉLULA Y MODELO</span>{!business ? <p>Selecciona una célula para examinar su evidencia propia.</p> : proofs.length ? proofs.map(p=><article key={p.id}><b>{p.result || p.evidence_type}</b><span>{p.verified === true ? 'Verificada' : 'Sin verificar'}</span></article>) : <p>No hay evidencia registrada visible en esta etapa.</p>}</section>
              <section className="roomMissions"><span className="microLabel">MISIONES DE {stage.label.toUpperCase()}</span>{missions.length ? missions.map(m=>renderMission(m)) : <p>No hay misiones visibles para este contexto y etapa.</p>}</section>
              {artifacts.length ? <section className="roomEvidence"><span className="microLabel">ARTEFACTOS RELACIONADOS</span>{artifacts.map(a=><article key={a.id}><b>{a.metadata?.name || a.artifact_id}</b><span>{a.role} · {a.status}</span></article>)}</section> : null}
            </>}
          </section> : null}
        </div>

        <aside className="conchaInspector">
          <div className="conchaInspectorRail"><button onClick={()=>setCollapsed(v=>!v)} aria-expanded={!collapsed} aria-label={collapsed ? 'Abrir panel contextual' : 'Plegar panel contextual'}>{collapsed ? '‹' : '›'}</button><button title="Células" aria-label="Mostrar células" onClick={()=>{setDimension(null);setCollapsed(false);}}>◉</button><button title="Contexto" aria-label="Mostrar contexto" onClick={()=>{setDimension({id:'context',name:'Contexto'});setCollapsed(false);}}>▤</button></div>
          {!collapsed ? <div className="conchaInspectorContent">
            <span className="microLabel">{dimension ? 'DIMENSIÓN' : stage ? 'ETAPA' : 'EXPLORAR'}</span><h2>{dimension?.name || stage?.label || business?.name || 'Las células mueven LINK.'}</h2>
            {dimension ? <>
              <p>{business ? `Perspectiva de ${business.name}.` : 'Perspectiva transversal de LINK.'}</p>
              <p>{dimension.id==='director' ? 'Director observa excepciones y coordina. El trabajo se ejecuta en cada etapa.' : dimension.id==='context' ? (business?.summary || 'Entra en una célula para ver su contexto, modelo y etapas.') : 'Esta capacidad rodea la Concha y conserva el contexto de la célula.'}</p>
              {member && business && dimension.id==='context' ? <div><span className="microLabel">MODELOS RELACIONADOS</span>{models.map(m=><p key={m.id}>{m.name}</p>)}{!models.length ? <p>No hay modelos relacionados visibles.</p> : null}</div> : null}
              {dimension.id==='tableros' && member ? <div>{artifacts.length ? artifacts.map(a=><p key={a.id}>{a.metadata?.name || a.artifact_id}</p>) : <p>No hay artefactos relacionados visibles para este contexto.</p>}</div> : null}
              {dimension.id==='economia' && member && business ? <div className="dimensionRecords">{(data.transactions || []).filter(t=>t.business_id===business.id).length ? (data.transactions || []).filter(t=>t.business_id===business.id).slice(0,6).map(t=><p key={t.id}><b>{new Intl.NumberFormat('es-CL',{style:'currency',currency:t.currency || 'CLP'}).format(t.amount || 0)}</b><br/>{t.transaction_type} · {t.status}</p>) : <p>No hay movimientos económicos visibles de esta célula.</p>}</div> : null}
              {dimension.name==='RRSS' && member && business ? <div>{(data.rrss || []).filter(p=>p.business_id===business.id).map(p=><p key={p.id}><b>{p.name}</b><br/>{p.status}</p>)}</div> : null}
              {dimension.id==='director' && member ? <div>{missions.slice(0,5).map(m=><p key={m.id}><b>{m.title}</b><br/>{m.status} · {m.assigned_agent_slug || 'Sin responsable'}</p>)}</div> : null}
              {!member ? <button className="conchaAction" onClick={onLogin}>Entrar para consultar la capa privada →</button> : null}
            </> : <><p>{business ? business.summary || business.sector : 'Selecciona un negocio. El centro, las etapas y las relaciones se reorganizan alrededor de él.'}</p><label className="cellSearch"><span>Buscar célula</span><input placeholder="Nombre del negocio" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="conchaCellList">{visibleCells.map(b=><button key={b.id} aria-pressed={business?.id===b.id} onClick={()=>enterCell(b.id)}><i/><span><b>{b.name}</b><small>{b.sector}</small></span><em>→</em></button>)}{!visibleCells.length ? <p>No hay coincidencias.</p> : null}</div></>}
            {business ? <div className="conchaInspectorActions"><button className="conchaAction" onClick={()=>onOpenBusiness(business)}>Abrir ficha completa →</button><button onClick={backWorld}>Volver a todo LINK</button></div> : null}
            <div className="conchaContextNote">{business ? <><span>businessContext</span><b>{business.name}</b></> : <><span>businessContext</span><b>Todo LINK</b></>}{!member ? <small>Los detalles operativos se consultan con tu sesión.</small> : null}</div>
          </div> : null}
        </aside>
      </div>
      <span className="conchaAnnouncement" role="status" aria-live="polite">{stage ? `${stage.label} de ${business?.name || 'todo LINK'}` : business ? `${business.name} en el centro de la Concha` : 'Vista completa de LINK'}</span>
    </section>
  );
}
