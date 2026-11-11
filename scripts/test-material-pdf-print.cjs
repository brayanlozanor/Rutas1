const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- TEST: Material Oficio PDF & Print Isolation ---');

const baseDir = path.resolve(__dirname, '..');
const matJs = fs.readFileSync(path.join(baseDir, 'public/assets/js/material.js'), 'utf8');
const matCss = fs.readFileSync(path.join(baseDir, 'public/assets/css/material-dispatches.css'), 'utf8');
const matHtml = fs.readFileSync(path.join(baseDir, 'public/material.html'), 'utf8');

// 1. Verify iframe print engine in material.js
assert(matJs.includes('function imprimirOficioMaterial('), 'material.js must implement imprimirOficioMaterial');
assert(matJs.includes('netops-oficio-print-iframe'), 'imprimirOficioMaterial must isolate printing via clean iframe');
assert(matJs.includes('iframe.contentWindow.print()'), 'imprimirOficioMaterial must call print on isolated iframe');
assert(matJs.includes('@page {'), 'imprimirOficioMaterial must define @page letter portrait rules');
assert(matJs.includes('print-color-adjust: exact'), 'imprimirOficioMaterial must preserve background colors for print');
console.log('✓ Test 1 Passed: Isolated iframe print engine prevents page bleed and unwanted elements.');

// 2. Verify media print rules in material-dispatches.css
assert(matCss.includes('@media print'), 'material-dispatches.css must have @media print');
assert(matCss.includes('.topbar.app-sidebar') && matCss.includes('.material-dashboard'),
  'media print must hide topbar sidebar and material dashboard');
assert(matCss.includes('.topbar.app-sidebar .nav:before') || matCss.includes('.topbar:before'),
  'media print must neutralize sidebar pseudo-elements like MENU PRINCIPAL');
assert(matCss.includes('display: none !important;'), 'media print must use display: none !important to eliminate layout space');
assert(matCss.includes('#material-oficio-mo'), 'media print must position and display #material-oficio-mo cleanly');
console.log('✓ Test 2 Passed: CSS print media rules eliminate sidebar, navigation and dashboard from layout.');

// 3. Verify HTML and button wiring
assert(matHtml.includes('onclick="imprimirOficioMaterial()"'), 'material.html button must trigger imprimirOficioMaterial()');
assert(matHtml.includes('id="material-oficio-content"'), 'material.html must provide material-oficio-content');
console.log('✓ Test 3 Passed: Print action is properly wired in material.html.');

console.log('\n--- ALL MATERIAL PDF & PRINT TESTS PASSED! ---');

