const assert = require('node:assert/strict');
const fs = require('node:fs');

const commonJs = fs.readFileSync('public/assets/js/common.js', 'utf8');
const ordenesJs = fs.readFileSync('public/assets/js/ordenes.js', 'utf8');
const planificarJs = fs.readFileSync('public/assets/js/planificar.js', 'utf8');
const usuariosJs = fs.readFileSync('public/assets/js/usuarios.js', 'utf8');
const tecnicosHtml = fs.readFileSync('public/tecnicos.html', 'utf8');
const ordenesHtml = fs.readFileSync('public/ordenes.html', 'utf8');
const planificarHtml = fs.readFileSync('public/planificar.html', 'utf8');
const techCss = fs.readFileSync('public/assets/css/technician-dashboard.css', 'utf8');
const workerJs = fs.readFileSync('worker.js', 'utf8');

console.log('Testing 4 Explicit Roles, Permissions & Technician UI...');

// 1. Validar 4 roles explícitos en common.js
assert.match(commonJs, /normalizeRole/);
assert.match(commonJs, /raw === 'soporte'/);
assert.match(commonJs, /raw === 'admin' \|\| raw === 'administrador'/);
assert.match(commonJs, /raw === 'atencion'/);
assert.match(commonJs, /raw === 'tecnico'/);

// 2. Soporte NO puede acceder a tecnicos.html
assert.match(commonJs, /currentPage === 'tecnicos\.html'/);
assert.match(commonJs, /return role === 'administrador'/);
assert.match(commonJs, /\{ href: 'tecnicos\.html', adminOnly: true/);

// 3. usuarios.js restringido a administradores
assert.match(usuariosJs, /userHasRole\('administrador', 'admin'\)/);

// 4. tecnicos.html incluye soporte en filtros y modales
assert.match(tecnicosHtml, /<option value="soporte">Soporte<\/option>/);

// 5. ordenes.html y ordenes.js: selector de destinatario para administrador
assert.match(ordenesHtml, /id="wo-target-team-field"/);
assert.match(ordenesHtml, /id="wo-target-btn-soporte"/);
assert.match(ordenesHtml, /id="wo-target-btn-atencion"/);
assert.match(ordenesJs, /getActiveNetworkTargetRole/);
assert.match(ordenesJs, /switchAdminNetworkTarget/);

// 6. Reglas de despacho:
// Admin puede mandar a Soporte o Atención
// Soporte solo envía a Atención
// Atención solo envía a Soporte
assert.match(ordenesJs, /if \(userHasRole\('soporte'\)\) return 'atencion_clientes'/);
assert.match(ordenesJs, /if \(userHasRole\('atencion_clientes'\)\) return 'soporte'/);

// 7. Acciones de Soporte técnico en órdenes de red
assert.match(ordenesJs, /const isSoporte = userHasRole\('administrador', 'admin', 'soporte'\)/);

// 8. Interfaz de Técnico: Barra de progreso compacta
assert.match(planificarJs, /class="tech-progress-compact"/);
assert.match(planificarJs, /class="tech-progress-compact-row"/);
assert.match(techCss, /\.tech-progress-compact/);
assert.match(techCss, /\.tech-progress-compact-row/);

// 9. Ausencia de emojis en la interfaz del técnico
const technicianUiSnippets = [
  planificarJs.match(/tech-progress-compact[\s\S]*?<\/section>/)?.[0] || '',
  planificarJs.match(/tech-mobile-header[\s\S]*?<\/header>/)?.[0] || '',
  planificarJs.match(/tech-bottom-nav[\s\S]*?<\/nav>/)?.[0] || '',
  planificarJs.match(/tech-nav-direction-btn[\s\S]*?<\/a>/)?.[0] || '',
  planificarJs.match(/tech-call-btn[\s\S]*?<\/a>/)?.[0] || '',
  planificarHtml.match(/tech-pending-material-prompt-mo[\s\S]*?<\/div>\s*<\/div>/)?.[0] || ''
];

const emojiPattern = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
for (const snippet of technicianUiSnippets) {
  assert.equal(emojiPattern.test(snippet), false, `Snippet contains emoji: ${snippet.slice(0, 100)}`);
}

// 10. Worker protege usuarios únicamente para administrador
assert.match(workerJs, /listKey === 'users' && !hasRole\(session,'administrador','admin'\)/);

console.log('Roles, Permissions, Dispatch Routing & Technician UI: OK');
