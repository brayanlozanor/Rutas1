const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('public/assets/js/api.js', 'utf8');

function readFunction(name) {
  const asyncStart = source.indexOf(`async function ${name}(`);
  const start = asyncStart >= 0 ? asyncStart : source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`${name} no encontrada`);
  const signatureEnd = source.indexOf(') {', start);
  const brace = source.indexOf('{', signatureEnd);
  let depth = 0;
  for (let index = brace; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} incompleta`);
}

const constantsStart = source.indexOf('const DATA_PARTS_BY_PAGE');
const constantsEnd = source.indexOf('\n', source.indexOf('const ALL_DATA_PARTS', constantsStart));
const selectedSource = [
  source.slice(constantsStart, constantsEnd),
  readFunction('getPageDataParts'),
  readFunction('fetchRemoteState')
].join('\n');

const expected = {
  antenas: ['equipment'],
  dashboard: ['operations', 'people'],
  historial: ['audit'],
  mapa: ['equipment', 'nodes'],
  material: ['materials'],
  nodos: ['nodes'],
  ordenes: ['operations', 'people'],
  planificar: ['materials', 'people', 'planning'],
  rutas: ['routes'],
  'tecnico-ruta': ['materials', 'people', 'planning'],
  tecnicos: ['people']
};

const pagedKey = {
  equipment: 'equipment',
  nodes: 'nodes',
  operations: 'workOrders',
  materials: 'materials',
  routes: 'routes',
  audit: 'auditLog'
};

async function testPage(page,extensionless=false) {
  const calls = [];
  const context = {
    API: 'https://example.test',
    location: { pathname: extensionless ? `/${page}` : `/${page}.html` },
    window: { netopsGetDataPartParams: part => {
      const windowed = {antenas:'equipment',nodos:'nodes',ordenes:'operations',material:'materials',rutas:'routes',tecnicos:'people',historial:'audit'};
      return windowed[page] === part ? {windowed:'1',offset:0,limit:20} : undefined;
    } },
    URLSearchParams,
    AbortController,
    setTimeout,
    clearTimeout,
    safeParse: value => Array.isArray(value) ? value : [],
    normalizeWorkOrderLocationList: () => {},
    createApiError: (_response, body) => new Error(body.error || 'request failed'),
    fetch: async url => {
      const parsed = new URL(url);
      const part = parsed.searchParams.get('part');
      if (!part) throw new Error(`${page} intento una carga completa`);
      const includeSyncMeta = parsed.searchParams.get('includeSyncMeta') === '1';
      calls.push({ part, offset: Number(parsed.searchParams.get('offset') || 0), includeSyncMeta, includeMapCatalog: parsed.searchParams.get('includeMapCatalog') === '1' });
      const key = pagedKey[part];
      const body = key
        ? { [key]: [{ id: `${part}-${parsed.searchParams.get('offset')}` }], total: 201 }
        : part === 'people' ? { technicians: [], users: [] }
        : part === 'activity' ? { techAccessLog: [], deletionRequests: [] }
        : { weekPlan: {}, prepChecked: {}, syncMeta: { updatedAt: 'test' } };
      if (includeSyncMeta) body.syncMeta = { updatedAt: 'test' };
      return { ok: true, status: 200, json: async () => body };
    }
  };
  vm.createContext(context);
  vm.runInContext(`${selectedSource}; this.fetchRemoteState = fetchRemoteState;`, context);
  await context.fetchRemoteState(5000);
  const actual = [...new Set(calls.map(call => call.part))].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected[page])) {
    throw new Error(`${page}: ${actual.join(',')} != ${expected[page].join(',')}`);
  }
  const embeddedSyncMetaCalls = calls.filter(call => call.includeSyncMeta).length;
  const expectedEmbeddedSyncMetaCalls = expected[page].includes('planning') ? 0 : 1;
  if (embeddedSyncMetaCalls !== expectedEmbeddedSyncMetaCalls) {
    throw new Error(`${page}: esperaba ${expectedEmbeddedSyncMetaCalls} carga(s) con syncMeta integrado y recibio ${embeddedSyncMetaCalls}`);
  }
  const planningCatalogCalls = calls.filter(call => call.part === 'planning' && call.includeMapCatalog).length;
  const expectedPlanningCatalogCalls = page === 'planificar' ? 1 : 0;
  if (planningCatalogCalls !== expectedPlanningCatalogCalls) {
    throw new Error(`${page}: esperaba ${expectedPlanningCatalogCalls} carga(s) del catalogo completo del mapa y recibio ${planningCatalogCalls}`);
  }
  for (const part of actual.filter(part => pagedKey[part])) {
    if (context.window.netopsGetDataPartParams(part)?.windowed === '1') {
      const operationCalls = calls.filter(call => call.part === 'operations');
      const partCalls = calls.filter(call => call.part === part);
      if (partCalls.length !== 1 || partCalls[0].offset !== 0) throw new Error(`${page} descargo mas de una pagina inicial de ${part}`);
      continue;
    }
    if (!calls.some(call => call.part === part && call.offset === 200)) {
      throw new Error(`${page}: ${part} no pagino hasta el final`);
    }
  }
  console.log(`${page}: ${actual.join(', ')}`);
}

(async () => {
  for (const page of Object.keys(expected)) {
    await testPage(page);
    await testPage(page,true);
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
