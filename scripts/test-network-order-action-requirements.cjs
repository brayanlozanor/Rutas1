const fs = require('fs');

const orders = fs.readFileSync('public/assets/js/ordenes.js','utf8');
const common = fs.readFileSync('public/assets/js/common.js','utf8');

const requirements = [
  [orders.includes('id="order-action-form" class="order-action-form" hidden'), 'El formulario por acción debe iniciar oculto'],
  [orders.includes("showOrderActionForm('${orderEscape(id)}','same')"), 'Sigue el mismo tema debe abrir Información nueva'],
  [orders.includes("showOrderActionForm('${orderEscape(id)}','reviewed')"), 'Revisado debe abrir su formulario'],
  [orders.includes('Describe qué se hizo para intentar solucionarlo.'), 'Revisado debe exigir la explicación'],
  [orders.includes("showOrderActionForm('${orderEscape(id)}','physical')"), 'Detalle físico debe abrir su formulario'],
  [orders.includes('Describe el detalle físico que se presentó.'), 'Detalle físico debe exigir el problema detectado'],
  [orders.includes("if (order.detailKind !== 'network') return notify('Estas acciones solo están disponibles para detalles de red.'"), 'El modal de acciones debe rechazar detalles físicos'],
  [orders.includes("${w.detailKind === 'network' ? `<button class=\"btn order-workflow-action\""), 'El botón de acciones solo debe renderizarse para detalles de red'],
  [orders.includes('requireEvidence:true') && orders.includes('freshEvidence:true'), 'La solución de red debe exigir evidencia nueva'],
  [common.includes('options.requireEvidence && !adminDetailCompletionPhotos.length'), 'El cierre debe bloquearse sin evidencia'],
  [common.includes('options.forceInformation && !includeInformation'), 'El cierre rápido debe quedar bloqueado cuando se exige evidencia']
];

for (const [valid,message] of requirements) {
  if (!valid) throw new Error(message);
}

console.log('Network evidence and per-action information requirements: OK');
