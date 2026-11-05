const assert = require('node:assert/strict');
const fs = require('node:fs');

const planificarJs = fs.readFileSync('public/assets/js/planificar.js', 'utf8');
const techCss = fs.readFileSync('public/assets/css/technician-dashboard.css', 'utf8');

console.log('Testing Technician Inter-Town Distances & Privacy-Safe Realtime Weather...');

// 1. Clima en tiempo real y privacidad
assert.match(planificarJs, /function hideTechnicianWeather\(\)/);
assert.match(planificarJs, /function requestTechnicianRealtimeWeather\(/);
assert.match(planificarJs, /function fetchAndRenderTechnicianWeather\(/);
assert.match(planificarJs, /navigator\.geolocation\.getCurrentPosition/);
assert.match(planificarJs, /id="tech-weather-card"/);
assert.match(techCss, /\.tech-weather-card\s*\{[\s\S]*?display:\s*none/);
assert.match(techCss, /body\.plan-technician-view\s+\.tech-weather-card\.has-weather\s*\{[\s\S]*?display:\s*block/);

// 2. Si no es posible o se deniega la ubicación, no se muestra nada de clima
assert.match(planificarJs, /if \(!\('geolocation' in navigator\) \|\| !navigator\.geolocation/);
assert.match(planificarJs, /techRealtimeWeatherCoords\s*=\s*null;\s*hideTechnicianWeather\(\);/);

// 3. Información de recorrido y distancia entre pueblos en agenda diaria (Detalles)
assert.match(planificarJs, /const dayMetrics = calculateDayRouteFeasibility\(stops\);/);
assert.match(planificarJs, /class="tech-day-travel-badge"/);
assert.match(planificarJs, /class="plan-inter-stop-transit"/);
assert.match(planificarJs, /~\$\{leg\.minutes\} min.*?de.*?escapeHtml\(prevName\).*?a.*?escapeHtml\(currName\)/);

// 4. Información de distancia en vista de Ruta (Mapa / Mi ruta)
assert.match(planificarJs, /id="tech-route-travel-summary"/);
assert.match(planificarJs, /class="tech-route-travel-chip"/);
assert.match(planificarJs, /Carretera total: <strong>~\$\{feasibility\.totalKm\} km<\/strong>/);
assert.match(planificarJs, /Traslado acumulado: <strong>~\$\{feasibility\.travelFormatted\}<\/strong>/);
assert.match(planificarJs, /class="tech-route-leg-transit"/);
assert.match(planificarJs, /class="tech-route-leg-badge"/);

// 5. Estilos en technician-dashboard.css
assert.match(techCss, /\.tech-route-travel-summary/);
assert.match(techCss, /\.tech-route-travel-chip/);
assert.match(techCss, /\.tech-route-leg-transit/);
assert.match(techCss, /\.tech-day-travel-badge/);

// 6. Ausencia estricta de emojis Unicode en los nuevos componentes del técnico
const weatherCardSnippet = planificarJs.match(/fetchAndRenderTechnicianWeather[\s\S]*?card\.style\.display\s*=\s*'block';/)?.[0] || '';
const legTransitSnippet = planificarJs.match(/tech-route-leg-transit[\s\S]*?<\/div>/)?.[0] || '';
const travelChipSnippet = planificarJs.match(/tech-route-travel-chip[\s\S]*?<\/div>/)?.[0] || '';
const dayTravelSnippet = planificarJs.match(/tech-day-travel-badge[\s\S]*?<\/span>/)?.[0] || '';

const emojiPattern = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

assert.equal(emojiPattern.test(weatherCardSnippet), false, 'weatherCardSnippet contains emoji!');
assert.equal(emojiPattern.test(legTransitSnippet), false, 'legTransitSnippet contains emoji!');
assert.equal(emojiPattern.test(travelChipSnippet), false, 'travelChipSnippet contains emoji!');
assert.equal(emojiPattern.test(dayTravelSnippet), false, 'dayTravelSnippet contains emoji!');

console.log('ALL TESTS PASSED: Technician Inter-Town Distances & Privacy-Safe Realtime Weather OK!');

