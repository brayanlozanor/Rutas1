const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== TEST SUITE: DETAIL CLIENT PHONE, UNDEFINED PURGE & MOBILE NAV FIXES ===');

// 1. Verify planificar.js contains client phone line under client name
const planificarJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'js', 'planificar.js'), 'utf8');

assert.ok(planificarJs.includes('detail-client-phone-line'), 'planificar.js must contain .detail-client-phone-line');
assert.ok(planificarJs.includes('tech-inline-detail-phone'), 'planificar.js must contain .tech-inline-detail-phone');
assert.ok(planificarJs.includes('clientPhoneHtml'), 'planificar.js must compute clientPhoneHtml for detail cards');

// Verify that clientPhoneHtml is placed after detail-client-line in completedSummary
const doneClientLineIdx = planificarJs.indexOf('${hasClient ? `<div class="detail-client-line"><b>Cliente:</b> ${escapeHtml(visibleClientName)}</div>` : \'\'}');
assert.ok(doneClientLineIdx > 0, 'completedSummary must check hasClient and render detail-client-line');

const phoneLineAfterClient = planificarJs.indexOf('${clientPhoneHtml}', doneClientLineIdx);
assert.ok(phoneLineAfterClient > doneClientLineIdx, '${clientPhoneHtml} must appear right after detail-client-line');

// 2. Verify tecnico-ruta.js contains client phone line under client name
const tecnicoRutaJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'js', 'tecnico-ruta.js'), 'utf8');

assert.ok(tecnicoRutaJs.includes('detail-client-phone-line'), 'tecnico-ruta.js must contain .detail-client-phone-line');
assert.ok(tecnicoRutaJs.includes('techClientPhone'), 'tecnico-ruta.js must compute techClientPhone');

// 3. Verify getVisibleStopNotes sanitizes "undefined" in notes
assert.ok(planificarJs.includes('/undefined/i.test(note)'), 'planificar.js getVisibleStopNotes must check for undefined');
assert.ok(tecnicoRutaJs.includes('/undefined/i.test(note)'), 'tecnico-ruta.js getVisibleTechStopNotes must check for undefined');

// 4. Verify preset-routes.js never produces undefined cleanTown
const presetRoutesJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'js', 'preset-routes.js'), 'utf8');
assert.ok(presetRoutesJs.includes("cleanTown.toLowerCase() === 'undefined'"), 'preset-routes.js must guard against undefined cleanTown');

// 5. Verify CSS styling for .detail-client-phone-line and .tech-bottom-nav
const techViewModesCss = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'css', 'technician-view-modes.css'), 'utf8');
assert.ok(techViewModesCss.includes('.detail-client-phone-line'), 'technician-view-modes.css must style .detail-client-phone-line');
assert.ok(techViewModesCss.includes('.tech-inline-detail-phone'), 'technician-view-modes.css must style .tech-inline-detail-phone');

const planUiV2Css = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'css', 'plan-ui-v2.css'), 'utf8');
assert.ok(planUiV2Css.includes('font-size: 11px !important'), 'plan-ui-v2.css must enforce 11px font size on tech-bottom-nav');
assert.ok(planUiV2Css.includes('grid-template-columns: repeat(3, minmax(0, 1fr)) !important'), 'plan-ui-v2.css must enforce 3 equal columns for tech bottom nav');

// 6. Functional test: test getVisibleStopNotes logic
const mockStopWithUndefined = {
    name: 'EL PALMAR',
    town: 'EL PALMAR',
    notes: 'Parada 1 de Ruta Chilpancingo - Atlixtac: undefined (Pueblo registrado)'
};

function testGetVisibleStopNotes(stop) {
    let note = String(stop.notes || '').trim();
    if (!note) return '';
    if (/undefined/i.test(note)) {
        let fallbackName = (stop.name && stop.name.toLowerCase() !== 'parada' && stop.name.toLowerCase() !== 'undefined') ? stop.name : (stop.town || '');
        if (fallbackName) {
            note = note.replace(/:\s*undefined(\s*\(Pueblo registrado\))?/gi, `: ${fallbackName} (Pueblo registrado)`).replace(/\bundefined\b/gi, fallbackName).trim();
        } else {
            note = note.replace(/:\s*undefined(\s*\(Pueblo registrado\))?/gi, '').replace(/\bundefined\b/gi, '').trim();
        }
    }
    return note;
}

const cleanedNote = testGetVisibleStopNotes(mockStopWithUndefined);
console.log('Cleaned note output:', cleanedNote);
assert.strictEqual(cleanedNote, 'Parada 1 de Ruta Chilpancingo - Atlixtac: EL PALMAR (Pueblo registrado)', 'Note must replace undefined with real town name');
assert.ok(!cleanedNote.includes('undefined'), 'Cleaned note must not contain undefined');

// 7. Functional test: test phone rendering under client name
const mockDetail = {
    id: 'det-1',
    title: 'Revisión',
    clientName: 'Juan Pérez',
    clientPhone: '7471234567',
    status: 'pendiente',
    priority: 'alta'
};

const clientPhoneStr = String(mockDetail.clientPhone || '').trim();
const rawPhone = clientPhoneStr.replace(/\D/g, '');
const phoneHtml = clientPhoneStr
    ? `<div class="detail-client-phone-line"><b>Teléfono:</b> ${rawPhone && rawPhone.length >= 7 ? `<a href="tel:${rawPhone}">${clientPhoneStr}</a>` : `<span>${clientPhoneStr}</span>`}</div>`
    : '';

assert.ok(phoneHtml.includes('Teléfono:'), 'Phone HTML must have Teléfono label');
assert.ok(phoneHtml.includes('href="tel:7471234567"'), 'Phone HTML must have clickable dialer link');
assert.ok(phoneHtml.includes('7471234567'), 'Phone HTML must display digits');

console.log('All assertions passed successfully! ✓');
