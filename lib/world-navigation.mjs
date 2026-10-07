export const DIMENSION_GROUPS = [
  { id: 'territorio', label: 'Territorio', icon: 'orbit', items: [['concha','Organismo'],['mundo','Mapa físico'],['negocios','Células']] },
  { id: 'operacion', label: 'La Concha', icon: 'cycle', items: [['marketing','MAR'],['ventas','Venta'],['cierre','Cierre'],['onboarding','Boarding'],['entrega','Operaciones'],['postventa','Postventa']] },
  { id: 'capacidades', label: 'Capacidades', icon: 'grid', items: [['fin','FIN'],['rrss','RRSS'],['personas','Personas'],['evidencias','Evidencias'],['artefactos','Artefactos'],['evolucion','Evolución']] },
  { id: 'gobierno', label: 'Gobierno', icon: 'signal', items: [['director','Director'],['pulso','Pulso Vivo'],['nervioso','Sistema nervioso'],['hipocampo','Hipocampo'],['cortex','Cortex'],['show','LINK SHOW']] },
  { id: 'reproduccion', label: 'Reproducción', icon: 'branch', items: [['modelos','Modelos'],['genesis','Génesis'],['reproduccion','Mitosis / Meiosis']] },
  { id: 'sistema', label: 'Sistema', icon: 'settings', items: [['misiones','Misiones'],['mesas','Mesas'],['eventos','Eventos'],['conexiones','Conexiones'],['administracion','Administración']] }
];
export const DIMENSIONS = Object.fromEntries(DIMENSION_GROUPS.flatMap(g => g.items.map(([id,label]) => [id,{id,label,group:g.id,groupLabel:g.label}])));
const aliases = {economia:'fin',red:'conexiones',tableros:'mesas',cron:'pulso',memoria:'hipocampo',alertas:'director',configuracion:'administracion'};
export const canonicalDimension = value => aliases[value] || (DIMENSIONS[value] ? value : 'concha');
export function readWorldRoute(search) {
  const q = new URLSearchParams(search);
  const validId = value => /^[a-zA-Z0-9_-]{1,100}$/.test(value || '') ? value : null;
  return {dimension:canonicalDimension(q.get('dimension')),business:validId(q.get('business')),model:validId(q.get('model'))};
}
export function writeWorldRoute(search, route) {
  const q = new URLSearchParams(search);
  q.set('dimension',canonicalDimension(route.dimension));
  for (const key of ['business','model']) { if(route[key]) q.set(key,route[key]); else q.delete(key); }
  return '?' + q.toString();
}
export function scopeBusinessRows(rows, business) {
  return !business ? rows || [] : (rows || []).filter(r =>
    (business.id && (r.business_id === business.id || r.primary_business_id === business.id)) ||
    (business.global_id && r.business_global_id === business.global_id));
}
export function scopeMissions(rows,business,stage) {
  return scopeBusinessRows(rows,business).filter(r => !stage || r.stage_key === stage);
}
