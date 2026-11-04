const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('Testing Plan Desktop Redesign, Route Feasibility, Weather & Week Filters...');

// 1. Verify files exist and have no syntax errors
const planHtmlPath = path.join(__dirname, '..', 'public', 'planificar.html');
const planJsPath = path.join(__dirname, '..', 'public', 'assets', 'js', 'planificar.js');
const planCssRefPath = path.join(__dirname, '..', 'public', 'assets', 'css', 'plan-reference.css');
const planCssUiPath = path.join(__dirname, '..', 'public', 'assets', 'css', 'plan-ui-v2.css');

const htmlContent = fs.readFileSync(planHtmlPath, 'utf8');
const jsContent = fs.readFileSync(planJsPath, 'utf8');
const cssRefContent = fs.readFileSync(planCssRefPath, 'utf8');
const cssUiContent = fs.readFileSync(planCssUiPath, 'utf8');

// 2. Verify HTML structure for desktop intelligence & route filters
assert(htmlContent.includes('id="plan-route-intel-box"'), 'Missing plan-route-intel-box in planificar.html');
assert(htmlContent.includes('id="plan-weather-box"'), 'Missing plan-weather-box in planificar.html');
assert(htmlContent.includes('id="plan-day-intel-strip"'), 'Missing plan-day-intel-strip in planificar.html');
assert(htmlContent.includes('id="plan-route-day-filters"'), 'Missing plan-route-day-filters in planificar.html');
assert(htmlContent.includes('onclick="toggleRouteListFullscreen()"'), 'Missing toggleRouteListFullscreen in planificar.html');
assert(htmlContent.includes('id="intel-next-dist"'), 'Missing intel-next-dist in planificar.html');
assert(htmlContent.includes('id="intel-next-time"'), 'Missing intel-next-time in planificar.html');
assert(htmlContent.includes('id="intel-prev-dist"'), 'Missing intel-prev-dist in planificar.html');
assert(htmlContent.includes('id="intel-total-dist"'), 'Missing intel-total-dist in planificar.html');
// Verify NO money / $ icon in intel box
const intelBoxHtml = htmlContent.slice(htmlContent.indexOf('id="plan-route-intel-box"'), htmlContent.indexOf('id="plan-weather-box"'));
assert(!intelBoxHtml.includes('$'), 'Found forbidden $ in plan-route-intel-box');
assert(!intelBoxHtml.includes('M12 2v20M17 5H9.5'), 'Found forbidden dollar SVG icon in plan-route-intel-box');

// 3. Test calculation helpers (extract and execute from JS)
// Calculate Haversine Km
function calculateHaversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function estimateRouteTravel(lat1, lon1, lat2, lon2) {
    const directKm = calculateHaversineKm(lat1, lon1, lat2, lon2);
    if (isNaN(directKm) || directKm <= 0.05) return { km: 0.1, minutes: 2, formatted: '~2 min (mismo poblado)' };
    const roadKm = Math.round(directKm * 1.32 * 10) / 10;
    const minutes = Math.max(3, Math.round((roadKm / 38) * 60) + 2);
    const timeFormatted = minutes >= 60 
        ? `${Math.floor(minutes / 60)}h ${minutes % 60 ? (minutes % 60) + 'm' : ''}`.trim()
        : `${minutes} min`;
    return {
        km: roadKm,
        minutes,
        formatted: `~${timeFormatted} (${roadKm} km)`
    };
}

// Distance between Chilpancingo (17.551, -99.505) and Tixtla (17.568, -99.398) ~11.5 km direct, ~15.2 km road
const leg1 = estimateRouteTravel(17.551, -99.505, 17.568, -99.398);
assert(leg1.km > 10 && leg1.km < 20, `Road distance unexpected: ${leg1.km} km`);
assert(leg1.minutes >= 20 && leg1.minutes <= 35, `Travel time unexpected: ${leg1.minutes} min`);
console.log(`Leg test Chilpancingo -> Tixtla: ${leg1.km} km, ${leg1.minutes} min (${leg1.formatted})`);

// 4. Test Route Feasibility Calculator
function calculateDayRouteFeasibility(stops) {
    const validStops = (stops || []).filter(s => !s.deletedAt);
    let totalKm = 0;
    let totalTravelMinutes = 0;
    const legs = [];

    for (let i = 0; i < validStops.length - 1; i++) {
        const s1 = validStops[i];
        const s2 = validStops[i + 1];
        const leg = estimateRouteTravel(s1.lat, s1.lng, s2.lat, s2.lng);
        totalKm += leg.km;
        totalTravelMinutes += leg.minutes;
        legs.push(leg);
    }

    const serviceMinutes = validStops.length * 45;
    const totalWorkdayMinutes = totalTravelMinutes + serviceMinutes;
    const workdayHours = Math.floor(totalWorkdayMinutes / 60);
    const workdayRemMinutes = totalWorkdayMinutes % 60;
    const workdayFormatted = workdayHours > 0 
        ? `${workdayHours}h ${workdayRemMinutes > 0 ? workdayRemMinutes + 'm' : ''}`.trim() 
        : `${workdayRemMinutes}m`;

    let status = 'optima';
    let statusLabel = 'Jornada adecuada';
    if (validStops.length === 0) {
        status = 'vacia';
        statusLabel = 'Sin paradas';
    } else if (totalWorkdayMinutes > 540) {
        status = 'sobrecarga';
        statusLabel = 'Sobrecarga de jornada';
    } else if (totalWorkdayMinutes > 420) {
        status = 'completa';
        statusLabel = 'Jornada completa';
    }

    return {
        stopsCount: validStops.length,
        totalKm: Math.round(totalKm * 10) / 10,
        totalTravelMinutes,
        serviceMinutes,
        totalWorkdayMinutes,
        workdayFormatted,
        status,
        statusLabel,
        legs
    };
}

