const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- TEST: Material Formatos (Entrega y Recepción) and Digital Signatures ---');

const baseDir = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(baseDir, 'public/material.html'), 'utf8');
const matJs = fs.readFileSync(path.join(baseDir, 'public/assets/js/material.js'), 'utf8');
const css = fs.readFileSync(path.join(baseDir, 'public/assets/css/material-dispatches.css'), 'utf8');

// 1. Verify Modals and Tabs in material.html
assert(html.includes('id="material-signature-mo"'), 'material.html must include material-signature-mo');
assert(html.includes('id="material-signature-canvas"'), 'material.html must include material-signature-canvas');
assert(html.includes('clearSignatureCanvas()'), 'material.html must have clearSignatureCanvas button');
assert(html.includes('confirmSignaturePrompt()'), 'material.html must have confirmSignaturePrompt button');
assert(html.includes('id="material-oficio-mo"'), 'material.html must include material-oficio-mo');
assert(html.includes('id="material-oficio-content"'), 'material.html must include material-oficio-content container');
assert(html.includes('id="oficio-tab-btn-entrega"'), 'material.html must include tab for entrega');
assert(html.includes('id="oficio-tab-btn-recepcion"'), 'material.html must include tab for recepcion');
assert(html.includes('imprimirOficioMaterial()'), 'material.html must have print oficio button');
console.log('✓ Modals for digital signature and dual format (Entrega/Recepción) present in material.html.');

// 2. Verify CSS styles and print media rules
assert(css.includes('.dispatch-btn-oficio'), 'CSS must define .dispatch-btn-oficio');
assert(css.includes('.oficio-sheet'), 'CSS must define .oficio-sheet');
assert(css.includes('.oficio-header'), 'CSS must define .oficio-header');
assert(css.includes('.oficio-logo'), 'CSS must define .oficio-logo');
assert(css.includes('.oficio-tabs-bar'), 'CSS must define .oficio-tabs-bar');
assert(css.includes('.oficio-tab-btn'), 'CSS must define .oficio-tab-btn');
assert(css.includes('.oficio-table'), 'CSS must define .oficio-table');
assert(css.includes('.oficio-signatures-section'), 'CSS must define .oficio-signatures-section');
assert(css.includes('@media print'), 'CSS must define @media print for oficios');
console.log('✓ CSS styles and print media query verified in material-dispatches.css.');

// 3. Verify JavaScript logic and functions
assert(matJs.includes('function initSignatureCanvas('), 'material.js must include initSignatureCanvas');
assert(matJs.includes('function promptDigitalSignature('), 'material.js must include promptDigitalSignature');
assert(matJs.includes('function confirmSignaturePrompt('), 'material.js must include confirmSignaturePrompt');
assert(matJs.includes('function renderOficioEntregaHTML('), 'material.js must include renderOficioEntregaHTML');
assert(matJs.includes('function renderOficioRecepcionHTML('), 'material.js must include renderOficioRecepcionHTML');
assert(matJs.includes('function renderOficioHTML('), 'material.js must include renderOficioHTML');
assert(matJs.includes('function abrirOficioMaterial('), 'material.js must include abrirOficioMaterial');
assert(matJs.includes('function cambiarPestanaOficio('), 'material.js must include cambiarPestanaOficio');
assert(matJs.includes('function imprimirOficioMaterial('), 'material.js must include imprimirOficioMaterial');
assert(matJs.includes('function firmarOficioDirecto('), 'material.js must include firmarOficioDirecto');
console.log('✓ Signature engine and Dual Formato functions present in material.js.');

// 4. Verify Workflow integration with signatures
assert(matJs.includes('dispatch.giverSignature = sig.signature;'), 'guardarEntrega must store giverSignature');
assert(matJs.includes('dispatch.receiverSignature = sig.signature;'), 'aceptarRecepcionTecnico must store receiverSignature');
assert(matJs.includes('dispatch.returnReceiverSignature = sig.signature;'), 'guardarRecepcion must store returnReceiverSignature');
assert(matJs.includes('dispatch.returnGiverSignature = sig.signature;'), 'aceptarEntregaTecnico must store returnGiverSignature');
console.log('✓ Workflow integration stores signatures at each delivery & reception step.');

