export const CONCHA_STAGES = [
  { key: 'marketing', label: 'MAR', note: 'Comprender la señal', color: '#b889c2' },
  { key: 'ventas', label: 'Venta', note: 'Construir la propuesta', color: '#c39460' },
  { key: 'cierre', label: 'Cierre', note: 'Confirmar el compromiso', color: '#cb906c' },
  { key: 'onboarding', label: 'Boarding', note: 'Preparar la entrega', color: '#739fa9' },
  { key: 'entrega', label: 'Operaciones', note: 'Cumplir la promesa', color: '#7c9c7d' },
  { key: 'postventa', label: 'Postventa', note: 'Aprender y continuar', color: '#a294bc' }
];

// A model can serve several businesses. A neighbour's proof never certifies this cell.
export function getCellStages(data, businessId, modelId) {
  if (!businessId || !modelId) return [];
  return (data.modelStages || []).filter(row => row.business_id === businessId && row.model_id === modelId);
}

export function getCellEvidence(data, businessId, modelId, stageKey) {
  if (!businessId || !modelId) return [];
  return (data.modelEvidence || []).filter(row => row.business_id === businessId && row.model_id === modelId && (!stageKey || row.metadata?.stage_key === stageKey));
}

export function getCellModels(data, businessId) {
  const ids = new Set((data.modelLinks || []).filter(row => row.business_id === businessId && ['active', 'proposed'].includes(row.status)).map(row => row.model_id));
  return (data.models || []).filter(row => ids.has(row.id));
}

export function getRelatedCellIds(data, businessId) {
  const links = (data.modelLinks || []).filter(row => row.status === 'active');
  const models = new Set(links.filter(row => row.business_id === businessId).map(row => row.model_id));
  return new Set(links.filter(row => row.business_id !== businessId && models.has(row.model_id)).map(row => row.business_id));
}

export function stageSignal(row, proofs) {
  if (!row) return { label: 'Sin registro', state: 'empty' };
  if (['blocked', 'attention', 'approval_required'].includes(row.status)) return { label: row.status === 'blocked' ? 'Bloqueado' : 'Atención', state: 'attention' };
  if (proofs.some(proof => proof.verified === true)) return { label: 'Con evidencia', state: 'verified' };
  return { label: 'Sin evidencia verificada', state: 'pending' };
}
