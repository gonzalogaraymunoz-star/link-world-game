"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { hasSupabaseConfig, supabase } from "../lib/supabase";

const MENUS = [
  ["inicio", "Inicio", "◈"],
  ["operaciones", "Operaciones", "▦"],
  ["pagar", "A pagar", "⇄"],
  ["conciliacion", "Conciliación", "✓"],
  ["documentos", "Documentos", "▤"],
  ["fuentes", "Fuentes", "⌁"]
];
const STATUS = {
  draft: "Borrador",
  needs_review: "Falta revisar",
  approval_requested: "Por aprobar",
  approved: "Aprobado",
  paid: "Pagado",
  cancelled: "Anulado",
  done: "Realizado (Excel)",
  scheduled: "Programado",
  needs_verification: "Por verificar",
  rescheduled: "Reprogramado"
};
const formatMoney = n => n === null || n === undefined || n === "" ? "Por definir" :
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Number(n));
const formatDate = s => s ? String(s).slice(0, 10).split("-").reverse().join("/") : "—";
const numberOrNull = v => v === "" || v === null || v === undefined ? null : Number(v);
const safeHttp = s => /^https:\/\/[^\s]+$/i.test(s || "") ? s : null;
const classStatus = s => ["paid", "done"].includes(s) ? "ok" : ["approved"].includes(s) ? "accent" : ["approval_requested", "needs_review", "needs_verification"].includes(s) ? "warn" : "muted";

function computeAmounts(d) {
  const amount = numberOrNull(d.tariff_amount);
  if (amount === null || !Number.isFinite(amount) || amount < 0) return null;
  const typ = d.document_type || "boleta";
  const basis = d.tariff_basis || "net";
  if (typ === "boleta") {
    const rate = numberOrNull(d.withholding_rate);
    if (rate === null || !Number.isFinite(rate) || rate < 0 || rate >= 100) return null;
    const document = basis === "net" ? Math.round(amount / (1 - rate / 100)) : Math.round(amount);
    const transfer = basis === "net" ? amount : document - Math.round(document * rate / 100);
    return { document_amount: document, withholding_amount: document - transfer, transfer_amount: transfer, company_cost: document };
  }
  if (typ === "factura") {
    const rate = numberOrNull(d.vat_rate);
    if (rate === null || !Number.isFinite(rate) || rate < 0 || rate > 100) return null;
    const document = basis === "net" ? Math.round(amount * (1 + rate / 100)) : amount;
    return { document_amount: document, withholding_amount: 0, transfer_amount: document, company_cost: document };
  }
  return { document_amount: amount, withholding_amount: 0, transfer_amount: amount, company_cost: amount };
}

function Pill({ status }) {
  return <span className={"fanaPill " + classStatus(status)}>{STATUS[status] || status || "Sin estado"}</span>;
}

function KPI({ label, value, note, tone }) {
  return <div className={"fanaKpi " + (tone || "")}>
    <span>{label}</span><strong>{value}</strong><small>{note}</small>
  </div>;
}

function Login({ onLogin, busy, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return <div className="fanaLogin">
    <div className="fanaLoginPanel">
      <div className="fanaMark">F</div>
      <span className="fanaEyebrow">LINK WORLD / FIN</span>
      <h1>Control financiero</h1>
      <p>Mesa privada de FIN y Ana. Accede con tu cuenta autorizada de LINK WORLD.</p>
      <form onSubmit={e => { e.preventDefault(); onLogin(email, password); }}>
        <label>Correo<input required type="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>Contraseña<input required type="password" value={password} onChange={e => setPassword(e.target.value)} /></label>
        <button disabled={busy} className="fanaPrimary">{busy ? "Ingresando…" : "Ingresar a FIN"}</button>
      </form>
      {error && <p className="fanaError" role="alert">{error}</p>}
      <a href="/">← Volver a LINK WORLD</a>
    </div>
  </div>;
}

function normalizeHeader(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}
function parseDelimited(text, delimiter) {
  const records = []; let cell = ""; let row = []; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === delimiter && !quoted) { row.push(cell); cell = ""; }
    else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); if (row.some(x => x.trim())) records.push(row);
      row = []; cell = "";
    } else cell += ch;
  }
  row.push(cell); if (row.some(x => x.trim())) records.push(row);
  return records;
}
function parseDate(v) {
  const s = String(v || "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (m) return m[3] + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0");
  return null;
}

