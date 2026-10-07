export const CONCHA_STAGES = [
  { key: 'marketing', label: 'MAR', note: 'Comprender la señal', color: '#b889c2' },
  { key: 'ventas', label: 'Venta', note: 'Construir la propuesta', color: '#c39460' },
  { key: 'cierre', label: 'Cierre', note: 'Confirmar el compromiso', color: '#cb906c' },
  { key: 'onboarding', label: 'Boarding', note: 'Preparar la entrega', color: '#739fa9' },
  { key: 'entrega', label: 'Operaciones', note: 'Cumplir la promesa', color: '#7c9c7d' },
  { key: 'postventa', label: 'Postventa', note: 'Aprender y continuar', color: '#a294bc' }
];

// A model can serve several businesses. A neighbour's proof never certifies this cell.
// When a model-specific Concha is not yet defined, fall back to LINK's canonical
// business journey so every real cell still exposes MAR → Venta → Cierre → Boarding → Opera → Postventa.
export function getCellStages(data, businessId, modelId) {
  if (!businessId) return [];
  const modelRows = modelId
    ? (data.modelStages || []).filter(row => row.business_id === businessId && row.model_id === modelId)
    : [];
  if (modelRows.length) return modelRows;

  const journeyRows = (data.journeys || []).filter(row => row.business_id === businessId);
  return journeyRows.map(row => {
    const scope = (data.scopeStates || []).find(state =>
      state.business_global_id === row.business_global_id && state.stage_key === row.stage_key
    );
    const scopeState = scope?.state || null;
    const missionState = row.mission_status || null;
    let status = scopeState || missionState || 'watching';
    if (missionState === 'verified') status = 'verified';
    if (scopeState === 'waiting_approval') status = 'approval_required';
    return {
      ...row,
      status,
      objective: row.expected_outcome || row.customer_state_out || null,
      next_action: scope?.current_focus || row.mission_title || null,
      evidence_required: row.evidence_requested > row.evidence_validated
        ? 'Evidencia pendiente'
        : null,
      source: 'link_business_agent_journey_v'
    };
  });
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

export function stageSignal(row, proofs = []) {
  if (!row) return { label: 'Sin registro', state: 'empty' };
  if (['blocked', 'attention', 'approval_required', 'waiting_approval'].includes(row.status)) {
    return { label: row.status === 'blocked' ? 'Bloqueado' : 'Requiere atención', state: 'attention' };
  }
  if (['verified', 'completed', 'closed'].includes(row.status)) return { label: 'Verificado', state: 'verified' };
  if (proofs.some(proof => proof.verified === true)) return { label: 'Con evidencia', state: 'verified' };
  if (['active', 'approved', 'working', 'processing', 'queued', 'retry_wait'].includes(row.status)) {
    return { label: 'En trabajo', state: 'pending' };
  }
  return { label: 'En observación', state: 'pending' };
}