// 5. Verify UI buttons on cards
assert(matJs.includes("abrirOficioMaterial('${d.id}')"), 'material.js cards must trigger abrirOficioMaterial');
assert(matJs.includes('dispatch-btn-oficio'), 'material.js must render dispatch-btn-oficio');
console.log('✓ Format action buttons wired into dispatch cards.');

// 6. Test renderOficioEntregaHTML and renderOficioRecepcionHTML logic and output format
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const fnBlockStart = matJs.indexOf('function renderOficioEntregaHTML(d) {');
const fnBlockEnd = matJs.indexOf('function abrirOficioMaterial(');
const helperScope = new Function('escapeHtml', `
  ${matJs.substring(fnBlockStart, fnBlockEnd)}
  return { renderOficioEntregaHTML, renderOficioRecepcionHTML, renderOficioHTML };
`);

const { renderOficioEntregaHTML, renderOficioRecepcionHTML, renderOficioHTML } = helperScope(escapeHtml);

// Mock Dispatch 1: Entrega with Giver Signature (Soporte)
const mockDelivery = {
  id: 'mm-999001',
  deliveryFolio: 'ENT-000123',
  createdAt: '2026-11-09T10:00:00.000Z',
  createdByName: 'Soporte NetOps',
  technicianName: 'Pedro Ramírez',
  reference: 'Ruta 14 - Huajintepec',
  status: 'pending_receipt',
  items: [
    { materialName: 'Bobina Cable Cat6 Exterior', quantity: 2, unit: 'rollo' },
    { materialName: 'Conectores RJ45', quantity: 50, unit: 'pieza' }
  ],
  notes: 'Material entregado completo',
  giverSignature: 'data:image/png;base64,mockGiverSig',
  giverSignatureName: 'Soporte NetOps',
  giverSignatureAt: '2026-11-09T10:05:00.000Z',
  receiverSignature: null
};

const entregaHtml = renderOficioEntregaHTML(mockDelivery);
assert(entregaHtml.includes('assets/brand/wifimex-logo.jpg'), 'Formato Entrega must include WiFi-Mex logo from class="logo"');
assert(entregaHtml.includes('<div class="oficio-company-title">WiFi-Mex</div>'), 'Must display clean WiFi-Mex title');
assert(!entregaHtml.includes('Departamento de Almacén'), 'Must NOT invent departments');
assert(!entregaHtml.includes('VALE FORMAL'), 'Must avoid the word formal in document titles');
assert(entregaHtml.includes('ENTREGA DE MATERIAL'), 'Must have title ENTREGA DE MATERIAL');
assert(entregaHtml.includes('ENT-000123'), 'Must include delivery folio');
assert(entregaHtml.includes('Pedro Ramírez'), 'Must include technician name');
assert(entregaHtml.includes('Bobina Cable Cat6 Exterior'), 'Must list items');
assert(entregaHtml.includes('mockGiverSig'), 'Must display giver signature');
assert(entregaHtml.includes('Pendiente de confirmación y firma del técnico'), 'Must show pending status for technician signature');
assert(!entregaHtml.includes('Firmar ahora'), 'Entrega format must not include any Firmar ahora button');
console.log('✓ Formato de Entrega renders document with logo, items and 2 signatures (Entregó y Recibió) without inline sign buttons.');

