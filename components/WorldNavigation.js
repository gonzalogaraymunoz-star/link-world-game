"use client";
import { useState } from 'react';
import { DIMENSION_GROUPS, DIMENSIONS } from '../lib/world-navigation.mjs';

const paths = {
  orbit: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0',
  cycle: 'M4 9a8 8 0 0 1 14-3l2 2M20 3v5h-5M20 15a8 8 0 0 1-14 3l-2-2M4 21v-5h5',
  grid: 'M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z',
  signal: 'M3 13h4l3-8 4 14 3-6h4',
  branch: 'M6 3v12a6 6 0 0 0 6 6M6 9h6a6 6 0 0 0 6-6M18 3v6M12 18v3',
  settings: 'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',
  chevron: 'M9 5l7 7-7 7', close: 'M6 6l12 12M18 6L6 18', panel:'M3 4h18v16H3zM15 4v16',
  evidence:'M6 3h9l3 3v15H6zM9 11h6M9 15h6', attention:'M12 4L2 21h20L12 4zM12 10v4M12 17v1', history:'M3 4v5h5M3 9a9 9 0 1 1 0 6M12 7v5l3 2'
};
export function LinkIcon({name='orbit'}) { return <svg className="linkIcon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.orbit}/></svg>; }

export default function WorldNavigation({view,collapsed,onToggle,onNavigate}) {
  const [open,setOpen] = useState('territorio');
  const activeGroup = DIMENSIONS[view]?.group;
  return <aside className={`worldNavigation ${collapsed?'isFolded':''}`}>
    <button className="navFold" onClick={onToggle} aria-label={collapsed?'Abrir navegación':'Plegar navegación'} aria-expanded={!collapsed}><LinkIcon name="panel"/>{!collapsed?<span>Dimensiones</span>:null}</button>
    <nav aria-label="Dimensiones de LINK">
      {DIMENSION_GROUPS.map(g=><div className="navGroup" key={g.id}>
        <button className={`navGroupToggle ${activeGroup===g.id?'groupActive':''}`} title={g.label} aria-label={g.label} aria-expanded={!collapsed&&(open===g.id||activeGroup===g.id)} onClick={()=>{if(collapsed){onToggle();setOpen(g.id);}else setOpen(open===g.id?'':g.id);}}><LinkIcon name={g.icon}/><span>{g.label}</span></button>
        {!collapsed&&(open===g.id||activeGroup===g.id)?<div className="navGroupItems">{g.items.map(([id,label])=><button key={id} className={view===id?'active':''} aria-current={view===id?'page':undefined} onClick={()=>onNavigate(id)}><span>{label}</span>{view===id?<i/>:null}</button>)}</div>:null}
      </div>)}
    </nav>
    {!collapsed?<div className="navFoot">Un organismo.<br/>Múltiples perspectivas.</div>:null}
  </aside>;
}
