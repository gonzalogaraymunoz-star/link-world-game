import { test } from 'node:test';
import assert from 'node:assert/strict';
import {readWorldRoute,writeWorldRoute,scopeBusinessRows,scopeMissions,DIMENSIONS} from './world-navigation.mjs';

test('dimension changes retain the canonical business and model after refresh',()=>{
  const original=readWorldRoute('?dimension=marketing&business=cell-A&model=shared&ref=campaign');
  const query=writeWorldRoute('?ref=campaign',{...original,dimension:'fin'});
  assert.deepEqual(readWorldRoute(query),{dimension:'fin',business:'cell-A',model:'shared'});
  assert.equal(new URLSearchParams(query).get('ref'),'campaign');
});
test('the global entrance clears both economic cell and model scope',()=>{
  const query=writeWorldRoute('?dimension=fin&business=cell-A&model=shared',{dimension:'fin',business:null,model:null});
  assert.deepEqual(readWorldRoute(query),{dimension:'fin',business:null,model:null});
});
test('legacy links resolve and malformed context cannot become a data identifier',()=>{
  assert.equal(readWorldRoute('?dimension=economia').dimension,'fin');
  assert.deepEqual(readWorldRoute('?dimension=unknown&business=%3Cscript%3E&model=a%2Fb'),{dimension:'concha',business:null,model:null});
});
test('a scoped mission must match the canonical business and stage, never its display name',()=>{
  const rows=[{id:1,business_global_id:'global-A',stage_key:'ventas'},{id:2,business_global_id:'global-B',stage_key:'ventas',name:'A'},{id:3,business_global_id:'global-A',stage_key:'cierre'}];
  assert.deepEqual(scopeMissions(rows,{id:'A',global_id:'global-A'},'ventas'),[rows[0]]);
  assert.equal(scopeMissions(rows,null,'ventas').length,2);
});
test('a missing global identity cannot match unassigned rows',()=>{
  const rows=[{id:1,business_id:'A'},{id:2,business_id:'B'},{id:3}];
  assert.deepEqual(scopeBusinessRows(rows,{id:'A'}),[rows[0]]);
});
test('ecosystem dimensions have distinct destinations',()=>{
  for(const key of ['personas','evidencias','artefactos','genesis','reproduccion','director','pulso','hipocampo','cortex','conexiones']) assert.equal(DIMENSIONS[key].id,key);
});
