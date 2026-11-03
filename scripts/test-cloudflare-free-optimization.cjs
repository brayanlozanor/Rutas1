const fs = require('fs');
const vm = require('vm');

const apiSource = fs.readFileSync('public/assets/js/api.js','utf8');
const commonSource = fs.readFileSync('public/assets/js/common.js','utf8');
const workerSource = fs.readFileSync('worker.js','utf8');
const storeSource = fs.readFileSync('relational-store.js','utf8');

function readFunction(source,name) {
  const asyncStart = source.indexOf(`async function ${name}(`);
  const start = asyncStart >= 0 ? asyncStart : source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`${name} no encontrada`);
  const signatureEnd = source.indexOf(') {',start);
  const brace = source.indexOf('{',signatureEnd);
  let depth = 0;
  for (let index=brace;index<source.length;index+=1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(start,index+1);
  }
  throw new Error(`${name} incompleta`);
}

if (commonSource.includes("fetch(`${apiBase}/api/session")) throw new Error('La carga comun todavia hace una validacion de sesion duplicada');
if (!apiSource.includes('}, 60000);')) throw new Error('La sincronizacion inactiva no usa el intervalo optimizado de 60 segundos');
if (!workerSource.includes("url.searchParams.get('includeSyncMeta') === '1'")) throw new Error('El Worker no integra syncMeta en la carga solicitada');
if (/await ensureWorkOrderColumns\(/.test(storeSource)) throw new Error('Las ordenes todavia ejecutan DDL en el camino caliente');
if (/await ensureMaterialInventorySchema\(/.test(storeSource)) throw new Error('Los materiales todavia ejecutan DDL en el camino caliente');

const context = {
  syncBusy:false,
  document:{hidden:false},
  lastSyncToken:'same-token',
  isLocalDirty:() => false,
  isUserEditingNow:() => false,
  fetchRemoteSyncMeta:async () => ({updatedAt:'same-token'}),
  syncFromCloud:async () => { context.fullReloads += 1; return true; },
  fullReloads:0,
  console
};
vm.createContext(context);
vm.runInContext(`${readFunction(apiSource,'autoSyncTick')}; this.autoSyncTick=autoSyncTick;`,context);

(async () => {
  await context.autoSyncTick({force:true,silent:true});
  if (context.fullReloads !== 0) throw new Error('Volver a enfocar recarga datos aunque el token no cambio');
  console.log('Cloudflare Free request and D1 hot-path optimizations: OK');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
