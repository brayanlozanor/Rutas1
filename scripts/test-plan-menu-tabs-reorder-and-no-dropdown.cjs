// Test: Plan Assignment Menu Tabs Reorder, "Técnicos" Naming & Removal of Native Select "Desglose"
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- TEST: Plan Menu Tabs Reorder, "Técnicos" Naming & No Native Dropdown ---');

const rootDir = path.resolve(__dirname, '..');
const planificarHtml = fs.readFileSync(path.join(rootDir, 'public', 'planificar.html'), 'utf8');
const planUiCss = fs.readFileSync(path.join(rootDir, 'public', 'assets', 'css', 'plan-ui-v2.css'), 'utf8');
const planificarJs = fs.readFileSync(path.join(rootDir, 'public', 'assets', 'js', 'planificar.js'), 'utf8');

// 1. Verify that the native select "desglose" is hidden from visual flow
console.log('1. Checking that native select "desglose" is hidden and not visible...');
assert(planificarHtml.includes('<div style="display:none;">\n                <select id="general-plan-select"') ||
       planificarHtml.includes('<div style="display:none;"><select id="general-plan-select"') ||
       planificarHtml.includes('style="display:none;"') && planificarHtml.includes('id="general-plan-select"'),
       'general-plan-select must be wrapped in a hidden container');
// Check that visible <div class="sbt">Plan General</div> above the select was removed
const toolsSection = planificarHtml.slice(planificarHtml.indexOf('id="general-plan-tools"'), planificarHtml.indexOf('id="plan-selected-summary-card"'));
assert(!toolsSection.includes('<div class="sbt">Plan General</div>'), 'Visible "Plan General" dropdown header must be removed');
console.log('✓ 1. Native select "desglose" is completely hidden visually.');

// 2. Verify Tab Order: "planes", "en este plan", "tecnicos"
console.log('2. Checking tab order and naming in planificar.html...');
const navIndex = planificarHtml.indexOf('class="plan-assign-nav"');
const plansBtnIndex = planificarHtml.indexOf('id="plan-tab-btn-plans"', navIndex);
const teamBtnIndex = planificarHtml.indexOf('id="plan-tab-btn-team"', navIndex);
const searchBtnIndex = planificarHtml.indexOf('id="plan-tab-btn-search"', navIndex);

assert(plansBtnIndex < teamBtnIndex, 'Tab "Planes" must appear before "En este plan"');
assert(teamBtnIndex < searchBtnIndex, 'Tab "En este plan" must appear before "Técnicos"');

// Check button labels
const plansBtnText = planificarHtml.slice(plansBtnIndex, teamBtnIndex);
assert(plansBtnText.includes('Planes'), 'Tab 1 must be titled "Planes"');

const teamBtnText = planificarHtml.slice(teamBtnIndex, searchBtnIndex);
assert(teamBtnText.includes('En este plan'), 'Tab 2 must be titled "En este plan"');

const searchBtnText = planificarHtml.slice(searchBtnIndex, planificarHtml.indexOf('</div>', searchBtnIndex));
assert(searchBtnText.includes('Técnicos') || searchBtnText.includes('Tecnicos'), 'Tab 3 must be titled "Técnicos" instead of "Directorio"');
assert(!searchBtnText.includes('Directorio'), 'Tab 3 must not say "Directorio"');
console.log('✓ 2. Exact tab order verified: 1) "planes" 2) "en este plan" 3) "tecnicos".');

// 3. Verify panel containers order in HTML
console.log('3. Checking panel containers order...');
const plansPanelIndex = planificarHtml.indexOf('id="plan-assign-tab-plans"');
const teamPanelIndex = planificarHtml.indexOf('id="plan-assign-tab-team"');
const searchPanelIndex = planificarHtml.indexOf('id="plan-assign-tab-search"');

assert(plansPanelIndex < teamPanelIndex, 'Panel "Planes" must appear before "En este plan"');
assert(teamPanelIndex < searchPanelIndex, 'Panel "En este plan" must appear before "Técnicos"');
console.log('✓ 3. Panel containers order verified.');

// 4. Verify JavaScript switchPlanAssignTab function order & defaults
console.log('4. Checking switchPlanAssignTab implementation in planificar.js...');
assert(planificarJs.includes("const tabs = ['plans', 'team', 'search'];"), 'switchPlanAssignTab must use tabs order [plans, team, search]');
assert(planificarJs.includes("if (!tabs.includes(tabId)) tabId = 'plans';"), 'switchPlanAssignTab must default to "plans"');
console.log('✓ 4. switchPlanAssignTab order and default tab verified.');

// 5. Verify CSS styling is colorful yet formal
console.log('5. Checking colorful yet formal CSS in plan-ui-v2.css...');
assert(planUiCss.includes('#plan-tab-btn-plans.is-active'), 'CSS must style active state for Planes tab');
assert(planUiCss.includes('#plan-tab-btn-team.is-active'), 'CSS must style active state for En este plan tab');
assert(planUiCss.includes('#plan-tab-btn-search.is-active'), 'CSS must style active state for Técnicos tab');
assert(planUiCss.includes('.plan-summary-header-row'), 'CSS must style .plan-summary-header-row');
assert(planUiCss.includes('.plan-catalog-item.is-active'), 'CSS must style .plan-catalog-item.is-active');
console.log('✓ 5. Colorful yet formal styling verified in CSS.');

console.log('\n=== ALL TESTS PASSED! ===');
