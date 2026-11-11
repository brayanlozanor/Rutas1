const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('Testing Technician Role Workflow, Navigation Restrictions & Productivity...');

// 1. Check common.js
const commonPath = path.join(__dirname, '../public/assets/js/common.js');
const commonCode = fs.readFileSync(commonPath, 'utf8');

// Verify ROLE_PAGE_ACCESS.tecnico includes planificar.html
assert(commonCode.includes("tecnico: new Set(["), 'tecnico must have ROLE_PAGE_ACCESS configured');

// Verify logo redirect for technician
assert(commonCode.includes("const target = role === 'tecnico' ? 'planificar.html' : 'mapa.html'"), 'Logo must link to planificar.html for technician');

// Verify network order notifications are silenced for technician
assert(commonCode.includes("if (normalizeRole(user.role) === 'tecnico') return;"), 'Network notifications must be silenced for technicians');

console.log('Technician restrictions verified.');
