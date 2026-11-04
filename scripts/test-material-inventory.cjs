const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = path => fs.readFileSync(path, 'utf8');
const html = read('public/material.html');
const materialJs = read('public/assets/js/material.js');
const dashboardJs = read('public/assets/js/material-dashboard.js');
const commonJs = read('public/assets/js/common.js');
const sidebarCss = read('public/assets/css/sidebar-compact.css');
const store = read('relational-store.js');
const schema = read('schema-relational-v3.sql');
const worker = read('worker.js');

assert.match(commonJs, /href: 'material\.html'.*label: 'Material'/);
assert.doesNotMatch(commonJs, /querySelectorAll\('a\[href="material\.html"\]'\).*remove/);
assert.doesNotMatch(sidebarCss, /\.nb\[href="material\.html"\]\s*\{\s*display\s*:\s*none/i);
assert.match(sidebarCss, /\.nb\[href="material\.html"\] \.nav-emoji\{background:linear-gradient/);
assert.match(sidebarCss, /\.nb\[href="historial\.html"\] \.nav-emoji\{background:linear-gradient/);
assert.match(sidebarCss, /body\.sidebar-collapsed \.topbar\.app-sidebar \.nav \.nb\[href="dashboard\.html"\] \.nav-emoji,[\s\S]*?href="mapa\.html"/);

assert.match(html, /id="mat-foto"[^>]+accept="image\/\*"/);
assert.match(html, /Foto del material <b>Obligatoria<\/b>/);
assert.match(html, /value="paquete">Paquete/);
assert.match(html, /id="entry-mo"/);
assert.match(html, /id="deliver-material-mo"/);
assert.match(html, /id="receive-material-mo"/);
assert.doesNotMatch(html, /id="mat-precio"/);
assert.doesNotMatch(html, /id="mat-categoria"/);
assert.doesNotMatch(html, /id="material-category-filter"/);
assert.doesNotMatch(html, /<span>Categoría<\/span>/);

assert.match(materialJs, /if\s*\(!materialPhotoData\)\s*return notify\('Agrega al menos una foto/);
assert.match(materialJs, /totalGood\s*\+\s*totalDamaged\s*\+\s*totalUsed/);
assert.match(materialJs, /newInstallations/);
assert.match(materialJs, /guardarEntrega|crearMovimientoMaterial/);
assert.match(materialJs, /mat-cantidad'\)\.disabled\s*=\s*false/);
assert.match(materialJs, /crearMovimientoMaterial\('adjustment',\s*initialStock\s*-\s*previousStock/);
assert.match(materialJs, /Indica una existencia válida, igual o mayor a cero/);
assert.doesNotMatch(materialJs, /Existencia actual \(usa Registrar entrada para modificarla\)/);
assert.match(html, /class="material-form-actions"/);
assert.match(html, /id="mat-cantidad"[^>]+step="0\.01"/);
assert.match(materialJs, /adjustment/);
assert.doesNotMatch(materialJs, /mat-precio|mat-categoria|material-category-filter/);
assert.match(dashboardJs, /material-photo-thumb/);
assert.match(dashboardJs, /abrirEntrada/);
assert.match(materialJs, /Recepción/);
assert.doesNotMatch(dashboardJs, /material-category-filter|material-category/);

for (const source of [store, schema]) {
  assert.match(source, /material_photos/);
  assert.match(source, /material_movements/);
  assert.match(source, /package_size/);
  assert.match(source, /returned_damaged/);
  assert.match(source, /new_installations/);
}
assert.match(worker, /\/api\/material-photo\//);

console.log('Material inventory navigation, photos, movements and reconciliation: OK');
