import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCellStages, getCellEvidence, getCellModels, getRelatedCellIds, stageSignal } from './concha.mjs';

const data = {
  models: [{ id: 'shared' }, { id: 'other' }],
  modelLinks: [
    { business_id: 'A', model_id: 'shared', status: 'active' },
    { business_id: 'B', model_id: 'shared', status: 'active' },
    { business_id: 'C', model_id: 'shared', status: 'proposed' },
    { business_id: 'A', model_id: 'other', status: 'cancelled' }
  ],
  modelStages: [
    { business_id: 'A', model_id: 'shared', stage_key: 'ventas', status: 'active' },
    { business_id: 'B', model_id: 'shared', stage_key: 'ventas', status: 'completed' }
  ],
  modelEvidence: [
    { business_id: 'A', model_id: 'shared', verified: false, metadata: { stage_key: 'ventas' } },
    { business_id: 'B', model_id: 'shared', verified: true, metadata: { stage_key: 'ventas' } },
    { business_id: 'A', model_id: 'other', verified: true, metadata: { stage_key: 'ventas' } }
  ]
};

test('a shared model keeps stage state scoped to its business', () => {
  assert.deepEqual(getCellStages(data, 'A', 'shared'), [data.modelStages[0]]);
  assert.deepEqual(getCellStages(data, null, 'shared'), []);
});
test('another cell or model cannot certify this stage', () => {
  const proofs = getCellEvidence(data, 'A', 'shared', 'ventas');
  assert.equal(proofs.length, 1);
  assert.equal(stageSignal(data.modelStages[0], proofs).state, 'pending');
  assert.equal(stageSignal(data.modelStages[1], getCellEvidence(data, 'B', 'shared', 'ventas')).state, 'verified');
});
test('declared completion without verified evidence is not proof', () => {
  assert.equal(stageSignal({status:'completed'}, []).state, 'pending');
  assert.equal(stageSignal(null, [{verified:true}]).state, 'empty');
  assert.equal(stageSignal({status:'blocked'}, [{verified:true}]).state, 'attention');
});
test('cancelled model links do not become active cell models', () => {
  assert.deepEqual(getCellModels(data, 'A'), [{id:'shared'}]);
});
test('only registered active shared links draw a relationship', () => {
  assert.deepEqual([...getRelatedCellIds(data, 'A')], ['B']);
});
