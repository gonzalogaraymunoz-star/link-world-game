import TerritoryMap from "../components/TerritoryMap";

export default function Home() {
  return (
    <main className="world">
      <header className="topbar">
        <div>
          <span className="eyebrow">LINK WORLD</span>
          <h1>Territorio</h1>
        </div>
        <nav>
          <button className="active">Mapa</button>
          <button>Red</button>
          <button>Eventos</button>
          <button>Economía</button>
        </nav>
        <div className="place">San Pedro de Atacama · Laboratorio 01</div>
      </header>

      <section className="stage">
        <TerritoryMap />

        <aside className="sidePanel">
          <div className="panelHead">
            <span>Territorio activo</span>
            <strong>San Pedro</strong>
          </div>

          <div className="metricGrid">
            <div><b>3</b><span>negocios LINK</span></div>
            <div><b>01</b><span>territorio</span></div>
            <div><b>0</b><span>ciudades conectadas</span></div>
            <div><b>1</b><span>misión inicial</span></div>
          </div>

          <div className="mission">
            <span>MISIÓN 001</span>
            <h2>Activar territorio real</h2>
            <p>Usar Google Maps como suelo del juego y montar encima la capa LINK: negocios, asociaciones, eventos y crecimiento.</p>
            <div className="progress"><i /></div>
            <small>Fase 1 · territorio conectado</small>
          </div>

          <div className="nextLayer">
            <span>SIGUIENTE CAPA</span>
            <strong>Reconocer negocios reales</strong>
            <p>Tomaremos los lugares del ecosistema y los vincularemos por Place ID, sin inventar ubicaciones.</p>
          </div>

          <div className="legend">
            <span><i className="dot activeDot" /> LINK activo</span>
            <span><i className="dot opportunityDot" /> oportunidad</span>
            <span><i className="dot lockedDot" /> territorio bloqueado</span>
          </div>
        </aside>
      </section>

      <footer>
        <span>MICELIO · conectado</span>
        <span>Google Maps · conectado</span>
        <span>Supabase · siguiente capa</span>
      </footer>
    </main>
  );
}
