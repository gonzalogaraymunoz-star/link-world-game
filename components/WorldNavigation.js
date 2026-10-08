"use client";

import { buildControlUrl, buildGameUrl, contextFromBusiness } from "../lib/link-app-context.mjs";

const paths = {
  orbit: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0",
  map: "M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2Z M9 4v14 M15 6v14",
  grid: "M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z",
  play: "M8 5v14l11-7Z",
  settings: "M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6",
  panel: "M3 4h18v16H3zM15 4v16"
};

export function LinkIcon({ name = "orbit" }) {
  return (
    <svg className="linkIcon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name] || paths.orbit} />
    </svg>
  );
}

const WORLD_ITEMS = [
  ["concha", "Organismo", "orbit"],
  ["mundo", "Mapa físico", "map"],
  ["negocios", "Células", "grid"]
];

export default function WorldNavigation({ view, collapsed, onToggle, onNavigate, business }) {
  const context = contextFromBusiness(business, {
    stage: ["marketing","ventas","cierre","onboarding","entrega","postventa"].includes(view) ? view : null,
    focus: view
  });

  return (
    <aside className={`worldNavigation ${collapsed ? "isFolded" : ""}`}>
      <button className="navFold" onClick={onToggle} aria-label={collapsed ? "Abrir navegación" : "Plegar navegación"} aria-expanded={!collapsed}>
        <LinkIcon name="panel" />
        {!collapsed ? <span>LINK WORLD</span> : null}
      </button>

      <nav aria-label="Navegación de LINK WORLD">
        <div className="navGroup">
          {!collapsed ? <div className="navGroupLabel">MUNDO</div> : null}
          <div className="navGroupItems worldPrimaryNav">
            {WORLD_ITEMS.map(([id,label,icon]) => (
              <button key={id} className={view === id ? "active" : ""} aria-current={view === id ? "page" : undefined} onClick={() => onNavigate(id)}>
                <LinkIcon name={icon} />
                {!collapsed ? <span>{label}</span> : null}
                {view === id && !collapsed ? <i /> : null}
              </button>
            ))}
          </div>
        </div>

        <div className="navGroup appHandoffGroup">
          {!collapsed ? <div className="navGroupLabel">CONTINUAR</div> : null}
          <a className="appHandoff game" href={buildGameUrl(context,"world")} title="Abrir LINK WORLD GAME">
            <LinkIcon name="play" />
            {!collapsed ? <span><b>GAME</b><small>Estabilizar negocio</small></span> : null}
          </a>
          <a className="appHandoff finance" href="/fin/" title="Abrir LINK FIN · Mesa Ana">
            <LinkIcon name="grid" />
            {!collapsed ? <span><b>FIN</b><small>Control financiero · Ana</small></span> : null}
          </a>
          <a className="appHandoff control" href={buildControlUrl(context,"world")} title="Abrir LINK CONTROL CENTRAL">
            <LinkIcon name="settings" />
            {!collapsed ? <span><b>CONTROL</b><small>Gobernar y ejecutar</small></span> : null}
          </a>
        </div>
      </nav>

      {!collapsed ? <div className="navFoot">WORLD muestra.<br/>GAME desarrolla.<br/>CONTROL gobierna.</div> : null}
    </aside>
  );
}
