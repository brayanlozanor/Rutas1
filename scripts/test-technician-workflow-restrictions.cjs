const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('Testing Technician Role Workflow, Navigation Restrictions & Productivity...');

// 1. Check common.js
const commonPath = path.join(__dirname, '../public/assets/js/common.js');
const commonCode = fs.readFileSync(commonPath, 'utf8');

// Verify ROLE_PAGE_ACCESS.tecnico
assert(commonCode.includes("tecnico: new Set(['planificar.html', 'login.html'])"), 'tecnico must only have planificar.html and login.html in ROLE_PAGE_ACCESS');
assert(!commonCode.includes("tecnico: new Set(['planificar.html', 'login.html', 'material.html'])"), 'material.html must be removed from technician allowed pages');

// Verify logo redirect for technician
assert(commonCode.includes("const target = role === 'tecnico' ? 'planificar.html' : 'mapa.html'"), 'Logo must link to planificar.html for technician');

// Verify network order notifications are silenced for technician
assert(commonCode.includes("if (normalizeRole(user.role) === 'tecnico') return;"), 'Network order notifications watcher must exit for technician');

// Verify notification center filtering for technician
assert(commonCode.includes("bell.classList.toggle('technician-bell', isTecnico)"), 'Notification bell must have technician-bell class');
assert(commonCode.includes("x.isMaterial || x.category === 'material' || x.type === 'material' || x.isProductivity || x.type === 'productivity'"), 'Technician notification center must strictly filter material and productivity items');

// 2. Check planificar.js
const planPath = path.join(__dirname, '../public/assets/js/planificar.js');
const planCode = fs.readFileSync(planPath, 'utf8');

// Verify material link pill removed
assert(!planCode.includes('href="material.html" class="tech-material-link-pill"'), 'Material link pill pointing to material.html must not exist in technician view');

// Verify progress card element creation
assert(planCode.includes('tech-progress-card'), 'tech-progress-card must be generated for technician');
assert(planCode.includes('tech-progress-bar-fill'), 'tech-progress-bar-fill must be present');
assert(planCode.includes('openTechnicianProductivitySummary'), 'openTechnicianProductivitySummary must be defined');

// Verify morning (8am) and evening (6pm) briefings
assert(planCode.includes('checkAndTriggerTechnicianProductivityBriefings'), 'checkAndTriggerTechnicianProductivityBriefings must be defined');
assert(planCode.includes('morning_brief_'), 'Morning briefing id must be handled');
assert(planCode.includes('evening_brief_'), 'Evening briefing id must be handled');

// Verify mobile header integrated notification bell
assert(planCode.includes('tech-header-bell'), 'tech-header-bell must be present in mobile header');
assert(planCode.includes('tech-mobile-bell-count'), 'tech-mobile-bell-count badge must be present in mobile header');

// Verify call button on details
assert(planCode.includes('tech-call-btn'), 'tech-call-btn must be present for calling client directly');

// Verify navigation button on stops
assert(planCode.includes('tech-nav-direction-btn'), 'tech-nav-direction-btn must be present for stop navigation');

// Verify formal confirmations
assert(planCode.includes('¿Confirma que este detalle de servicio ha sido solucionado satisfactoriamente?'), 'Confirmation prompt for concluding detail must exist');
assert(planCode.includes('¿Confirma el registro de este detalle como no realizado en la visita actual?'), 'Confirmation prompt for incomplete detail must exist');
assert(planCode.includes('Confirmación de recepción física de material'), 'Formal confirmation for material reception must exist');

// 3. Check CSS
const cssPath = path.join(__dirname, '../public/assets/css/technician-dashboard.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

assert(cssContent.includes('.tech-progress-card'), '.tech-progress-card styles must exist');
assert(cssContent.includes('.tech-progress-bar-track'), '.tech-progress-bar-track styles must exist');
assert(cssContent.includes('.tech-progress-bar-fill'), '.tech-progress-bar-fill styles must exist');
assert(cssContent.includes('#notification-bell.technician-bell'), '#notification-bell.technician-bell styles must exist');
assert(cssContent.includes('.tech-call-btn'), '.tech-call-btn styles must exist');
assert(cssContent.includes('.tech-nav-direction-btn'), '.tech-nav-direction-btn styles must exist');

console.log('Technician Workflow, Restrictions, Notifications & Productivity tests: OK');