export default function FinDesk() {
  const [session, setSession] = useState(null);
  const [checked, setChecked] = useState(false);
  const [role, setRole] = useState("none");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [businesses, setBusinesses] = useState([]);
  const [bizId, setBizId] = useState("");
  const [operations, setOperations] = useState([]);
  const [payables, setPayables] = useState([]);
  const [sources, setSources] = useState([]);
  const [summary, setSummary] = useState([]);
  const [section, setSection] = useState("inicio");
  const [period, setPeriod] = useState("2026-10");
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState(null);
  const [draft, setDraft] = useState({});
  const [collapsed, setCollapsed] = useState(false);
  const [importing, setImporting] = useState(false);

  const canEdit = role === "operator" || role === "director";
  const director = role === "director";

  const load = useCallback(async () => {
    if (!supabase) return;
    const [b, o, p, s, f] = await Promise.all([
      supabase.from("link_world_businesses").select("id,name,slug").order("name"),
      supabase.from("fin_ana_operations").select("*").order("service_date", { ascending: false }).limit(1000),
      supabase.from("fin_ana_payables").select("*").order("cutoff_date", { ascending: true }).limit(1000),
      supabase.from("fin_ana_sources").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("link_fin_real_summary_v").select("business_id,income_gross,income_collected,net_real").limit(100)
    ]);
    const critical = [b, o, p, s].find(x => x.error);
    if (critical) throw critical.error;
    setBusinesses(b.data || []);
    setOperations(o.data || []);
    setPayables(p.data || []);
    setSources(s.data || []);
    setSummary(f.error ? [] : f.data || []);
    setBizId(current => current || (b.data || []).find(x => x.slug === "hotel-experience")?.id || b.data?.[0]?.id || "");
  }, []);

  const initialize = useCallback(async () => {
    if (!supabase) { setChecked(true); return; }
    setError("");
    const { data: auth } = await supabase.auth.getSession();
    const sess = auth?.session || null;
    setSession(sess);
    if (sess) {
      const rr = await supabase.rpc("fin_ana_my_role");
      const who = rr.error ? "none" : rr.data || "none";
      setRole(who);
      if (who !== "none") {
        try { await load(); } catch (e) { setError("No se pudo cargar FIN: " + (e.message || String(e))); }
      }
    } else setRole("none");
    setChecked(true);
  }, [load]);

  useEffect(() => {
    initialize();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") window.setTimeout(initialize, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [initialize]);

  const login = async (email, password) => {
    setBusy(true); setError("");
    const { error: e } = await supabase.auth.signInWithPassword({ email, password });
    if (e) setError(e.message);
    else await initialize();
    setBusy(false);
  };
  const refresh = async () => {
    setBusy(true); setError("");
    try { await load(); setNotice("Datos actualizados desde FIN."); }
    catch (e) { setError(e.message || String(e)); }
    finally { setBusy(false); }
  };

  const targetOperations = useMemo(() => operations.filter(o =>
    (!bizId || o.business_id === bizId) &&
    (period === "all" || String(o.service_date || "").startsWith(period)) &&
    (!query || [o.booking_code, o.client_name, o.service_name, o.supplier_name].some(x => String(x || "").toLowerCase().includes(query.toLowerCase())))
  ), [operations, bizId, period, query]);
  const targetPayables = useMemo(() => payables.filter(p => {
    if (bizId && p.business_id !== bizId) return false;
    const op = operations.find(o => o.id === p.operation_id);
    if (period !== "all" && !String(op?.service_date || p.cutoff_date || "").startsWith(period)) return false;
    if (query && ![p.beneficiary, p.document_number, op?.service_name, op?.client_name].some(x => String(x || "").toLowerCase().includes(query.toLowerCase()))) return false;
    return true;
  }), [payables, operations, bizId, period, query]);
  const byOperation = useMemo(() => new Map(operations.map(o => [o.id, o])), [operations]);
  const amountKnown = targetPayables.filter(p => p.tariff_amount !== null).reduce((a, p) => a + Number(p.transfer_amount || 0), 0);
  const tariffsMissing = targetPayables.filter(p => p.tariff_amount === null).length;
  const approvalCount = targetPayables.filter(p => p.status === "approval_requested").length;
  const paidCount = targetPayables.filter(p => p.status === "paid").length;
  const proofMissing = targetPayables.filter(p => !p.document_number || (p.status === "paid" && !p.receipt_number)).length;
  const source = sources.find(x => x.source_ref === "gmail:1a11d553bc460daa");

  const openPay = p => { setDrawer({ type: "payable", id: p.id }); setDraft({ ...p }); setNotice(""); };
  const openOp = o => { setDrawer({ type: "operation", id: o.id }); setDraft({ ...o }); setNotice(""); };
  const change = (field, val) => setDraft(v => ({ ...v, [field]: val }));
  const saveOperation = async () => {
    setBusy(true); setError(""); setNotice("");
    const payload = {
      booking_code: draft.booking_code || null,
      service_status: draft.service_status || "needs_verification",
      entry_cost: numberOrNull(draft.entry_cost),
      supplier_cost: numberOrNull(draft.supplier_cost),
      notes: draft.notes || null
    };
    const { error: e } = await supabase.from("fin_ana_operations").update(payload).eq("id", drawer.id);
    if (e) setError(e.message);
    else { setDrawer(null); await refresh(); setNotice("Operación actualizada."); }
    setBusy(false);
  };
  const savePayable = async (requestedStatus) => {
    const status = requestedStatus || draft.status || "needs_review";
    const val = numberOrNull(draft.tariff_amount);
    const computed = computeAmounts(draft);
    if (["approval_requested", "approved", "paid"].includes(status) && (val === null || !computed || !draft.document_number?.trim())) {
      setError("Para solicitar o aprobar necesitas tarifa, tasa aplicable y número de boleta/factura."); return;
    }
    if (status === "paid" && (!draft.receipt_number?.trim() || !draft.payment_date)) {
      setError("No se puede registrar como pagado sin fecha y número de comprobante."); return;
    }
    if ((status === "approved" || status === "paid") && !director) { setError("Solo Dirección puede aprobar o registrar pagos."); return; }
    setBusy(true); setError("");
    const fields = ["beneficiary", "supplier_rut", "cutoff_date", "tariff_basis", "document_type", "document_number", "document_url", "payment_date", "receipt_number", "receipt_url", "notes"];
    const payload = Object.fromEntries(fields.map(key => [key, draft[key] || null]));
    payload.tariff_amount = val;
    payload.withholding_rate = numberOrNull(draft.withholding_rate);
    payload.vat_rate = numberOrNull(draft.vat_rate);
    payload.status = status;
    Object.assign(payload, computed || { document_amount: null, withholding_amount: null, transfer_amount: null, company_cost: null });
    const { error: e } = await supabase.from("fin_ana_payables").update(payload).eq("id", drawer.id);
    if (e) setError(e.message);
    else { setDrawer(null); await refresh(); setNotice("Liquidación guardada. Estado: " + (STATUS[status] || status)); }
    setBusy(false);
  };
  const makePayable = async o => {
    if (!canEdit) return;
    setBusy(true); setError("");
    const { data, error: e } = await supabase.from("fin_ana_payables")
      .insert({ business_id: o.business_id, operation_id: o.id, beneficiary: o.supplier_name || "Proveedor por definir", status: "needs_review" })
      .select("*").single();
    if (e) setError(e.message);
    else { await refresh(); openPay(data); }
    setBusy(false);
  };
  const importCsv = async file => {
    if (!file || !canEdit || !bizId) return;
    if (!/\.(csv|tsv|txt)$/i.test(file.name)) { setError("Esta versión importa CSV/TSV. En Excel: Archivo → Guardar como → CSV UTF-8."); return; }
    setImporting(true); setError("");
    try {
      const contents = await file.text();
      const lines = parseDelimited(contents, file.name.endsWith(".tsv") ? "\t" : contents.split("\n")[0].includes(";") ? ";" : ",");
      if (lines.length < 2) throw Error("Archivo sin filas de servicios.");
      const headers = lines[0].map(normalizeHeader);
      const find = (...options) => headers.findIndex(h => options.some(o => h === o || h.includes(o)));
      const at = (row, ...names) => { const i = find(...names); return i >= 0 ? row[i] : ""; };
      if (find("fecha") < 0 || find("servicio") < 0) throw Error("Se requieren al menos las columnas Fecha y Servicio.");
      const rows = lines.slice(1, 501).map((row, idx) => {
        const service_date = parseDate(at(row, "fecha"));
        const service_name = at(row, "servicio")?.trim();
        if (!service_date || !service_name) throw Error("Fila " + (idx + 2) + ": fecha o servicio inválido.");
        const status = normalizeHeader(at(row, "estado"));
        return {
          business_id: bizId, source_row: idx, service_date, service_name,
          time_label: at(row, "hora") || null,
          booking_code: at(row, "codreserva", "codigoreserva") || null,
          client_name: at(row, "cliente") || null,
          pax_count: numberOrNull(at(row, "npax", "numeropax")),
          modality: at(row, "modalidad") || null,
          supplier_name: at(row, "guiaproveedor", "guia") || null,
          vehicle: at(row, "vehiculo") || null,
          rate_category: at(row, "categoriatarifa") || null,
          service_status: status === "realizado" ? "done" : status === "reprogramado" ? "rescheduled" : "needs_verification",
          entry_cost: numberOrNull(at(row, "entradas")),
          notes: "Importado desde " + file.name + ". Validación pendiente."
        };
      });
      const ref = "csv:" + file.name + ":" + file.size + ":" + file.lastModified;
      const existing = sources.find(s => s.source_ref === ref);
      if (existing) throw Error("Este archivo ya fue importado. Revisa Fuentes para evitar duplicados.");
      const { data: src, error: srcErr } = await supabase.from("fin_ana_sources")
        .insert({ name: file.name, source_type: "csv", source_ref: ref, period: period === "all" ? null : period, notes: "Importación de servicios: no registra pagos." }).select("id").single();
      if (srcErr) throw srcErr;
      const { error: rowErr } = await supabase.from("fin_ana_operations").insert(rows.map(r => ({ ...r, source_id: src.id })));
      if (rowErr) throw rowErr;
      await load();
      setNotice(rows.length + " servicios importados. Revisa tarifas y conciliación antes de aprobar.");
    } catch (e) { setError(e.message || String(e)); }
    finally { setImporting(false); }
  };

  if (!hasSupabaseConfig) return <div className="finDesk"><div className="fanaLogin"><div className="fanaLoginPanel"><h1>FIN necesita configuración</h1><p>Faltan variables públicas de Supabase en el despliegue. No se exponen claves privadas.</p><a href="/">← LINK WORLD</a></div></div></div>;
  if (!checked) return <div className="finDesk fanaLoading">Verificando acceso privado a FIN…</div>;
  if (!session) return <div className="finDesk"><Login onLogin={login} busy={busy} error={error}/></div>;
  if (role === "none") return <div className="finDesk"><div className="fanaLogin"><div className="fanaLoginPanel"><div className="fanaMark">F</div><h1>Acceso no asignado</h1><p>La Mesa FIN exige autorización individual. Dirección debe habilitar tu usuario, no se comparten contraseñas.</p><button onClick={() => supabase.auth.signOut()} className="fanaSecondary">Cerrar sesión</button><a href="/">← LINK WORLD</a></div></div></div>;

  const selectedBusiness = businesses.find(b => b.id === bizId);
  const currentSummary = summary.find(s => s.business_id === bizId);
  const payableGroups = Object.entries(targetPayables.reduce((m, p) => {
    const key = p.cutoff_date || "Sin corte";
    (m[key] ||= []).push(p);
    return m;
  }, {})).sort(([a], [b]) => a.localeCompare(b));
  const opWithoutPay = targetOperations.filter(o => !payables.some(p => p.operation_id === o.id)).length;
  const inputFile = <label className="fanaUpload">Importar servicios CSV <input type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values" disabled={importing || !canEdit} onChange={e => { importCsv(e.target.files?.[0]); e.target.value = ""; }} /></label>;

  return <div className={"finDesk " + (collapsed ? "fanaCollapsed" : "")}>
    <aside className="fanaSidebar">
      <a className="fanaLogo" href="/"><span className="fanaMark">F</span><span className="fanaLogoWords"><b>LINK FIN</b><small>Control financiero</small></span></a>
      <button className="fanaCollapse" onClick={() => setCollapsed(v => !v)} title="Contraer menú">{collapsed ? "☰" : "☷"}</button>
      <span className="fanaSideLabel">MESA DE TRABAJO</span>
      <nav className="fanaNav">{MENUS.map(([id, name, glyph]) =>
        <button key={id} className={section === id ? "active" : ""} onClick={() => { setSection(id); setDrawer(null); }}>
          <span className="fanaGlyph">{glyph}</span><span className="fanaNavLabel">{name}</span>
        </button>)}</nav>
      <div className="fanaSideFoot"><span className="fanaRole">{director ? "Dirección FIN" : role === "operator" ? "Operador FIN" : "Consulta FIN"}</span><a href="/">↖ <span className="fanaNavLabel">LINK WORLD</span></a><button onClick={() => supabase.auth.signOut()}>⇥ <span className="fanaNavLabel">Salir</span></button></div>
    </aside>
    <main className="fanaMain">
      <header className="fanaTopbar"><div><span className="fanaEyebrow">LINK WORLD / FIN / MESA ANA</span><strong>{MENUS.find(x => x[0] === section)?.[1]}</strong></div><div className="fanaTopActions"><span className="fanaLive">● Datos persistentes</span><button disabled={busy} onClick={refresh} className="fanaSecondary">↻ Actualizar</button></div></header>
      <div className="fanaContent">
        <div className="fanaTitle"><div><span className="fanaEyebrow">FIN · DIRECCIÓN Y OPERACIÓN HUMANA</span><h1>Control financiero</h1><p>Operación → obligación → documento → autorización → pago comprobado. Sin montos inventados.</p></div><span className="fanaBadge">Mesa de Ana</span></div>
        <div className="fanaFilters"><label>Negocio <select value={bizId} onChange={e => setBizId(e.target.value)}>{businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label>Período <select value={period} onChange={e => setPeriod(e.target.value)}><option value="2026-10">Octubre 2026</option><option value="2026-09">Septiembre 2026</option><option value="all">Todo el historial</option></select></label><label className="fanaSearch">Buscar <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Reserva, proveedor, tour, documento…" /></label></div>
        {error && <div className="fanaError" role="alert">{error} <button onClick={() => setError("")}>×</button></div>}
        {notice && <div className="fanaNotice" role="status">{notice} <button onClick={() => setNotice("")}>×</button></div>}
        <div className="fanaKpis">
          <KPI label="Servicios registrados" value={targetOperations.length} note="Operaciones del período"/>
          <KPI label="Tarifas por completar" value={tariffsMissing} note="No equivalen a $0" tone="warning"/>
          <KPI label="Transferencias calculadas" value={formatMoney(amountKnown)} note="Importe preliminar, no desembolso"/>
          <KPI label="Esperando autorización" value={approvalCount} note={paidCount + " registrados como pagados"} tone={approvalCount ? "warning" : ""}/>
        </div>
        {section === "inicio" && <div className="fanaHomeGrid">
          <section className="fanaPanel"><div className="fanaPanelHead"><div><span className="fanaEyebrow">COLA DE ANA</span><h2>Qué necesita atención</h2></div></div>
            <button className="fanaActionRow" onClick={() => setSection("pagar")}><i className="fanaDot warn"/><span><b>{tariffsMissing} tarifas pendientes</b><small>Completar valor acordado y tratamiento tributario</small></span><strong>→</strong></button>
            <button className="fanaActionRow" onClick={() => setSection("operaciones")}><i className="fanaDot warn"/><span><b>{opWithoutPay} servicios sin liquidación</b><small>Relacionar proveedor y costo antes de pagar</small></span><strong>→</strong></button>
            <button className="fanaActionRow" onClick={() => setSection("documentos")}><i className="fanaDot"/><span><b>{proofMissing} registros sin documentación completa</b><small>Boleta o comprobante pendiente de revisar</small></span><strong>→</strong></button>
            <button className="fanaActionRow" onClick={() => setSection("pagar")}><i className="fanaDot accent"/><span><b>{approvalCount} solicitudes a Dirección</b><small>Aprobación independiente de la preparación</small></span><strong>→</strong></button>
          </section>
          <section className="fanaPanel"><div className="fanaPanelHead"><div><span className="fanaEyebrow">EVIDENCIA ECONÓMICA</span><h2>FIN · {selectedBusiness?.name || "Negocio"}</h2></div></div>
            <div className="fanaProof"><div><span>Facturado respaldado</span><strong>{formatMoney(currentSummary?.income_gross)}</strong></div><div><span>Caja verificada</span><strong>{formatMoney(currentSummary?.income_collected)}</strong></div><div><span>Neto real documentado</span><strong>{formatMoney(currentSummary?.net_real)}</strong></div></div><p className="fanaHint">Estos montos provienen de FIN central. Las liquidaciones preparadas no se consideran caja ni pagos reales.</p>
          </section>
          <section className="fanaPanel fanaWide"><div className="fanaPanelHead"><div><span className="fanaEyebrow">CORTES SEMANALES</span><h2>Próximas liquidaciones</h2></div><button className="fanaTextButton" onClick={() => setSection("pagar")}>Ver toda la mesa →</button></div>
          {payableGroups.length ? payableGroups.map(([date, rows]) => <button className="fanaCut" key={date} onClick={() => setSection("pagar")}><span><b>{formatDate(date)}</b><small>{rows.length} líneas · {rows.filter(p => p.tariff_amount === null).length} tarifas sin resolver</small></span><strong>{formatMoney(rows.reduce((s,p) => s + Number(p.transfer_amount || 0), 0))}</strong><span>→</span></button>) : <p className="fanaHint">No existen liquidaciones para este negocio y período.</p>}
          </section>
        </div>}
        {section === "operaciones" && <section className="fanaPanel"><div className="fanaPanelHead"><div><span className="fanaEyebrow">SERVICIOS / OPERACIONES</span><h2>Registro por servicio</h2></div>{canEdit && inputFile}</div><div className="fanaTableScroll"><table className="fanaTable"><thead><tr><th>Fecha</th><th>Reserva / cliente</th><th>Servicio</th><th>Guía / proveedor</th><th>Pax</th><th>Entradas</th><th>Estado</th><th>FIN</th></tr></thead><tbody>{targetOperations.map(o => <tr key={o.id} onClick={() => openOp(o)} tabIndex={0} onKeyDown={e => e.key === "Enter" && openOp(o)}><td>{formatDate(o.service_date)}<small>{o.time_label}</small></td><td><b>{o.booking_code || "Sin código"}</b><small>{o.client_name}</small></td><td>{o.service_name}<small>{o.modality}</small></td><td>{o.supplier_name || "—"}</td><td>{o.pax_count ?? "—"}</td><td>{formatMoney(o.entry_cost)}</td><td><Pill status={o.service_status}/></td><td>{payables.some(p => p.operation_id === o.id) ? "Liquidación" : "Pendiente"}</td></tr>)}</tbody></table></div>{!targetOperations.length && <div className="fanaEmpty">No hay operaciones para los filtros elegidos.</div>}</section>}
        {section === "pagar" && <div className="fanaStack"><div className="fanaPageIntro"><h2>A pagar · cortes por beneficiario</h2><p>Preparar no es aprobar. Aprobar no es pagar. Cada transferencia necesita documento y respaldo.</p></div>{payableGroups.map(([date, items]) => <section key={date} className="fanaPanel"><div className="fanaPanelHead"><div><span className="fanaEyebrow">CORTE FIN</span><h2>{formatDate(date)} · {items.length} liquidaciones</h2></div><span className="fanaBadge">{items.filter(p => p.tariff_amount === null).length} sin tarifa</span></div><div className="fanaTableScroll"><table className="fanaTable"><thead><tr><th>Beneficiario</th><th>Servicio</th><th>Tarifa líquida/bruta</th><th>Documento</th><th>Transferir</th><th>Estado</th></tr></thead><tbody>{items.map(p => <tr key={p.id} onClick={() => openPay(p)} tabIndex={0} onKeyDown={e => e.key === "Enter" && openPay(p)}><td><b>{p.beneficiary}</b><small>{p.supplier_rut || "RUT pendiente"}</small></td><td>{byOperation.get(p.operation_id)?.service_name || "Sin vínculo operativo"}<small>{formatDate(byOperation.get(p.operation_id)?.service_date)}</small></td><td>{formatMoney(p.tariff_amount)}<small>{p.tariff_basis === "net" ? "Líquida" : "Bruta"}</small></td><td>{p.document_number || "Falta documento"}</td><td>{formatMoney(p.transfer_amount)}</td><td><Pill status={p.status}/></td></tr>)}</tbody></table></div></section>)}{!payableGroups.length && <div className="fanaEmpty">No existen obligaciones en este período. Puedes crearlas desde la ficha de un servicio.</div>}</div>}
        {section === "conciliacion" && <section className="fanaPanel"><div className="fanaPanelHead"><div><span className="fanaEyebrow">CONTROL DE EXCEPCIONES</span><h2>Conciliación operativa</h2></div></div><p className="fanaHint">Se revisan las obligaciones y los comprobantes cargados. Esta mesa no marca una transferencia como bancaria o realmente conciliada por sí sola.</p><div className="fanaExceptionGrid">
          {[["Tarifas faltantes", targetPayables.filter(p => p.tariff_amount === null)],["Esperando aprobación", targetPayables.filter(p => p.status === "approval_requested")],["Documento faltante", targetPayables.filter(p => !p.document_number)],["Pagados sin URL de respaldo", targetPayables.filter(p => p.status === "paid" && !p.receipt_url)]].map(([label, rows]) => <div key={label} className="fanaException"><strong>{rows.length}</strong><span>{label}</span>{rows.slice(0, 5).map(p => <button key={p.id} onClick={() => openPay(p)}>{p.beneficiary} · {byOperation.get(p.operation_id)?.service_name || "Servicio"} →</button>)}</div>)}
        </div></section>}
        {section === "documentos" && <section className="fanaPanel"><div className="fanaPanelHead"><div><span className="fanaEyebrow">EVIDENCIA POR OBLIGACIÓN</span><h2>Boletas, facturas y comprobantes</h2></div></div><div className="fanaTableScroll"><table className="fanaTable"><thead><tr><th>Beneficiario</th><th>Documento</th><th>Fecha de pago</th><th>Comprobante</th><th>Estado</th></tr></thead><tbody>{targetPayables.map(p => <tr key={p.id} onClick={() => openPay(p)}><td>{p.beneficiary}</td><td>{p.document_number || "Pendiente"}{safeHttp(p.document_url) && <a href={p.document_url} onClick={e => e.stopPropagation()} target="_blank" rel="noopener noreferrer"> Abrir ↗</a>}</td><td>{formatDate(p.payment_date)}</td><td>{p.receipt_number || "Pendiente"}{safeHttp(p.receipt_url) && <a href={p.receipt_url} onClick={e => e.stopPropagation()} target="_blank" rel="noopener noreferrer"> Abrir ↗</a>}</td><td><Pill status={p.status}/></td></tr>)}</tbody></table></div></section>}
        {section === "fuentes" && <section className="fanaPanel"><div className="fanaPanelHead"><div><span className="fanaEyebrow">PROCEDENCIA / RESPALDO</span><h2>Origen de la información</h2></div>{canEdit && inputFile}</div><p className="fanaHint">Se conserva referencia del archivo y origen. La importación CSV añade servicios sin generar pagos automáticamente ni validar costos.</p>{sources.map(s => <div className="fanaSource" key={s.id}><div><strong>{s.name}</strong><small>{s.source_type} · {formatDate(s.created_at)} · {s.period || "Período abierto"}</small><p>{s.notes}</p></div>{s.source_ref?.startsWith("gmail:") && <a href="https://mail.google.com/mail/u/0/#all/1a11d553bc460daa" target="_blank" rel="noopener noreferrer">Correo de Ana ↗</a>}</div>)}</section>}
        <footer className="fanaFooter"><span>FIN conserva evidencia. No convierte documentos en caja ni prepara pagos automáticos.</span><span>{source ? "Origen Ana · octubre 2026" : "Sin fuente de Ana en este espacio"}</span></footer>
      </div>
    </main>
    {drawer && <div className="fanaOverlay" onMouseDown={e => { if (e.target === e.currentTarget) setDrawer(null); }}>
      <aside className="fanaDrawer" role="dialog" aria-modal="true" aria-label="Detalle FIN">
        <div className="fanaDrawerHead"><div><span className="fanaEyebrow">{drawer.type === "operation" ? "FICHA DE OPERACIÓN" : "FICHA DE LIQUIDACIÓN"}</span><h2>{drawer.type === "operation" ? draft.service_name : draft.beneficiary}</h2></div><button onClick={() => setDrawer(null)} aria-label="Cerrar">×</button></div>
        {drawer.type === "operation" ? <>
          <div className="fanaDrawerMeta"><span>{formatDate(draft.service_date)}</span><span>{draft.client_name}</span><span>{draft.supplier_name}</span></div>
          <label>Código de reserva<input disabled={!canEdit} value={draft.booking_code || ""} onChange={e => change("booking_code", e.target.value)}/></label>
          <label>Estado del servicio<select disabled={!canEdit} value={draft.service_status || ""} onChange={e => change("service_status", e.target.value)}><option value="needs_verification">Por verificar</option><option value="scheduled">Programado</option><option value="done">Realizado</option><option value="rescheduled">Reprogramado</option><option value="cancelled">Cancelado</option></select></label>
          <div className="fanaDrawerTwo"><label>Entradas CLP<input disabled={!canEdit} type="number" min="0" value={draft.entry_cost ?? ""} onChange={e => change("entry_cost", e.target.value)} placeholder="Pendiente"/></label><label>Costo proveedor CLP<input disabled={!canEdit} type="number" min="0" value={draft.supplier_cost ?? ""} onChange={e => change("supplier_cost", e.target.value)} placeholder="Pendiente"/></label></div>
          <label>Observaciones<textarea disabled={!canEdit} value={draft.notes || ""} onChange={e => change("notes", e.target.value)} rows={4}/></label>
          {canEdit && <div className="fanaDrawerActions"><button className="fanaPrimary" disabled={busy} onClick={saveOperation}>Guardar operación</button>{!payables.some(p => p.operation_id === draft.id) && <button className="fanaSecondary" disabled={busy} onClick={() => makePayable(draft)}>Crear liquidación</button>}</div>}
          <p className="fanaHint">Estado importado desde Ana; validar con Check Tour y operaciones originales.</p>
        </> : <>
          <div className="fanaDrawerMeta"><span>{byOperation.get(draft.operation_id)?.service_name || "Sin servicio"}</span><span>Corte: {formatDate(draft.cutoff_date)}</span><Pill status={draft.status}/></div>
          <label>Beneficiario<input disabled={!canEdit} value={draft.beneficiary || ""} onChange={e => change("beneficiary", e.target.value)}/></label>
          <div className="fanaDrawerTwo"><label>RUT<input disabled={!canEdit} value={draft.supplier_rut || ""} onChange={e => change("supplier_rut", e.target.value)}/></label><label>Fecha corte<input disabled={!canEdit} type="date" value={draft.cutoff_date || ""} onChange={e => change("cutoff_date", e.target.value)}/></label></div>
          <div className="fanaDrawerTwo"><label>Tarifa acordada CLP<input disabled={!canEdit} type="number" min="0" value={draft.tariff_amount ?? ""} onChange={e => change("tariff_amount", e.target.value)} placeholder="Sin tarifa"/></label><label>Base de tarifa<select disabled={!canEdit} value={draft.tariff_basis || "net"} onChange={e => change("tariff_basis", e.target.value)}><option value="net">Líquida / neta</option><option value="gross">Bruta</option></select></label></div>
          <div className="fanaDrawerTwo"><label>Documento<select disabled={!canEdit} value={draft.document_type || "boleta"} onChange={e => change("document_type", e.target.value)}><option value="boleta">Boleta de honorarios</option><option value="factura">Factura</option><option value="otro">Otro</option></select></label><label>{draft.document_type === "factura" ? "IVA %" : "Retención %"}<input disabled={!canEdit} type="number" min="0" max="99" step=".01" value={draft.document_type === "factura" ? draft.vat_rate ?? "" : draft.withholding_rate ?? ""} onChange={e => change(draft.document_type === "factura" ? "vat_rate" : "withholding_rate", e.target.value)} placeholder="Sin confirmar"/></label></div>
          <div className="fanaCalc"><span>Simulación según valores introducidos</span>{(() => { const calc = computeAmounts(draft); return <div><div><small>Monto documento</small><strong>{formatMoney(calc?.document_amount)}</strong></div><div><small>Retención</small><strong>{formatMoney(calc?.withholding_amount)}</strong></div><div><small>Transferir</small><strong>{formatMoney(calc?.transfer_amount)}</strong></div><div><small>Costo empresa</small><strong>{formatMoney(calc?.company_cost)}</strong></div></div>; })()}<p>La tasa debe verificarse para la fecha y tipo de documento. Cálculo preliminar, no orden bancaria.</p></div>
          <div className="fanaDrawerTwo"><label>Número boleta / factura<input disabled={!canEdit} value={draft.document_number || ""} onChange={e => change("document_number", e.target.value)}/></label><label>URL documento<input disabled={!canEdit} type="url" value={draft.document_url || ""} onChange={e => change("document_url", e.target.value)} placeholder="https://"/></label></div>
          <div className="fanaDrawerTwo"><label>Fecha de pago<input disabled={!director} type="date" value={draft.payment_date || ""} onChange={e => change("payment_date", e.target.value)}/></label><label>N° comprobante<input disabled={!director} value={draft.receipt_number || ""} onChange={e => change("receipt_number", e.target.value)}/></label></div>
          <label>URL comprobante<input disabled={!director} type="url" value={draft.receipt_url || ""} onChange={e => change("receipt_url", e.target.value)} placeholder="https://"/></label>
          <label>Observaciones<textarea disabled={!canEdit} rows={3} value={draft.notes || ""} onChange={e => change("notes", e.target.value)}/></label>
          {canEdit && <div className="fanaDrawerActions"><button className="fanaSecondary" disabled={busy} onClick={() => savePayable("needs_review")}>Guardar revisión</button><button className="fanaPrimary" disabled={busy} onClick={() => savePayable("approval_requested")}>Solicitar aprobación</button>{director && <><button className="fanaSecondary" disabled={busy} onClick={() => savePayable("approved")}>Aprobar</button><button className="fanaSecondary" disabled={busy} onClick={() => savePayable("paid")}>Registrar pago con evidencia</button></>}</div>}
          <p className="fanaHint">Ni aprobar ni registrar un pago ejecuta una transferencia bancaria. El pago debe haber ocurrido fuera del panel y tener respaldo verificable.</p>
        </>}
      </aside>
    </div>}
  </div>;
}