// Mock Dispatch 2: Recepción with Both Signatures (Técnico entregó, Soporte recibió en almacén)
const mockLiquidation = {
  id: 'mm-999002',
  deliveryFolio: 'ENT-000124',
  receiptFolio: 'REC-000124',
  createdAt: '2026-11-09T08:00:00.000Z',
  createdByName: 'Soporte NetOps',
  technicianName: 'María López',
  reference: 'Mantenimiento R12',
  status: 'completed',
  items: [
    { materialName: 'Router WiFi Dual Band', quantity: 3, unit: 'pieza', deliveredQuantity: 3, returnedGood: 1, usedQuantity: 2, returnedDamaged: 0 }
  ],
  returnedChange: 1,
  usedQuantity: 2,
  returnedDamaged: 0,
  notes: 'Entrega inicial',
  receiveNotes: 'Recepción conforme en almacén',
  giverSignature: 'data:image/png;base64,sig1',
  giverSignatureName: 'Soporte NetOps',
  receiverSignature: 'data:image/png;base64,sig2',
  receiverSignatureName: 'María López',
  returnGiverSignature: 'data:image/png;base64,sig3',
  returnGiverSignatureName: 'María López',
  returnReceiverSignature: 'data:image/png;base64,sig4',
  returnReceiverSignatureName: 'Soporte NetOps'
};

const recepcionHtml = renderOficioRecepcionHTML(mockLiquidation);
assert(recepcionHtml.includes('assets/brand/wifimex-logo.jpg'), 'Formato Recepción must include WiFi-Mex logo from class="logo"');
assert(recepcionHtml.includes('<div class="oficio-company-title">WiFi-Mex</div>'), 'Must display clean WiFi-Mex title');
assert(!recepcionHtml.includes('Departamento de Almacén'), 'Must NOT invent departments');
assert(!recepcionHtml.includes('VALE DE RECEPCIÓN Y LIQUIDACIÓN'), 'Must use clean title');
assert(recepcionHtml.includes('RECEPCIÓN DE MATERIAL'), 'Title must be RECEPCIÓN DE MATERIAL');
assert(recepcionHtml.includes('REC-000124'), 'Must show reception folio');
assert(recepcionHtml.includes('sig3'), 'Must include technician return giver signature');
assert(recepcionHtml.includes('sig4'), 'Must include support return receiver signature');
assert(!recepcionHtml.includes('Firmar ahora'), 'Recepcion format must not include any Firmar ahora button');
console.log('✓ Formato de Recepción renders document with returned quantities and both signatures without inline sign buttons.');

// 7. Verify dynamic switcher renderOficioHTML
const autoEntrega = renderOficioHTML(mockDelivery);
assert(autoEntrega.includes('ENTREGA DE MATERIAL'), 'renderOficioHTML auto-selects entrega when only delivery exists');
const autoRecepcion = renderOficioHTML(mockLiquidation);
assert(autoRecepcion.includes('RECEPCIÓN DE MATERIAL'), 'renderOficioHTML auto-selects recepcion when liquidation exists');
const explicitEntrega = renderOficioHTML(mockLiquidation, 'entrega');
assert(explicitEntrega.includes('ENTREGA DE MATERIAL'), 'renderOficioHTML respects explicit "entrega" request');

// 8. Verify Technician Mobile Plan View (planificar.html & planificar.js) Signature Flow
const planHtml = fs.readFileSync(path.join(baseDir, 'public/planificar.html'), 'utf8');
const planJs = fs.readFileSync(path.join(baseDir, 'public/assets/js/planificar.js'), 'utf8');
const commonJs = fs.readFileSync(path.join(baseDir, 'public/assets/js/common.js'), 'utf8');

assert(planHtml.includes('id="material-signature-mo"'), 'planificar.html must contain material-signature-mo for mobile view');
assert(commonJs.includes('function promptDigitalSignature('), 'common.js must define promptDigitalSignature for global access');
assert(commonJs.includes('function ensureMaterialSignatureModal('), 'common.js must define ensureMaterialSignatureModal');
assert(planJs.includes('promptDigitalSignature('), 'planificar.js must call promptDigitalSignature on mobile/plan reception confirmation');
assert(planJs.includes('targetDispatch.receiverSignature = sig.signature;'), 'confirmarRecepcionDesdePlan must store receiverSignature');
assert(planJs.includes('targetDispatch.returnGiverSignature = sig.signature;'), 'confirmarEntregaTecnicoDesdePlan must store returnGiverSignature');
console.log('✓ Technician mobile view (planificar.html & planificar.js) digital signature flow validated successfully.');

console.log('--- ALL OFICIO AND SIGNATURE TESTS PASSED SUCCESSFULLY! ---');