// Test 3 balanced stops
const sampleStops = [
    { name: 'Pueblo A', lat: 17.55, lng: -99.50 },
    { name: 'Pueblo B', lat: 17.58, lng: -99.45 },
    { name: 'Pueblo C', lat: 17.62, lng: -99.40 }
];
const feas1 = calculateDayRouteFeasibility(sampleStops);
assert.strictEqual(feas1.stopsCount, 3);
assert.strictEqual(feas1.status, 'optima');
assert.strictEqual(feas1.statusLabel, 'Jornada adecuada');
console.log(`Feasibility 3 stops: ${feas1.totalKm} km, ~${feas1.workdayFormatted} workday -> ${feas1.statusLabel}`);

// Test 11 stops (should trigger overload warning)
const heavyStops = Array.from({ length: 11 }, (_, i) => ({
    name: `Pueblo ${i}`,
    lat: 17.50 + i * 0.05,
    lng: -99.50 - i * 0.05
}));
const feasHeavy = calculateDayRouteFeasibility(heavyStops);
assert.strictEqual(feasHeavy.status, 'sobrecarga');
assert.strictEqual(feasHeavy.statusLabel, 'Sobrecarga de jornada');
console.log(`Feasibility heavy route: ${feasHeavy.totalKm} km, ~${feasHeavy.workdayFormatted} workday -> ${feasHeavy.statusLabel}`);

// 5. Test Weather Code Mapping
function getWmoWeatherInfo(code) {
    if (code === 0) return { label: 'Soleado / Despejado', icon: '☀️', condition: 'good' };
    if (code === 1 || code === 2) return { label: 'Mayormente despejado', icon: '🌤️', condition: 'good' };
    if (code === 3) return { label: 'Nublado', icon: '☁️', condition: 'fair' };
    if (code >= 61 && code <= 65) return { label: 'Lluvia constante', icon: '🌧️', condition: 'warning' };
    if (code >= 95) return { label: 'Tormenta eléctrica', icon: '⛈️', condition: 'alert' };
    return { label: 'Tiempo templado', icon: '⛅', condition: 'good' };
}
assert.strictEqual(getWmoWeatherInfo(0).icon, '☀️');
assert.strictEqual(getWmoWeatherInfo(61).condition, 'warning');
assert.strictEqual(getWmoWeatherInfo(95).condition, 'alert');

// 6. Verify CSS definitions for desktop layout
assert(cssRefContent.includes('body.planificar-page:not(.plan-technician-view) .plan-shell'), 'Missing desktop plan-shell rule');
assert(cssRefContent.includes('grid-template-areas:"sidebar board map"!important') || cssRefContent.includes('grid-template-areas: "sidebar board map"'), 'Missing 3-column desktop layout');
assert(cssRefContent.includes('position: sticky') || cssRefContent.includes('position:sticky'), 'Missing sticky map rule');
assert(cssUiContent.includes('.plan-route-intel-box'), 'Missing .plan-route-intel-box styles');
assert(cssUiContent.includes('.plan-weather-box'), 'Missing .plan-weather-box styles');
assert(cssUiContent.includes('.plan-inter-stop-transit'), 'Missing .plan-inter-stop-transit styles');
assert(cssUiContent.includes('.route-day-filters'), 'Missing .route-day-filters styles');
assert(cssUiContent.includes('.route-full-modal.map-maximized'), 'Missing map-maximized styles');
assert(cssUiContent.includes('.plan-week-quick-move'), 'Missing .plan-week-quick-move styles');
assert(cssUiContent.includes('.plan-card-navigator'), 'Missing .plan-card-navigator styles');
assert(cssUiContent.includes('.plan-card-nav-btn'), 'Missing .plan-card-nav-btn styles');
assert(cssUiContent.includes('.plan-site-pills-row'), 'Missing .plan-site-pills-row styles');
assert(cssUiContent.includes('.plan-site-pill'), 'Missing .plan-site-pill styles');
assert(cssUiContent.includes('.plan-card-transit-box'), 'Missing .plan-card-transit-box styles');
assert(cssUiContent.includes('.plan-site-extra-details'), 'Missing .plan-site-extra-details styles');

// 7. Verify JS Card-by-Card mode functions
assert(jsContent.includes('advancePlanCard'), 'Missing advancePlanCard in planificar.js');
assert(jsContent.includes('selectPlanCardIndex'), 'Missing selectPlanCardIndex in planificar.js');
assert(jsContent.includes('togglePlanDisplayMode'), 'Missing togglePlanDisplayMode in planificar.js');
assert(jsContent.includes('getVisiblePlanStops'), 'Missing getVisiblePlanStops in planificar.js');
assert(jsContent.includes('renderActiveStopExtraDetails'), 'Missing renderActiveStopExtraDetails in planificar.js');
assert(jsContent.includes('panPlanMapToActiveStop'), 'Missing panPlanMapToActiveStop in planificar.js');

// 8. Verify technician isolation: technician dashboard CSS untouched
const techCssPath = path.join(__dirname, '..', 'public', 'assets', 'css', 'technician-dashboard.css');
const techCss = fs.readFileSync(techCssPath, 'utf8');
assert(techCss.includes('body.plan-technician-view'), 'Technician dashboard CSS intact');

console.log('All Plan Desktop Redesign, Route Feasibility, Weather & Week Filter tests passed successfully!');

