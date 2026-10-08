"use client";

import { useRef, useState } from 'react';
import { CONCHA_STAGES, getCellModels, getCellStages, getCellEvidence, getRelatedCellIds, stageSignal } from '../lib/concha.mjs';
import { buildControlUrl, buildGameUrl, contextFromBusiness } from '../lib/link-app-context.mjs';

const GOVERNANCE = [['director', 'Director', 'Coordinación'], ['hipocampo', 'Hipocampo', 'Memoria'], ['cortex', 'Cortex', 'Interpretación'], ['pulso', 'Pulso Vivo', 'Observación'], ['nervioso', 'Sistema nervioso', 'Gobierno y señales']];
const CAPACITIES = [['fin', 'FIN', 'Estado económico'], ['rrss', 'RRSS', 'Canales'], ['personas', 'Personas', 'Identidad'], ['artefactos', 'Artefactos', 'Herramientas'], ['modelos', 'Modelos', 'Conocimiento'], ['evolucion', 'Evolución', 'Aprendizaje']];
const emptyData = { models: [], modelLinks: [], modelStages: [], modelEvidence: [], modelArtifacts: [], missions: [], workspaces: [], journeys: [], scopeStates: [] };

export default function ConchaWorld({ businesses, businessContext, onSelect, privateData, member, onClear, onNavigate, modelId, theme, onThemeChange }) {
  const [paused, setPaused] = useState(false);
  const [zoom, setZoom] = useState(1);
  const root = useRef(null);
  const data = member ? privateData : emptyData;
  const business = businesses.find(row => row.id === businessContext);
  const models = getCellModels(data, business?.id);
  const model = models.find(row => row.id === modelId) || models[0];
  const stages = getCellStages(data, business?.id, model?.id);
  const related = getRelatedCellIds(data, business?.id);
  function enterCell(id) { onSelect(id); }
  function backWorld() { onClear(); }
  function openStage(key) {
    window.location.assign(buildGameUrl(contextFromBusiness(business,{stage:key,model:model?.id||null}),'world'));
  }
  function openGovernance(id) {
    window.location.assign(buildControlUrl(contextFromBusiness(business,{focus:id}),'world'));
  }
  function openCapability(id) {
    window.location.assign(buildGameUrl(contextFromBusiness(business,{focus:id,model:model?.id||null}),'world'));
  }
  function openBusinessGame() {
    if (!business) return;
    window.location.assign(buildGameUrl(contextFromBusiness(business,{model:model?.id||null}),'world'));
  }
  const cx = 550, cy = 375;
  const position = i => { const angle = (-90 + i * 60) * Math.PI / 180; return { x: cx + Math.cos(angle) * 162, y: cy + Math.sin(angle) * 162 }; };

  return (
    <section ref={root} className={`conchaWorld theme-${theme} inspectorFolded ${paused ? 'motionPaused' : ''}`} aria-label="Organismo interactivo LINK">
      <div className="conchaToolbar">
        <div className="conchaBreadcrumb" aria-label="Ruta dimensional">
          <button onClick={backWorld}>LINK</button>
          <span>/ {business?.name || 'Organismo'}</span>
        </div>
        <div className="conchaControls">
          <button title="Alejar" aria-label="Alejar" onClick={() => setZoom(v => Math.max(.65, v - .15))}>−</button>
          <button title="Restablecer vista" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
          <button title="Acercar" aria-label="Acercar" onClick={() => setZoom(v => Math.min(1.6, v + .15))}>+</button>
          <button onClick={() => setPaused(v => !v)} aria-pressed={paused}>{paused ? 'Reanudar' : 'Pausar'}</button>
          <button title="Cambiar apariencia" onClick={() => onThemeChange(theme === 'day' ? 'gray' : theme === 'gray' ? 'night' : 'day')}>{theme === 'day' ? 'Día' : theme === 'gray' ? 'Gris' : 'Noche'}</button>
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
            <div className="governanceNodes">{GOVERNANCE.map(([id,name,note]) => <button key={name} onClick={() => openGovernance(id)} title="Abrir en LINK CONTROL CENTRAL"><i/><b>{name}</b><small>{note}</small></button>)}</div>
            <div className="conchaRing" aria-label="Seis etapas de la Concha">
              {CONCHA_STAGES.map((row,i) => {
                const p = position(i); const signal = stageSignal(stages.find(s => s.stage_key === row.key), getCellEvidence(data,business?.id,model?.id,row.key));
                return <button key={row.key} className={`conchaStage signal-${signal.state}`} style={{ left: p.x, top: p.y, '--stage-color': row.color }} onClick={() => openStage(row.key)} aria-label={`Abrir ${row.label}${business ? ' de '+business.name : ' transversal'}`}><span>0{i+1}</span><b>{row.label}</b><small>{business && member ? signal.label : row.note}</small></button>;
              })}
            </div>
            <button className={`conchaNucleus ${business ? 'cellEntered' : ''}`} key={business?.id || 'world'} style={{ left: cx, top: cy, '--entry-x': '430px', '--entry-y': `${248 + businesses.findIndex(row=>row.id===business?.id)*76 - cy}px` }} onClick={openBusinessGame}><span>{business ? (business.verification_status === 'verified' ? 'NEGOCIO COMPROBADO' : 'CÉLULA EN DESARROLLO') : 'LA CONCHA'}</span><b>{business?.name || 'Vida del negocio'}</b><small>{model?.name || (business ? business.sector : '6 etapas · un solo contexto')}</small></button>
            <div className="businessSatellites"><span className="microLabel">CÉLULAS DEL ORGANISMO</span>{businesses.map(row => <button key={row.id} className={`${business?.id === row.id ? 'selected' : ''} ${related.has(row.id) ? 'related' : ''}`} onClick={() => enterCell(row.id)} aria-pressed={business?.id === row.id}><i/><span><b>{row.name}</b><small>{business?.id === row.id ? 'En el centro' : related.has(row.id) ? 'Modelo compartido' : row.sector || 'Célula LINK'}</small></span><em>↗</em></button>)}{!businesses.length ? <p>No hay células disponibles en esta capa.</p> : null}</div>
            <div className="capacityNodes">{CAPACITIES.map(([id,name,note]) => <button key={name} onClick={() => openCapability(id)} title="Trabajar en LINK WORLD GAME"><i/><b>{name}</b><small>{note}</small></button>)}</div>
          </div>
          <div className="conchaMobileCells" aria-label="Elegir negocio">{businesses.map(row => <button key={row.id} aria-pressed={business?.id === row.id} onClick={() => enterCell(row.id)}>{row.name}</button>)}</div>
          <div className="organismFooter"><span><i/> Líneas tenues: estructura de LINK</span><span>Líneas tierra: modelo compartido registrado</span><span>{business ? 'Contexto: '+business.name : 'Contexto: todo LINK'}</span></div>

        </div>
      </div>
      <span className="conchaAnnouncement" role="status" aria-live="polite">{business ? `${business.name} en el centro de la Concha` : 'Vista completa de LINK'}</span>
    </section>
  );
}
