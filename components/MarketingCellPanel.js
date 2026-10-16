"use client";

/**
 * Célula transversal de marketing de LINK.
 * Es una vista explicativa: no atribuye personal ni acuerdos a un cliente
 * sin un convenio verificado. El trabajo y las evidencias siguen en origen.
 */
const ROLES = [
  { initials: "LK", name: "LINK Digital", role: "Dirección y relación comercial", work: "Escucha al cliente, define alcance, presupuesto y compromisos. Prioriza, aprueba entregables y comunica resultados." },
  { initials: "AR", name: "Anahís Riquelme", role: "Dirección de marketing", work: "Traduce objetivos en estrategia, línea editorial y pauta mensual. Coordina producción, edición, publicación y criterio técnico." },
  { initials: "JS", name: "Jorge Soto", role: "Producción audiovisual local", work: "Registra fotografías y videos en terreno siguiendo la pauta acordada. Entrega material para revisión y edición." },
  { initials: "ED", name: "Equipo de edición", role: "Postproducción y formatos", work: "Edita piezas, adapta formatos y prepara versiones aprobables. La asignación concreta depende de cada acuerdo." },
  { initials: "AI", name: "ChatGPT + LINK", role: "Análisis y documentación", work: "Ordena evidencia, compara resultados de Zernio mediante LINK RRSS, prepara borradores y conserva aprendizajes. No sustituye decisiones humanas." }
];

const STEPS = [
  ["01", "Escuchar", "LINK conversa con el cliente y recoge objetivos, expectativas y restricciones."],
  ["02", "Diseñar", "Anahís plantea estrategia y pauta editorial; LINK valida el alcance comercial."],
  ["03", "Producir", "Jorge filma o fotografía en terreno; edición transforma el material siguiendo la pauta."],
  ["04", "Publicar", "El equipo responsable programa y publica; Zernio gestiona canales y registra datos."],
  ["05", "Interpretar", "LINK RRSS consulta señales; ChatGPT prepara análisis y preguntas, sin inventar métricas."],
  ["06", "Alinear y presentar", "LINK y Anahís revisan el mes y acuerdan el relato antes de publicar el HTML del cliente."]
];

const CONNECTIONS = [
  { name: "LINK RRSS", detail: "Lectura de canales, publicaciones e indicadores provenientes de Zernio.", href: "https://linkrrss.gonzalogaraymunoz.workers.dev/" },
  { name: "LINK TASK", detail: "Tareas, responsables, fechas y evidencia del trabajo; no duplicar fichas.", href: "https://link-task.gonzalogaraymunoz.workers.dev/" },
  { name: "Núcleo Digital", detail: "Cliente primero: acuerdo, vínculos, informe mensual e historial.", href: "https://linkdigital.gonzalogaraymunoz.workers.dev/nucleo" },
  { name: "LINK Commerce", detail: "Superficie comercial para captar y convertir, cuando el servicio esté contratado." },
  { name: "Supabase", detail: "Registros persistentes y relaciones con el cliente, sin completar formularios duplicados." },
  { name: "Zernio", detail: "Plataforma externa para operación de redes y fuente de datos." }
];

function Group({ number, title, subtitle, children }) {
  return <details className="marketingCellFold">
    <summary>
      <span className="marketingCellFoldNum">{number}</span>
      <span className="marketingCellFoldName"><b>{title}</b><small>{subtitle}</small></span>
      <span className="marketingCellFoldArrow" aria-hidden="true">+</span>
    </summary>
    <div className="marketingCellFoldContent">{children}</div>
  </details>;
}

export default function MarketingCellPanel({business}) {
  return <section className="marketingCellShell" aria-label="Célula transversal de marketing LINK">
    <details className="marketingCellOuter">
      <summary>
        <span className="marketingCellEmblem" aria-hidden="true">◎</span>
        <span className="marketingCellHeading">
          <small>CÉLULA TRANSVERSAL · LINK WORLD</small>
          <b>Marketing · personas y método</b>
          <span>LINK Digital · Anahís · Jorge Soto · edición · ChatGPT</span>
        </span>
        <span className="marketingCellOuterAction">Explorar <span aria-hidden="true">⌄</span></span>
      </summary>
      <div className="marketingCellInner">
        <p className="marketingCellLead">Personas que toman decisiones; herramientas que conectan; un portafolio HTML distinto para cada cliente, todos los meses.</p>
        <p className="marketingCellScope">Estructura de referencia de LINK Digital. Los responsables, proveedores y alcances se asignan por cliente según sus acuerdos; no se presupone que el equipo opere para <b>{business?.name || "todos los negocios"}</b>.</p>

        <div className="marketingCellFoldList">
          <Group number="01" title="Quién hace qué" subtitle="El equipo humano dirige el trabajo; LINK coordina">
            <div className="marketingCellPeople">
              {ROLES.map(person=><article className="marketingCellPerson" key={person.initials}>
                <span className="marketingCellAvatar" aria-hidden="true">{person.initials}</span>
                <div><b>{person.name}</b><small>{person.role}</small><p>{person.work}</p></div>
              </article>)}
            </div>
          </Group>

          <Group number="02" title="Cómo trabajamos" subtitle="Seis movimientos, una reunión mensual">
            <div className="marketingCellSteps">{STEPS.map(([n,title,description])=>
              <article key={n}><span>{n}</span><div><b>{title}</b><p>{description}</p></div></article>
            )}</div>
            <p className="marketingCellRule"><b>Puerta editorial:</b> ningún informe mensual se publica sin análisis de datos, reunión LINK + Anahís y criterios acordados.</p>
          </Group>

          <Group number="03" title="Cómo se comunican las herramientas" subtitle="Una fuente por función; sin duplicar información">
            <div className="marketingCellConnectors">{CONNECTIONS.map(item=>
              <div className="marketingCellConnector" key={item.name}>
                <div><b>{item.name}</b><p>{item.detail}</p></div>
                {item.href?<a href={item.href} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${item.name}`}>Abrir ↗</a>:<span>Fuente</span>}
              </div>
            )}</div>
          </Group>

          <Group number="04" title="Qué recibe el cliente" subtitle="Un álbum de marketing, no el tablero de la agencia">
            <div className="marketingCellOutput">
              <span>CLIENTE → MES → HTML</span>
              <h3>La vida de su marketing.</h3>
              <p>Trabajo realizado, publicaciones, métricas verificadas, interpretación, aprendizajes y próximos movimientos. Se conserva el HTML de cada periodo y se adapta la línea editorial al cliente.</p>
              <a href="https://linkdigital.gonzalogaraymunoz.workers.dev/informes/caracol/2026-09" target="_blank" rel="noopener noreferrer">Ver el informe de Caracol ↗</a>
            </div>
          </Group>
        </div>

        <div className="marketingCellFooter">LINK coordina y conserva contexto · Anahís alinea la estrategia · Jorge registra el territorio · Zernio aporta evidencia · el cliente recibe una historia útil.</div>
      </div>
    </details>
  </section>;
}
