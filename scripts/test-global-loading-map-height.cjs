const fs = require('fs');

const api = fs.readFileSync('public/assets/js/api.js', 'utf8');
const css = fs.readFileSync('public/assets/css/style.css', 'utf8');
const htmlPages = [
  'antenas', 'dashboard', 'historial', 'login', 'mapa', 'material',
  'nodos', 'ordenes', 'planificar', 'rutas', 'tecnico-ruta', 'tecnicos'
];
const minimumAssetDate = '20260831';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  api.includes('const showOverlay = options.globalFeedback !== false;'),
  'loadDB todavia permite ocultar el indicador desde paginas individuales'
);
assert(
  api.includes("const overlayDelay = Number.isFinite(Number(options.overlayDelay)) ? Math.max(0, Number(options.overlayDelay)) : 0;"),
  'la carga inicial no muestra el indicador inmediatamente'
);
assert(
  css.includes('.plan-fullscreen-card{height:calc(125dvh - 20px)!important;max-height:calc(125dvh - 20px)!important}'),
  'el mapa ampliado no compensa el zoom de escritorio'
);

for (const page of htmlPages) {
  const html = fs.readFileSync(`public/${page}.html`, 'utf8');
  for (const asset of ['assets/js/api.js', 'assets/css/style.css']) {
    const version = html.match(new RegExp(`${asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?v=(\\d{8})[^"'\\s]*`));
    assert(version && version[1] >= minimumAssetDate, `${page}.html conserva ${asset} en cache`);
  }
}

console.log('Carga global y altura del mapa de Planificar: OK');
