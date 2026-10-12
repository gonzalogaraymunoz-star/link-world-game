"use client";

import styles from "./FunnelApparatusMap.module.css";

const STAGES = [
  ["marketing", "MAR"],
  ["ventas", "Venta"],
  ["cierre", "Cierre"],
  ["onboarding", "Boarding"],
  ["entrega", "Operaciones"],
  ["postventa", "Postventa"]
];

const APPARATUS = {
  link_rrss: { label: "LINK RRSS", href: business =>
    "https://linkrrss.gonzalogaraymunoz.workers.dev/?business=" + encodeURIComponent(business.id) + "&section=home" },
  link_commerce: { label: "LINK Commerce", href: business =>
    business.slug === "callatar"
      ? "https://link-commerce-callatar.gonzalogaraymunoz.workers.dev/flash-botox"
      : business.slug === "taxi-hotel"
        ? "https://taxihotel.vercel.app/"
        : business.slug === "lama-travelers"
          ? "https://lamatravelers.com/"
          : null },
  "he-link-ventas": { label: "LINK Ventas", href: () => "https://ventas-hotelexperience.vercel.app/" },
  "he-sales-ops-handoff": { label: "Venta → Operación", href: () => "https://ventas-hotelexperience.vercel.app/" },
  "he-operations": { label: "Hotel Experience · Operaciones", href: () => "https://hotel-experience.vercel.app/" },
  "link-conciertos": { label: "LINK Conciertos", href: () => "https://link-conciertos.vercel.app/" },
  fin: { label: "LINK FIN", href: () => null }
};

const STATUS = {
  activo: "Registrado activo",
  conectado: "Conectado",
  segun_reserva: "Según la reserva",
  web_existente: "Web existente",
  landing_propia_activa_integracion_pendiente: "Landing activa · integración pendiente",
  web_propia_activa_integracion_pendiente: "Web activa · integración pendiente",
  conectado_campana_pendiente: "Canal conectado · campaña pendiente",
  campana_pendiente: "Campaña pendiente",
  propuesto: "Propuesto",
  por_construir: "Por construir",
  por_configurar: "Por configurar",
  preview_no_operativo: "Vista previa · no operativo",
  pendiente: "Pendiente",
  cobro_pendiente: "Pasarela pendiente",
  regla_por_confirmar: "Regla por confirmar"
};

function stateClass(value) {
  if (["activo", "conectado", "web_existente"].includes(value)) return styles.ready;
  if (["propuesto", "pendiente", "por_construir", "por_configurar", "cobro_pendiente", "regla_por_confirmar"].includes(value)) return styles.pending;
  return styles.partial;
}

/**
 * Read-only projection from the business's canonical owned_facts in Supabase.
 * A process association is NOT proof that its integration or payment flow is live.
 * Keep the six Concha stages and reuse existing applications; never duplicate a tool.
 */
export default function FunnelApparatusMap({ business }) {
  const map = business?.owned_facts?.funnel_stage_apparatus_2026_10_11;
  const connections = Array.isArray(map?.connections) ? map.connections : [];
  if (!business) return null;

  return (
    <section className={styles.root} aria-label="Procesos y aparatos de la célula">
      <header className={styles.heading}>
        <div>
          <span className={styles.kicker}>FICHA MAESTRA · CONCHA</span>
          <h3>Procesos y aparatos del embudo</h3>
          <p>Qué hace cada etapa, qué aparato comparte con LINK y qué falta activar.</p>
        </div>
        <span className={styles.counter}>{connections.length} relaciones registradas</span>
      </header>
      {connections.length ? (
        <div className={styles.grid}>
          {STAGES.map(([key, label], index) => {
            const rows = connections.filter(row => row.stage_key === key);
            return (
              <article className={styles.card} key={key}>
                <div className={styles.stageTitle}><small>0{index + 1}</small><b>{label}</b></div>
                {rows.length ? rows.map((row, index) => {
                  const apparatus = APPARATUS[row.apparatus_key] || { label: row.apparatus_key };
                  const href = typeof apparatus.href === "function" ? apparatus.href(business) : null;
                  const status = row.status || "pendiente";
                  return (
                    <div key={row.apparatus_key + index} className={styles.relation}>
                      <div className={styles.apparatusLine}>
                        <strong>{apparatus.label}</strong>
                        <span className={stateClass(status)}>{STATUS[status] || status.replaceAll("_", " ")}</span>
                      </div>
                      <p>{row.process || "Proceso por documentar."}</p>
                      {href ? <a href={href} target="_blank" rel="noopener noreferrer">{status === "preview_no_operativo" ? "Abrir vista previa ↗" : "Abrir herramienta ↗"}</a> : null}
                    </div>
                  );
                }) : <p className={styles.empty}>Todavía sin relación documentada en este mapeo.</p>}
              </article>
            );
          })}
        </div>
      ) : <p className={styles.empty}>Esta célula aún no tiene un mapa de procesos y aparatos registrado en Supabase.</p>}
      <p className={styles.note}>Una asociación documentada no confirma que la herramienta esté operativa. Las ventas, pagos y conexiones requieren evidencia propia.</p>
    </section>
  );
}
