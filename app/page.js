const nodes = [
  { name: "LAMA", type: "Turismo", status: "Activo", x: "31%", y: "42%" },
  { name: "Hotel Experience", type: "Hotelería", status: "Activo", x: "59%", y: "35%" },
  { name: "Caracol", type: "Gastronomía", status: "Activo", x: "49%", y: "64%" }
];

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
        <div className="mapPlaceholder">
          <div className="mapGrid" />
          <div className="mapLabel">
            <span>BASE TERRITORIAL</span>
            <strong>Google Maps se conecta aquí</strong>
            <small>El mapa real será el suelo; LINK será la capa jugable.</small>
          </div>

          <div className="route routeOne" />
          <div className="route routeTwo" />

          {nodes.map((node) => (
            <article
              className="node"
              key={node.name}
              style={{ left: node.x, top: node.y }}
            >
              <span className="pulse" />
              <div className="nodeCard">
                <b>{node.name}</b>
                <small>{node.type}</small>
                <em>{node.status}</em>
              </div>
            </article>
          ))}
        </div>

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
            <p>Conectar Google Maps y ubicar el primer negocio LINK sobre su coordenada real.</p>
            <div className="progress"><i /></div>
            <small>Fase 1 · infraestructura</small>
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
        <span>Google Maps · pendiente</span>
        <span>Supabase · siguiente capa</span>
      </footer>
    </main>
  );
}
