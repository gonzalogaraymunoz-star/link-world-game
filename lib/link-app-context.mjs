export const LINK_APPS = Object.freeze({
  world: 'https://link-world-9h0.pages.dev',
  game: 'https://link-world-game.pages.dev',
  control: 'https://linkcontrolgeneral.vercel.app'
});

const STAGE_ALIASES = Object.freeze({
  mar: 'marketing',
  marketing: 'marketing',
  ventas: 'ventas',
  venta: 'ventas',
  cierre: 'cierre',
  boarding: 'onboarding',
  onboarding: 'onboarding',
  opera: 'entrega',
  operaciones: 'entrega',
  operacion: 'entrega',
  entrega: 'entrega',
  postventa: 'postventa'
});

const SAFE_ID = /^[a-zA-Z0-9:_-]{1,160}$/;

export function canonicalStage(value) {
  const key = String(value || '').trim().toLowerCase();
  return STAGE_ALIASES[key] || null;
}

export function safeContextId(value) {
  const raw = String(value || '').trim();
  return SAFE_ID.test(raw) ? raw : null;
}

export function readLinkContext(search = '') {
  const q = new URLSearchParams(search);
  return {
    business: safeContextId(q.get('business')),
    businessGlobal: safeContextId(q.get('business_global')),
    stage: canonicalStage(q.get('stage') || q.get('dimension')),
    model: safeContextId(q.get('model')),
    mission: safeContextId(q.get('mission')),
    focus: safeContextId(q.get('focus')),
    origin: ['world','game','control'].includes(q.get('origin')) ? q.get('origin') : null
  };
}

function appendContext(url, context = {}, origin) {
  const q = url.searchParams;
  const fields = {
    business: safeContextId(context.business),
    business_global: safeContextId(context.businessGlobal),
    stage: canonicalStage(context.stage),
    model: safeContextId(context.model),
    mission: safeContextId(context.mission),
    focus: safeContextId(context.focus)
  };
  for (const [key,value] of Object.entries(fields)) {
    if (value) q.set(key,value);
  }
  if (origin) q.set('origin',origin);
  return url.toString();
}

export function buildWorldUrl(context = {}, origin = 'game') {
  const url = new URL(LINK_APPS.world + '/');
  url.searchParams.set('dimension','concha');
  return appendContext(url,context,origin);
}

export function buildGameUrl(context = {}, origin = 'world') {
  const url = new URL(LINK_APPS.game + '/');
  return appendContext(url,context,origin);
}

export function buildControlUrl(context = {}, origin = 'world') {
  const globalId = safeContextId(context.businessGlobal);
  const path = globalId ? '/c/' + encodeURIComponent(globalId) : '/';
  const url = new URL(LINK_APPS.control + path);
  return appendContext(url,context,origin);
}

export function contextFromBusiness(business, extra = {}) {
  return {
    business: business?.id || null,
    businessGlobal: business?.global_id || null,
    ...extra
  };
}
