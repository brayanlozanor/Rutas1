const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- TEST: Desktop vs Technician/Mobile View Separation in Planificar ---');

const planificarJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/planificar.js'), 'utf8').replace(/\r\n/g, '\n');
const planificarHtml = fs.readFileSync(path.join(__dirname, '../public/planificar.html'), 'utf8');

// 1. Verify planificar.html has #tech-bottom-nav hidden by default
assert(planificarHtml.includes('id="tech-bottom-nav" aria-label="Opciones del técnico" style="display:none;"'),
    'planificar.html must hide #tech-bottom-nav by default with style="display:none;"');
console.log('✓ 1. #tech-bottom-nav is hidden by default in static HTML.');

// 2. Extract isTechnicianPlanView and test under various scenarios
const sandbox = {
    URLSearchParams,
    window: {
        location: { search: '' },
        matchMedia: (query) => {
            if (query === '(max-width: 768px)') return { matches: sandbox._isMobile };
            return { matches: false };
        }
    },
    document: {
        body: {
            classList: {
                contains: (cls) => false
            }
        },
        querySelector: (sel) => null,
        getElementById: (id) => null
    },
    getCurrentUser: () => sandbox._currentUser,
    normalizeRole: (r) => String(r || '').toLowerCase().trim(),
    normalizeName: (s) => String(s || '').toLowerCase().trim(),
    userHasRole: (...roles) => roles.includes(sandbox._currentUser?.role),
    state: {
        technicians: [
            { id: 'tech-1', userId: 'usr-tech-1', nombre: 'Nolve Robles Nava', usuario: 'nolve', estado: 'activo' }
        ],
        generalPlans: []
    },
    _isMobile: false,
    _currentUser: { id: 'usr-admin-1', role: 'administrador', name: 'Admin', username: 'admin' }
};

vm.createContext(sandbox);

const isTechnicianPlanViewCode = planificarJs.match(/function isTechnicianPlanView\(\) \{[\s\S]*?\n\}/)[0];
vm.runInContext(isTechnicianPlanViewCode, sandbox);

// Scenario A: Administrator on Desktop (1920x1080, screen > 768px)
sandbox._isMobile = false;
sandbox._currentUser = { id: 'usr-admin', role: 'administrador', name: 'Admin', username: 'admin' };
sandbox.window.location.search = '';
assert.strictEqual(sandbox.isTechnicianPlanView(), false, 'Admin on Desktop must return false for isTechnicianPlanView');
console.log('✓ 2. Administrator on Desktop evaluates to false (Full Desktop Planner).');

// Scenario B: Administrator on Mobile screen (width <= 768px)
sandbox._isMobile = true;
assert.strictEqual(sandbox.isTechnicianPlanView(), true, 'Admin on Mobile evaluates to true (Mobile Technician View)');
console.log('✓ 3. Administrator on Mobile evaluates to true (Celular / Mobile View).');

// Scenario C: Technician user on Desktop screen
sandbox._isMobile = false;
sandbox._currentUser = { id: 'usr-tech-1', role: 'tecnico', name: 'Nolve Robles Nava', username: 'nolve' };
assert.strictEqual(sandbox.isTechnicianPlanView(), true, 'Technician on Desktop evaluates to true');
console.log('✓ 4. Technician on Desktop evaluates to true (Technician View).');

// Scenario D: Technician user on Mobile screen
sandbox._isMobile = true;
assert.strictEqual(sandbox.isTechnicianPlanView(), true, 'Technician on Mobile evaluates to true');
console.log('✓ 5. Technician on Mobile evaluates to true (Technician View).');

// Scenario E: URL override ?view=tecnico on Desktop
sandbox._isMobile = false;
sandbox._currentUser = { id: 'usr-admin', role: 'administrador', name: 'Admin', username: 'admin' };
sandbox.window.location.search = '?view=tecnico';
assert.strictEqual(sandbox.isTechnicianPlanView(), true, 'Explicit ?view=tecnico forces technician view');

// Scenario F: URL override ?view=admin on Mobile
sandbox._isMobile = true;
sandbox.window.location.search = '?view=admin';
assert.strictEqual(sandbox.isTechnicianPlanView(), false, 'Explicit ?view=admin forces admin view');
console.log('✓ 6. URL overrides (?view=tecnico / ?view=admin) function accurately.');

// 3. Verify cleanup when switching to desktop
assert(planificarJs.includes("document.body.classList.remove('plan-technician-view')"),
    'Must clean up plan-technician-view when in desktop mode');
assert(planificarJs.includes("bottomNav.style.setProperty('display', 'none', 'important')"),
    'Must hide bottomNav when in desktop mode');

// 4. Verify photo-only WhatsApp sharing (no text URLs)
assert(planificarJs.includes('navigator.share({') && planificarJs.includes('files: [file]'),
    'Mobile WhatsApp sharing must share image file directly without text');
assert(!planificarJs.includes('api.whatsapp.com/send?text='),
    'shareTechnicianCompletion must never send text via WhatsApp URL');

console.log('=== ALL DESKTOP VS TECHNICIAN SEPARATION TESTS PASSED! ===');
