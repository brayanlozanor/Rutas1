let currentMaterialId = null;
let materialCurrentPage = 1;
let materialPageSize = 20;
let materialLoadSequence = 0;
let materialTechnicianDirectoryLoaded = false;
let materialPhotoData = '';

let dispatchCurrentPage = 1;
const dispatchPageSize = 8;

let activeAdminMainTab = 'dispatches'; // 'dispatches' | 'catalog'

/* ==========================================================================
   MOTOR DE FIRMA DIGITAL Y GENERADOR DE OFICIO FORMAL DE MATERIAL
   ========================================================================== */
function initSignatureCanvas() {
  if (typeof window !== 'undefined' && typeof window._systemInitSignatureCanvas === 'function') {
    return window._systemInitSignatureCanvas();
  }
}

function clearSignatureCanvas() {
  if (typeof window !== 'undefined' && typeof window._systemClearSignatureCanvas === 'function') {
    return window._systemClearSignatureCanvas();
  }
}

function promptDigitalSignature(opts) {
  if (typeof window !== 'undefined' && typeof window._systemPromptDigitalSignature === 'function') {
    return window._systemPromptDigitalSignature(opts);
  }
  return Promise.resolve(null);
}

function confirmSignaturePrompt() {
  if (typeof window !== 'undefined' && typeof window._systemConfirmSignaturePrompt === 'function') {
    return window._systemConfirmSignaturePrompt();
  }
}

function cancelSignaturePrompt() {
  if (typeof window !== 'undefined' && typeof window._systemCancelSignaturePrompt === 'function') {
    return window._systemCancelSignaturePrompt();
  }
}

let activeOficioDispatchId = null;
let activeOficioType = 'entrega';

function renderOficioEntregaHTML(d) {
  const items = Array.isArray(d.items) && d.items.length 
    ? d.items 
    : [{ materialName: d.materialName || 'Material', quantity: d.quantity || 0, unit: d.unit || 'pieza' }];

  const totalDelivered = items.reduce((sum, it) => sum + (Number(it.quantity) || Number(it.deliveredQuantity) || 0), 0);

  const rowsHtml = items.map((it, idx) => {
    const qtyDelivered = Number(it.quantity) || Number(it.deliveredQuantity) || 0;
    const unit = it.unit || d.unit || 'pieza';
    return `
      <tr>
        <td style="text-align: center; font-weight: 700; color: #64748b;">${idx + 1}</td>
        <td style="font-weight: 600;">${escapeHtml(it.materialName)}</td>
        <td style="text-align: right; font-weight: 700;">${qtyDelivered}</td>
        <td style="text-align: center; color: #475569;">${escapeHtml(unit)}</td>
        <td style="color: #64748b;">${escapeHtml(it.notes || it.obs || 'Entregado')}</td>
      </tr>
    `;
  }).join('');

  const statusLabel = d.receiverSignature || d.status === 'received' || d.status === 'completed' || d.status === 'pending_handover'
    ? '<span style="color:#047857;font-weight:800">✓ RECIBIDO Y CONFIRMADO</span>'
    : '<span style="color:#d97706;font-weight:800">⏳ PENDIENTE DE CONFIRMACIÓN DEL TÉCNICO</span>';

  return `
    <div class="oficio-sheet">
      <!-- ENCABEZADO CON LOGO WIFIMEX -->
      <div class="oficio-header">
        <div class="oficio-brand-col">
          <img src="assets/brand/wifimex-logo.jpg" alt="WiFi-Mex" class="oficio-logo">
          <div>
            <div class="oficio-company-title">WiFi-Mex</div>
          </div>
        </div>
        <div class="oficio-doc-col">
          <div class="oficio-type-title">ENTREGA DE MATERIAL</div>
          <div class="oficio-folio-badge">${escapeHtml(d.deliveryFolio || d.folio || ('ENT-' + String(d.id || '').slice(-6).toUpperCase()))}</div>
          <div class="oficio-date-text">Emisión: ${new Date(d.createdAt || d.at || Date.now()).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</div>
        </div>
      </div>

      <!-- METADATOS GENERALES -->
      <div class="oficio-meta-box">
        <div class="oficio-meta-item">
          <small>Entregado por</small>
          <strong>${escapeHtml(d.giverSignatureName || d.createdByName || 'Soporte')}</strong>
        </div>
        <div class="oficio-meta-item">
          <small>Recibido por (Técnico)</small>
          <strong>${escapeHtml(d.receiverSignatureName || d.technicianName || 'Técnico')}</strong>
        </div>
        <div class="oficio-meta-item">
          <small>Referencia</small>
          <strong>${escapeHtml(d.reference || 'Operación general de ruta')}</strong>
        </div>
        <div class="oficio-meta-item">
          <small>Estado</small>
          <div>${statusLabel}</div>
        </div>
      </div>

      <!-- TABLA DE MATERIALES -->
      <div class="oficio-table-wrap">
        <table class="oficio-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th>Material / Insumo</th>
              <th style="text-align: right; width: 120px;">Entregado</th>
              <th style="text-align: center; width: 90px;">Unidad</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="text-align: right;">TOTAL:</td>
              <td style="text-align: right;">${totalDelivered}</td>
              <td style="text-align: center;">-</td>
              <td>${items.length} partida(s)</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- OBSERVACIONES -->
      ${d.notes ? `
        <div class="oficio-notes-box">
          <div class="oficio-notes-title">Observaciones de entrega:</div>
          <div>${escapeHtml(d.notes)}</div>
        </div>
      ` : ''}

      <!-- CONSTANCIA -->
      <div class="oficio-legal-clause">
        "Se hace constar la entrega y recepción física de los materiales detallados. El técnico asume el resguardo y buen uso de los mismos para los trabajos asignados en WiFi-Mex."
      </div>

      <!-- CUADRO DE FIRMAS (ENTREGA) -->
      <div class="oficio-signatures-section">
        <div class="oficio-signature-card">
          <div class="oficio-signature-kicker">ENTREGÓ</div>
          <div class="oficio-signature-box">
            ${d.giverSignature ? `
              <img src="${d.giverSignature}" alt="Firma Entrega" class="oficio-signature-img">
            ` : `
              <div class="oficio-signature-pending">
                <span>[ Pendiente de firma de entrega ]</span>
              </div>
            `}
          </div>
          <div class="oficio-signature-name">${escapeHtml(d.giverSignatureName || d.createdByName || 'Soporte')}</div>
          <div class="oficio-signature-role">Entrega (Soporte)</div>
          ${d.giverSignatureAt ? `<div class="oficio-signature-timestamp">Firmado: ${new Date(d.giverSignatureAt).toLocaleString('es-MX', { dateStyle:'short', timeStyle:'short' })}</div>` : ''}
        </div>

        <div class="oficio-signature-card">
          <div class="oficio-signature-kicker">RECIBIÓ DE CONFORMIDAD</div>
          <div class="oficio-signature-box">
            ${d.receiverSignature ? `
              <img src="${d.receiverSignature}" alt="Firma Recepción" class="oficio-signature-img">
            ` : `
              <div class="oficio-signature-pending">
                <span>[ Pendiente de confirmación y firma del técnico ]</span>
              </div>
            `}
          </div>
          <div class="oficio-signature-name">${escapeHtml(d.receiverSignatureName || d.acceptedByName || d.technicianName || 'Técnico')}</div>
          <div class="oficio-signature-role">Recibe (Técnico)</div>
          ${d.receiverSignatureAt ? `<div class="oficio-signature-timestamp">Firmado: ${new Date(d.receiverSignatureAt).toLocaleString('es-MX', { dateStyle:'short', timeStyle:'short' })}</div>` : ''}
        </div>
      </div>
    </div>
  `;
}

function renderOficioRecepcionHTML(d) {
  const items = Array.isArray(d.items) && d.items.length 
    ? d.items 
    : [{ materialName: d.materialName || 'Material', quantity: d.quantity || 0, unit: d.unit || 'pieza' }];

  const totalDelivered = items.reduce((sum, it) => sum + (Number(it.quantity) || Number(it.deliveredQuantity) || 0), 0);
  const totalUsed = Number(d.usedQuantity) || 0;
  const totalReturned = Number(d.returnedChange) || 0;
  const totalDamaged = Number(d.returnedDamaged) || 0;

  const rowsHtml = items.map((it, idx) => {
    const qtyDelivered = Number(it.quantity) || Number(it.deliveredQuantity) || 0;
    const qtyUsed = it.usedQuantity !== undefined ? Number(it.usedQuantity) : (items.length === 1 ? totalUsed : '-');
    const qtyReturned = it.returnedGood !== undefined ? Number(it.returnedGood) : (items.length === 1 ? totalReturned : '-');
    const qtyDamaged = it.returnedDamaged !== undefined ? Number(it.returnedDamaged) : (items.length === 1 ? totalDamaged : '-');
    const unit = it.unit || d.unit || 'pieza';

    return `
      <tr>
        <td style="text-align: center; font-weight: 700; color: #64748b;">${idx + 1}</td>
        <td style="font-weight: 600;">${escapeHtml(it.materialName)}</td>
        <td style="text-align: right; font-weight: 700;">${qtyDelivered}</td>
        <td style="text-align: right; color: #0284c7; font-weight: 600;">${qtyUsed}</td>
        <td style="text-align: right; color: #059669; font-weight: 700;">${qtyReturned}</td>
        <td style="text-align: right; color: ${qtyDamaged > 0 ? '#dc2626' : '#64748b'}; font-weight: 600;">${qtyDamaged}</td>
        <td style="text-align: center; color: #475569;">${escapeHtml(unit)}</td>
        <td style="color: #64748b;">${escapeHtml(it.notes || it.obs || 'Conforme')}</td>
      </tr>
    `;
  }).join('');

  const statusLabel = d.returnReceiverSignature || d.status === 'completed'
    ? '<span style="color:#047857;font-weight:800">✓ RECEPCIÓN FINALIZADA</span>'
    : (d.status === 'pending_handover'
      ? '<span style="color:#c2410c;font-weight:800">⏳ PENDIENTE DE CONFIRMACIÓN DE SOPORTE</span>'
      : '<span style="color:#d97706;font-weight:800">⏳ EN PROCESO DE DEVOLUCIÓN</span>');

  return `
    <div class="oficio-sheet">
      <!-- ENCABEZADO CON LOGO WIFIMEX -->
      <div class="oficio-header">
        <div class="oficio-brand-col">
          <img src="assets/brand/wifimex-logo.jpg" alt="WiFi-Mex" class="oficio-logo">
          <div>
            <div class="oficio-company-title">WiFi-Mex</div>
          </div>
        </div>
        <div class="oficio-doc-col">
          <div class="oficio-type-title">RECEPCIÓN DE MATERIAL</div>
          <div class="oficio-folio-badge">${escapeHtml(d.receiptFolio || ('REC-' + String(d.id || '').slice(-6).toUpperCase()))}</div>
          <div class="oficio-date-text">Emisión: ${new Date(d.receivedAt || d.returnReceiverSignatureAt || d.returnGiverSignatureAt || d.updatedAt || Date.now()).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</div>
        </div>
      </div>

      <!-- METADATOS GENERALES -->
      <div class="oficio-meta-box">
        <div class="oficio-meta-item">
          <small>Entregado por (Técnico)</small>
          <strong>${escapeHtml(d.returnGiverSignatureName || d.technicianName || 'Técnico')}</strong>
        </div>
        <div class="oficio-meta-item">
          <small>Recibido por (Soporte)</small>
          <strong>${escapeHtml(d.returnReceiverSignatureName || d.receivedByAdminName || d.createdByName || 'Soporte')}</strong>
        </div>
        <div class="oficio-meta-item">
          <small>Referencia</small>
          <strong>${escapeHtml(d.reference || 'Liquidación y devolución de material')}</strong>
        </div>
        <div class="oficio-meta-item">
          <small>Estado</small>
          <div>${statusLabel}</div>
        </div>
      </div>

      <!-- TABLA DE MATERIALES -->
      <div class="oficio-table-wrap">
        <table class="oficio-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th>Material / Insumo</th>
              <th style="text-align: right; width: 90px;">Entregado</th>
              <th style="text-align: right; width: 85px;">Utilizado</th>
              <th style="text-align: right; width: 85px;">Devuelto</th>
              <th style="text-align: right; width: 80px;">Dañado</th>
              <th style="text-align: center; width: 75px;">Unidad</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="text-align: right;">TOTALES:</td>
              <td style="text-align: right;">${totalDelivered}</td>
              <td style="text-align: right;">${totalUsed}</td>
              <td style="text-align: right;">${totalReturned}</td>
              <td style="text-align: right;">${totalDamaged}</td>
              <td style="text-align: center;">-</td>
              <td>${items.length} partida(s)</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- OBSERVACIONES -->
      ${d.receiveNotes || d.returnDetails?.adminNotes ? `
        <div class="oficio-notes-box">
          <div class="oficio-notes-title">Observaciones de recepción:</div>
          <div>${escapeHtml(d.receiveNotes || d.returnDetails?.adminNotes)}</div>
        </div>
      ` : ''}

      <!-- CONSTANCIA -->
      <div class="oficio-legal-clause">
        "Se hace constar la entrega física del material sobrante y el reporte del material utilizado por parte del técnico, así como la recepción física y conformidad por parte de WiFi-Mex."
      </div>

      <!-- CUADRO DE FIRMAS (RECEPCIÓN) -->
      <div class="oficio-signatures-section">
        <div class="oficio-signature-card">
          <div class="oficio-signature-kicker">ENTREGÓ</div>
          <div class="oficio-signature-box">
            ${d.returnGiverSignature ? `
              <img src="${d.returnGiverSignature}" alt="Firma Entrega Técnico" class="oficio-signature-img">
            ` : `
              <div class="oficio-signature-pending">
                <span>[ Pendiente de entrega y firma del técnico ]</span>
              </div>
            `}
          </div>
          <div class="oficio-signature-name">${escapeHtml(d.returnGiverSignatureName || d.handoverAcceptedByName || d.technicianName || 'Técnico')}</div>
          <div class="oficio-signature-role">Entrega (Técnico)</div>
          ${d.returnGiverSignatureAt ? `<div class="oficio-signature-timestamp">Firmado: ${new Date(d.returnGiverSignatureAt).toLocaleString('es-MX', { dateStyle:'short', timeStyle:'short' })}</div>` : ''}
        </div>

        <div class="oficio-signature-card">
          <div class="oficio-signature-kicker">RECIBIÓ DE CONFORMIDAD</div>
          <div class="oficio-signature-box">
            ${d.returnReceiverSignature ? `
              <img src="${d.returnReceiverSignature}" alt="Firma Recepción Soporte" class="oficio-signature-img">
            ` : `
              <div class="oficio-signature-pending">
                <span>[ Pendiente de confirmación y firma de Soporte ]</span>
              </div>
            `}
          </div>
          <div class="oficio-signature-name">${escapeHtml(d.returnReceiverSignatureName || d.receivedByAdminName || d.createdByName || 'Soporte')}</div>
          <div class="oficio-signature-role">Recibe (Soporte)</div>
          ${d.returnReceiverSignatureAt ? `<div class="oficio-signature-timestamp">Firmado: ${new Date(d.returnReceiverSignatureAt).toLocaleString('es-MX', { dateStyle:'short', timeStyle:'short' })}</div>` : ''}
        </div>
      </div>
    </div>
  `;
}

function renderOficioHTML(d, requestedType) {
  const hasReception = d.status === 'completed' || d.status === 'pending_handover' || d.returnedChange > 0 || d.usedQuantity > 0 || !!d.returnDetails;
  const type = requestedType || (hasReception ? 'recepcion' : 'entrega');
  if (type === 'recepcion') {
    return renderOficioRecepcionHTML(d);
  }
  return renderOficioEntregaHTML(d);
}

function abrirOficioMaterial(dispatchId, tipo) {
  const all = getAllDispatches();
  const d = all.find(item => item.id === dispatchId);
  if (!d) return notify('No se encontró el formato para este movimiento.', 'err');

  activeOficioDispatchId = dispatchId;
  const hasReception = d.status === 'completed' || d.status === 'pending_handover' || d.returnedChange > 0 || d.usedQuantity > 0 || !!d.returnDetails;
  
  if (tipo) {
    activeOficioType = tipo;
  } else if (hasReception) {
    activeOficioType = 'recepcion';
  } else {
    activeOficioType = 'entrega';
  }

  const tabEntrega = document.getElementById('oficio-tab-btn-entrega');
  const tabRecepcion = document.getElementById('oficio-tab-btn-recepcion');
  if (tabEntrega) tabEntrega.classList.toggle('active', activeOficioType === 'entrega');
  if (tabRecepcion) {
    tabRecepcion.classList.toggle('active', activeOficioType === 'recepcion');
    tabRecepcion.style.display = hasReception ? 'inline-flex' : 'none';
  }

  const container = document.getElementById('material-oficio-content');
  if (container) {
    container.innerHTML = renderOficioHTML(d, activeOficioType);
  }
  OM('material-oficio-mo');
}

function cambiarPestanaOficio(tipo) {
  if (!activeOficioDispatchId) return;
  abrirOficioMaterial(activeOficioDispatchId, tipo);
}

function imprimirOficioMaterial() {
  const contentEl = document.getElementById('material-oficio-content');
  if (!contentEl) {
    window.print();
    return;
  }
  const sheet = contentEl.querySelector('.oficio-sheet');
  if (!sheet) {
    window.print();
    return;
  }

  // Título oficial descriptivo para el PDF generado
  const docType = sheet.querySelector('.oficio-type-title')?.textContent?.trim() || 'Formato de Material';
  const folio = sheet.querySelector('.oficio-folio-badge')?.textContent?.trim() || '';
  const pageTitle = `WiFi-Mex - ${docType}${folio ? ' ' + folio : ''}`;

  // Eliminar iframe previo si existiera
  const oldIframe = document.getElementById('netops-oficio-print-iframe');
  if (oldIframe) {
    try { oldIframe.remove(); } catch (e) {}
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'netops-oficio-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title></title>
  <base href="${window.location.origin}/">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: letter portrait;
      margin: 0;
    }
    *, *:before, *:after {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 12mm 14mm !important;
      background: #ffffff !important;
      color: #0f172a !important;
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 12px;
      line-height: 1.35;
      width: 100% !important;
      height: auto !important;
      box-sizing: border-box !important;
    }
    .oficio-sheet {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 auto !important;
      padding: 0 !important;
      background: #ffffff !important;
      border: none !important;
      box-shadow: none !important;
      border-radius: 0 !important;
    }
    .oficio-header {
      display: flex !important;
      justify-content: space-between !important;
      align-items: flex-start !important;
      gap: 16px !important;
      border-bottom: 2px solid #0f172a !important;
      padding-bottom: 10px !important;
      margin-bottom: 12px !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .oficio-brand-col {
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
    }
    .oficio-logo {
      height: 46px !important;
      max-width: 160px !important;
      width: auto !important;
      object-fit: contain !important;
    }
    .oficio-company-title {
      font-size: 16px !important;
      font-weight: 800 !important;
      color: #0f172a !important;
      letter-spacing: -0.01em !important;
      line-height: 1.2 !important;
    }
    .oficio-company-sub {
      font-size: 11px !important;
      color: #475569 !important;
      margin-top: 2px !important;
    }
    .oficio-doc-col {
      text-align: right !important;
      min-width: 200px !important;
    }
    .oficio-type-title {
      font-size: 13px !important;
      font-weight: 800 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.05em !important;
      color: #0284c7 !important;
      margin-bottom: 3px !important;
    }
    .oficio-folio-badge {
      display: inline-block !important;
      background: #0f172a !important;
      color: #ffffff !important;
      padding: 3px 8px !important;
      border-radius: 6px !important;
      font-family: 'Space Mono', monospace !important;
      font-size: 12px !important;
      font-weight: 700 !important;
      letter-spacing: 0.05em !important;
    }
    .oficio-date-text {
      font-size: 10.5px !important;
      color: #64748b !important;
      margin-top: 3px !important;
    }
    .oficio-meta-box {
      background: #f8fafc !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 8px !important;
      padding: 8px 12px !important;
      margin-bottom: 12px !important;
      display: grid !important;
      grid-template-columns: repeat(4, 1fr) !important;
      gap: 8px 12px !important;
      font-size: 11px !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .oficio-meta-item small {
      display: block !important;
      font-size: 9.5px !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.05em !important;
      color: #64748b !important;
      margin-bottom: 2px !important;
    }
    .oficio-meta-item strong {
      color: #0f172a !important;
      font-size: 11.5px !important;
    }
    .oficio-table-wrap {
      margin-bottom: 12px !important;
      border: 1px solid #94a3b8 !important;
      border-radius: 6px !important;
      overflow: visible !important;
    }
    .oficio-table {
      width: 100% !important;
      border-collapse: collapse !important;
      font-size: 11px !important;
      text-align: left !important;
    }
    .oficio-table th {
      background: #0f172a !important;
      color: #ffffff !important;
      padding: 7px 9px !important;
      font-weight: 700 !important;
      font-size: 10px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.04em !important;
      border-right: 1px solid #334155 !important;
    }
    .oficio-table th:last-child {
      border-right: none !important;
    }
    .oficio-table td {
      padding: 6px 9px !important;
      border-bottom: 1px solid #e2e8f0 !important;
      border-right: 1px solid #f1f5f9 !important;
      color: #1e293b !important;
    }
    .oficio-table td:last-child {
      border-right: none !important;
    }
    .oficio-table tbody tr:nth-child(even) {
      background: #f8fafc !important;
    }
    .oficio-table tfoot td {
      background: #f1f5f9 !important;
      font-weight: 800 !important;
      color: #0f172a !important;
      border-top: 2px solid #94a3b8 !important;
      padding: 7px 9px !important;
    }
    .oficio-notes-box {
      background: #fdfefe !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 6px !important;
      padding: 7px 10px !important;
      margin-bottom: 10px !important;
      font-size: 10.5px !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .oficio-notes-title {
      font-size: 9px !important;
      font-weight: 800 !important;
      text-transform: uppercase !important;
      color: #475569 !important;
      letter-spacing: 0.05em !important;
      margin-bottom: 2px !important;
    }
    .oficio-legal-clause {
      font-size: 10px !important;
      color: #334155 !important;
      font-style: italic !important;
      line-height: 1.35 !important;
      margin-bottom: 12px !important;
      padding: 6px 10px !important;
      border-left: 3px solid #0284c7 !important;
      background: #f0f9ff !important;
      border-radius: 4px !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .oficio-signatures-section {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 14px !important;
      margin-top: 8px !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .oficio-signature-card {
      border: 1px solid #cbd5e1 !important;
      border-radius: 8px !important;
      padding: 8px 10px !important;
      text-align: center !important;
      background: #ffffff !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .oficio-signature-kicker {
      font-size: 9px !important;
      font-weight: 800 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.05em !important;
      color: #64748b !important;
      margin-bottom: 4px !important;
    }
    .oficio-signature-box {
      min-height: 65px !important;
      height: 65px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      margin: 3px 0 !important;
      border-bottom: 1.5px solid #0f172a !important;
    }
    .oficio-signature-img {
      max-height: 60px !important;
      max-width: 90% !important;
      object-fit: contain !important;
    }
    .oficio-signature-pending {
      font-size: 10px !important;
      color: #94a3b8 !important;
      font-style: italic !important;
    }
    .oficio-signature-name {
      font-size: 11px !important;
      font-weight: 800 !important;
      color: #0f172a !important;
      margin-top: 4px !important;
    }
    .oficio-signature-role {
      font-size: 10px !important;
      color: #64748b !important;
    }
    .oficio-signature-timestamp {
      font-size: 9px !important;
      color: #047857 !important;
      margin-top: 2px !important;
      font-weight: 600 !important;
    }
  </style>
</head>
<body>
  ${sheet.outerHTML}
</body>
</html>`);
    doc.close();

    const doPrint = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        console.warn('Fallo impresión via iframe, ejecutando impresión estándar:', e);
        window.print();
      }
    };

    const imgs = Array.from(doc.images || []);
    if (!imgs.length) {
      setTimeout(doPrint, 150);
    } else {
      let left = imgs.length;
      const check = () => {
        left--;
        if (left <= 0) setTimeout(doPrint, 150);
      };
      imgs.forEach(im => {
        if (im.complete) check();
        else {
          im.onload = check;
          im.onerror = check;
        }
      });
      setTimeout(doPrint, 1200);
    }
  } catch (err) {
    console.warn('Error al armar documento de impresión:', err);
    window.print();
  }
}

async function firmarOficioDirecto(dispatchId, roleType) {
  const all = getAllDispatches();
  const dispatch = all.find(d => d.id === dispatchId);
  if (!dispatch) return notify('Despacho no encontrado.', 'err');

  const currentUser = getCurrentUser();
  const userRole = (currentUser.role || '').toLowerCase();
  const isTechUser = userRole === 'tecnico';
  const isSupportOrAdmin = ['admin', 'soporte'].includes(userRole);

  const isGiver = roleType === 'giver';
  const isReceiver = roleType === 'receiver';
  const isReturnGiver = roleType === 'return_giver';
  const isReturnReceiver = roleType === 'return_receiver';

  // Validación estricta institucional: a quién le corresponde cada firma
  if (isReceiver || isReturnGiver) {
    // Le corresponde al técnico
    if (!isTechUser && isSupportOrAdmin) {
      return notify(`Esta firma le corresponde al técnico asignado (${dispatch.technicianName || 'Técnico'}). Debe colocarla desde su perfil al confirmar.`, 'warn');
    }
  }

  if (isGiver || isReturnReceiver) {
    // Le corresponde a soporte / almacén
    if (isTechUser) {
      return notify('Esta firma le corresponde al personal de Soporte al entregar o recibir el material.', 'warn');
    }
  }

  let title = 'Firma de Conformidad';
  let role = 'Responsable';
  if (isGiver) {
    title = 'Firma de quien entrega el material';
    role = 'Entrega (Soporte)';
  } else if (isReceiver) {
    title = 'Firma de quien recibe el material';
    role = 'Recibe (Técnico)';
  } else if (isReturnGiver) {
    title = 'Firma de quien entrega el material';
    role = 'Entrega (Técnico)';
  } else if (isReturnReceiver) {
    title = 'Firma de quien recibe (Soporte)';
    role = 'Recibe (Soporte)';
  }

  const sig = await promptDigitalSignature({
    title,
    subtitle: 'Dibuja tu firma en el recuadro para validar este documento de WiFi-Mex.',
    signerName: currentUser.name || currentUser.username || (isGiver || isReturnReceiver ? 'Soporte' : (dispatch.technicianName || 'Técnico')),
    role
  });
  if (!sig) return;

  const now = new Date().toISOString();
  if (isGiver) {
    dispatch.giverSignature = sig.signature;
    dispatch.giverSignatureName = sig.signerName;
    dispatch.giverSignatureAt = now;
  } else if (isReceiver) {
    dispatch.receiverSignature = sig.signature;
    dispatch.receiverSignatureName = sig.signerName;
    dispatch.receiverSignatureAt = now;
    if (dispatch.status === 'pending_receipt') {
      dispatch.status = 'received';
      dispatch.acceptedAt = now;
      dispatch.acceptedByName = sig.signerName;
    }
  } else if (isReturnGiver) {
    dispatch.returnGiverSignature = sig.signature;
    dispatch.returnGiverSignatureName = sig.signerName;
    dispatch.returnGiverSignatureAt = now;
  } else if (isReturnReceiver) {
    dispatch.returnReceiverSignature = sig.signature;
    dispatch.returnReceiverSignatureName = sig.signerName;
    dispatch.returnReceiverSignatureAt = now;
    if (dispatch.status === 'pending_handover' && dispatch.returnGiverSignature) {
      dispatch.status = 'completed';
    }
  }
  dispatch.updatedAt = now;

  if (Array.isArray(state.materialMovements)) {
    const idx = state.materialMovements.findIndex(x => x.id === dispatchId);
    if (idx >= 0) state.materialMovements[idx] = { ...dispatch };
  }
  for (const m of (state.materials || [])) {
    const idx = (m.movements || []).findIndex(x => x.id === dispatchId);
    if (idx >= 0) {
      m.movements[idx] = { ...dispatch };
      m.updatedAt = now;
    }
  }

  await saveRecord('materialMovements', dispatch);
  notify('✓ Firma registrada y guardada en el formato.');
  abrirOficioMaterial(dispatchId, activeOficioType);
  renderMaterialViews();
}

let activeDispatchFilterStatus = 'all'; // 'all' | 'pending_receipt' | 'received' | 'pending_handover' | 'completed'
let activeTechTab = 'pending_receipt'; // 'pending_receipt' | 'received' | 'pending_handover' | 'completed'

function isRealDispatchMovement(mov) {
  if (!mov || !mov.id) return false;
  const rawType = String(mov.type || mov.movementType || mov.movement_type || '').toLowerCase();
  // Movimientos internos de almacén (entradas iniciales o ajustes de edición de producto) NUNCA son entregas a técnicos
  if (['entry', 'adjustment', 'initial'].includes(rawType)) return false;
  const ref = String(mov.reference || '').toLowerCase();
  const reason = String(mov.reason || '').toLowerCase();
  if (ref.includes('existencia inicial') || ref.includes('edición del material') || ref.includes('edicion del material')) return false;
  if (reason.includes('existencia ajustada') || reason.includes('ajuste')) return false;

  // Es despacho si su tipo es de entrega/recepción o si tiene un técnico asignado
  if (['give', 'dispatch', 'settle', 'reception', 'return'].includes(rawType)) return true;
  return Boolean(mov.technicianId || mov.technicianName);
}

function materialRemoteParams() {
  return {
    windowed: '1',
    offset: (materialCurrentPage - 1) * materialPageSize,
    limit: materialPageSize,
    q: document.getElementById('material-search')?.value.trim() || '',
    stockStatus: document.getElementById('material-status-filter')?.value || 'all'
  };
}

const previousMaterialDataPartParams = window.netopsGetDataPartParams;
window.netopsGetDataPartParams = part => part === 'materials' ? materialRemoteParams() : previousMaterialDataPartParams?.(part);

async function loadMaterialPage() {
  const sequence = ++materialLoadSequence;
  try {
    const params = materialRemoteParams();
    const data = await fetchDataPage('materials', params);
    if (sequence !== materialLoadSequence) return false;
    const total = Number(data.total) || 0;
    if (total > 0 && Number(params.offset) >= total) {
      materialCurrentPage = Math.max(1, Math.ceil(total / materialPageSize));
      return loadMaterialPage();
    }
    state.materials = Array.isArray(data.materials) ? data.materials : [];
    if (Array.isArray(data.technicians)) state.technicians = data.technicians;
    if (Array.isArray(data.materialMovements)) state.materialMovements = data.materialMovements.filter(isRealDispatchMovement);
    normalizeMaterials();
    updateMaterialDatalist();
    if (typeof _previousStateSaved !== 'undefined' && _previousStateSaved) {
      _previousStateSaved.materials = cloneData(state.materials);
      _previousStateSaved.materialMovements = cloneData(state.materialMovements || []);
    }
    window.netopsPageMeta = window.netopsPageMeta || {};
    window.netopsPageMeta.materials = { total, offset: Number(params.offset) || 0, limit: materialPageSize, stats: data.stats || {} };
    
    renderMaterialViews();
    return true;
  } catch (error) {
    notify(describeSyncError(error), 'err');
    return false;
  }
}

function resetMaterialPagination() {
  materialCurrentPage = 1;
  void loadMaterialPage();
}

function changeMaterialPage(page) {
  const next = Number(page);
  if (!Number.isFinite(next) || next < 1) return;
  materialCurrentPage = next;
  void loadMaterialPage();
}

async function initMaterialPage() {
  if (!checkAuth()) return;
  initCommon();
  const role = normalizeRole(getCurrentUser().role);
  const isTechnician = role === 'tecnico';
  document.documentElement.dataset.role = role;
  document.body.dataset.role = role;

  const techView = document.getElementById('technician-material-view');
  const adminView = document.getElementById('admin-material-view');
  if (techView && adminView) {
    techView.style.display = isTechnician ? 'block' : 'none';
    adminView.style.display = isTechnician ? 'none' : 'block';
  }

  await loadDB({ showOverlay: false, preferCache: true });
  if (Array.isArray(state.materialMovements)) {
    state.materialMovements = state.materialMovements.filter(isRealDispatchMovement);
  }
  await cargarDirectorioTecnicos();
  normalizeMaterials();
  renderMaterialViews();
  setupMaterialClipboardPaste();
}

function setupMaterialClipboardPaste() {
  document.addEventListener('paste', handleMaterialClipboardPaste);
}

function handleMaterialClipboardPaste(e) {
  const clipboardData = e.clipboardData || window.clipboardData;
  if (!clipboardData) return;
  const pastedText = clipboardData.getData('text');
  if (!pastedText || !pastedText.trim()) return;

  // 1. Detectar si estamos en el modal de entregar material ("#deliver-material-mo") o editando envío
  const deliverModal = document.getElementById('deliver-material-mo');
  const isDeliverOpen = deliverModal && deliverModal.classList.contains('open');
  const isTargetInDeliver = e.target && deliverModal && deliverModal.contains(e.target);

  if (isDeliverOpen && isTargetInDeliver) {
    const lines = pastedText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length > 1 || pastedText.includes('\t') || pastedText.includes(';') || (pastedText.includes(',') && !pastedText.match(/^\d+,\d+$/))) {
      e.preventDefault();
      let addedCount = 0;
      for (const line of lines) {
        let parts = line.split(/[\t;,|]+/).map(p => p.trim()).filter(Boolean);
        if (parts.length === 0) continue;
        let matName = '';
        let matQty = 1;
        let matUnit = 'pieza';
        if (parts.length === 1) {
          const match = parts[0].match(/^([\d.,]+)\s+(.+)$/) || parts[0].match(/^(.+?)\s+([\d.,]+)$/);
          if (match) {
            if (Number.isFinite(parseFloat(match[1]))) {
              matQty = parseFloat(match[1]) || 1;
              matName = match[2];
            } else {
              matName = match[1];
              matQty = parseFloat(match[2]) || 1;
            }
          } else {
            matName = parts[0];
          }
        } else if (parts.length >= 2) {
          if (!isNaN(parseFloat(parts[0])) && isNaN(parseFloat(parts[1]))) {
            matQty = parseFloat(parts[0]) || 1;
            matName = parts[1];
            if (parts[2]) matUnit = parts[2];
          } else {
            matName = parts[0];
            matQty = parseFloat(parts[1]) || 1;
            if (parts[2]) matUnit = parts[2];
          }
        }
        if (matName) {
          addDeliverRow(matName, matQty, matUnit);
          addedCount++;
        }
      }
      if (addedCount > 0) {
        notify(`Se agregaron ${addedCount} materiales desde el portapapeles.`);
      }
      return;
    }
  }

  // 2. Detectar si estamos en el modal de nuevo/editar material ("#material-mo")
  const materialModal = document.getElementById('material-mo');
  const isMatModalOpen = materialModal && materialModal.classList.contains('open');
  const isTargetInMatModal = e.target && materialModal && materialModal.contains(e.target);

  if (isMatModalOpen && isTargetInMatModal) {
    const lines = pastedText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (pastedText.includes('\t') || lines.length > 1 || pastedText.includes(';')) {
      const firstLine = lines[0];
      const cols = firstLine.split(/[\t;,|]+/).map(c => c.trim());
      if (cols.length >= 2) {
        e.preventDefault();
        const nameField = document.getElementById('mat-nombre');
        const qtyField = document.getElementById('mat-cantidad');
        const unitField = document.getElementById('mat-unidad');
        const minField = document.getElementById('mat-minimo');
        const descField = document.getElementById('mat-desc');

        if (nameField) nameField.value = cols[0] || '';
        if (qtyField && cols[1] !== undefined && !isNaN(parseFloat(cols[1]))) {
          qtyField.value = parseFloat(cols[1]);
        }
        if (unitField && cols[2]) {
          const u = cols[2].toLowerCase();
          const validUnits = ['pieza', 'unidad', 'paquete', 'rollo', 'metro', 'kg', 'caja'];
          const matched = validUnits.find(vu => vu === u || u.startsWith(vu));
          if (matched) unitField.value = matched;
        }
        if (minField && cols[3] !== undefined && !isNaN(parseFloat(cols[3]))) {
          minField.value = parseFloat(cols[3]);
        }
        if (descField && cols[4]) {
          descField.value = cols.slice(4).join(' ');
        }
        notify('Datos del material rellenados desde el portapapeles.');
      }
    }
  }
}

function normalizeMaterials() {
  state.materials = (state.materials || []).map(m => ({
    ...m,
    name: m.name || m.nombre || '',
    unit: m.unit || m.unidad || 'pieza',
    stock: Number(m.stock ?? m.cantidad) || 0,
    minimumStock: Number(m.minimumStock) || 0,
    packageSize: Math.max(1, Number(m.packageSize) || 1),
    photo: m.photo || '',
    notes: m.notes || m.desc || '',
    allocations: Array.isArray(m.allocations) ? m.allocations : [],
    movements: Array.isArray(m.movements) ? m.movements : []
  }));
}

function updateMaterialDatalist() {
  let datalist = document.getElementById('material-names-datalist');
  if (!datalist) {
    datalist = document.createElement('datalist');
    datalist.id = 'material-names-datalist';
    document.body.appendChild(datalist);
  }
  const seen = new Set();
  const options = [];
  for (const m of (state.materials || [])) {
    const name = (m.name || '').trim();
    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      options.push(`<option value="${escapeHtml(name)}" data-unit="${escapeHtml(m.unit || 'pieza')}"></option>`);
    }
  }
  const directMovements = Array.isArray(state.materialMovements) ? state.materialMovements : [];
  for (const mov of directMovements) {
    const items = Array.isArray(mov.items) ? mov.items : [{ materialName: mov.materialName, unit: mov.unit }];
    for (const it of items) {
      const name = (it.materialName || '').trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        options.push(`<option value="${escapeHtml(name)}" data-unit="${escapeHtml(it.unit || 'pieza')}"></option>`);
      }
    }
  }
  datalist.innerHTML = options.join('');
}

const qty = n => Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 });
const assignedTotal = m => (m.allocations || []).reduce((sum, x) => sum + (Number(x.quantity) || 0), 0);
const techName = id => (state.technicians || []).find(t => t.id === id || t.userId === id)?.nombre || 'Técnico';

function getCurrentTechnician() {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
  const username = normalizeName(user?.username || '');
  const userDisplayName = normalizeName(user?.name || '');
  const userId = String(user?.id || '');
  return (state.technicians || []).find(tech =>
    !tech.deletedAt && (
      (userId && String(tech.userId || '') === userId) ||
      (tech.id && String(tech.id) === userId) ||
      (username && normalizeName(tech.usuario || '') === username) ||
      (username && normalizeName(tech.nombre || '') === username) ||
      (userDisplayName && normalizeName(tech.nombre || '') === userDisplayName)
    )
  );
}

function normalizeDispatchItems(mov, fallbackMaterial) {
  if (Array.isArray(mov.items) && mov.items.length) {
    return mov.items.map(it => ({
      materialId: it.materialId || fallbackMaterial?.id || '',
      materialName: it.materialName || fallbackMaterial?.name || 'Material',
      quantity: Number(it.quantity) || 0,
      unit: it.unit || fallbackMaterial?.unit || 'pieza'
    }));
  }
  return [{
    materialId: mov.materialId || fallbackMaterial?.id || '',
    materialName: mov.materialName || fallbackMaterial?.name || 'Material',
    quantity: Number(mov.quantity) || 0,
    unit: mov.unit || fallbackMaterial?.unit || 'pieza'
  }];
}

function getDispatchFolios(d) {
  if (!d) return { delivery: 'ENT-000000', receipt: 'REC-000000', current: 'ENT-000000', number: '000000' };

  let numFolioStr = '';
  if (d.deliveryFolio && /^ENT-(\d+)/i.test(d.deliveryFolio)) {
    numFolioStr = d.deliveryFolio.match(/^ENT-(\d+)/i)[1].padStart(6, '0');
  } else if (d.receiptFolio && /^REC-(\d+)/i.test(d.receiptFolio)) {
    numFolioStr = d.receiptFolio.match(/^REC-(\d+)/i)[1].padStart(6, '0');
  } else if (d.folio && /^(?:ENT|REC)-(\d+)/i.test(d.folio)) {
    numFolioStr = d.folio.match(/^(?:ENT|REC)-(\d+)/i)[1].padStart(6, '0');
  } else {
    const src = String(d.id || d.at || d.createdAt || 'delivery');
    let hash = 0;
    for (let i = 0; i < src.length; i++) hash = ((hash * 31) + src.charCodeAt(i)) >>> 0;
    numFolioStr = String(Math.abs(hash) % 1000000).padStart(6, '0');
  }

  const delivery = `ENT-${numFolioStr}`;
  const receipt = `REC-${numFolioStr}`;
  const isReceivedOrClosed = d.status === 'pending_handover' || d.status === 'rejected_receipt' || d.status === 'completed';
  const current = isReceivedOrClosed ? receipt : delivery;

  return { delivery, receipt, current, number: numFolioStr };
}

function getAllDispatches() {
  const dispatchesMap = new Map();

  // 1. Envíos directos desde la tabla/colección de materialMovements (solo despachos genuinos)
  const directMovements = Array.isArray(state.materialMovements) ? state.materialMovements : [];
  for (const mov of directMovements) {
    if (!mov || !mov.id) continue;
    if (!isRealDispatchMovement(mov)) continue;
    const items = normalizeDispatchItems(mov);
    const folios = getDispatchFolios(mov);
    dispatchesMap.set(mov.id, {
      ...mov,
      folio: folios.current,
      currentFolio: folios.current,
      deliveryFolio: folios.delivery,
      receiptFolio: folios.receipt,
      folioNumber: folios.number,
      materialId: mov.materialId || (items[0] && items[0].materialId) || '',
      materialName: mov.materialName || (items.length > 1 ? `${items[0].materialName} (+${items.length - 1} más)` : (items[0]?.materialName || 'Material')),
      unit: mov.unit || (items[0] && items[0].unit) || 'pieza',
      items: items,
      status: mov.status || (mov.type === 'settle' ? 'completed' : 'pending_receipt'),
      isEdited: !!mov.isEdited,
      editedAt: mov.editedAt || null,
      editedByName: mov.editedByName || '',
      returnDetails: mov.returnDetails || null
    });
  }

  // 2. Historial previo asociado dentro del objeto material (solo si es un despacho a técnico real)
  for (const m of (state.materials || [])) {
    for (const mov of (m.movements || [])) {
      if (!mov || !mov.id) continue;
      if (!isRealDispatchMovement(mov)) continue;
      if (!dispatchesMap.has(mov.id)) {
        const items = normalizeDispatchItems(mov, m);
        const folios = getDispatchFolios(mov);
        dispatchesMap.set(mov.id, {
          ...mov,
          folio: folios.current,
          currentFolio: folios.current,
          deliveryFolio: folios.delivery,
          receiptFolio: folios.receipt,
          folioNumber: folios.number,
          materialId: mov.materialId || m.id,
          materialName: mov.materialName || (items.length > 1 ? `${items[0].materialName} (+${items.length - 1} más)` : items[0].materialName),
          materialPhoto: m.photo || '',
          unit: mov.unit || items[0].unit || 'pieza',
          items: items,
          status: mov.status || (mov.type === 'settle' ? 'completed' : 'pending_receipt'),
          isEdited: !!mov.isEdited,
          editedAt: mov.editedAt || null,
          editedByName: mov.editedByName || '',
          returnDetails: mov.returnDetails || null
        });
      }
    }
  }

  return Array.from(dispatchesMap.values()).sort((a, b) => new Date(b.at || b.createdAt || 0) - new Date(a.at || a.createdAt || 0));
}

function renderMaterialViews() {
  const isTechnician = normalizeRole(getCurrentUser().role) === 'tecnico';
  if (isTechnician) {
    renderTechnicianMaterialView();
  } else {
    renderAdminDispatches();
    if (typeof renderMateriales === 'function') renderMateriales();
  }
}

/* ==========================================================================
   VISTA DEL TÉCNICO (Móvil)
   ========================================================================== */
function renderTechnicianMaterialView() {
  const tech = getCurrentTechnician();
  const techId = tech?.id || '';
  const techUserId = tech?.userId || '';
  const user = getCurrentUser();
  const username = normalizeName(user?.username || '');
  const userDisplayName = normalizeName(user?.name || '');
  const userId = user?.id || '';
  const allDispatches = getAllDispatches();

  // Filtrar envíos asignados a este técnico
  const myDispatches = allDispatches.filter(d => {
    if (techId && d.technicianId === techId) return true;
    if (techUserId && d.technicianId === techUserId) return true;
    if (userId && d.technicianId === userId) return true;
    const dName = normalizeName(d.technicianName || '');
    if (dName) {
      if (username && dName === username) return true;
      if (userDisplayName && dName === userDisplayName) return true;
      if (tech?.nombre && dName === normalizeName(tech.nombre)) return true;
      if (tech?.usuario && dName === normalizeName(tech.usuario)) return true;
    }
    return false;
  });

  const pendingReceipt = myDispatches.filter(d => d.status === 'pending_receipt' || d.status === 'rejected_delivery');
  const inPossession = myDispatches.filter(d => d.status === 'received');
  const pendingHandover = myDispatches.filter(d => d.status === 'pending_handover' || d.status === 'rejected_receipt');
  const completed = myDispatches.filter(d => d.status === 'completed');

  // Actualizar badges
  const setBadge = (id, count) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = count;
    el.style.display = count > 0 ? 'inline-block' : 'none';
  };
  setBadge('tech-badge-pending-receipt', pendingReceipt.length);
  setBadge('tech-badge-received', inPossession.length);
  setBadge('tech-badge-pending-handover', pendingHandover.length);

  // Banner de alerta
  const alertEl = document.getElementById('tech-pending-alert');
  const alertText = document.getElementById('tech-pending-alert-text');
  if (alertEl && alertText) {
    if (pendingReceipt.length > 0 && pendingHandover.length > 0) {
      alertEl.style.display = 'flex';
      alertText.textContent = `Tienes ${pendingReceipt.length} entrega(s) por recibir y ${pendingHandover.length} entrega(s) por confirmar a soporte.`;
    } else if (pendingReceipt.length > 0) {
      alertEl.style.display = 'flex';
      alertText.textContent = `Tienes ${pendingReceipt.length} entrega(s) de material entregada(s) por soporte pendiente(s) por recibir.`;
    } else if (pendingHandover.length > 0) {
      alertEl.style.display = 'flex';
      alertText.textContent = `Soporte registró material recibido. Tienes ${pendingHandover.length} confirmación(es) de entrega pendiente(s).`;
    } else {
      alertEl.style.display = 'none';
    }
  }

  // Filtrar según la pestaña activa
  let currentList = [];
  let emptyTitle = '';
  let emptyDesc = '';

  if (activeTechTab === 'pending_receipt') {
    currentList = pendingReceipt;
    emptyTitle = 'Sin entregas pendientes por aceptar';
    emptyDesc = 'Cuando soporte te entregue material, aparecerá aquí para que confirmes haberlo recibido.';
  } else if (activeTechTab === 'received') {
    currentList = inPossession;
    emptyTitle = 'No tienes material en tu posesión';
    emptyDesc = 'Solo el material que hayas aceptado recibir de soporte aparecerá aquí.';
  } else if (activeTechTab === 'pending_handover') {
    currentList = pendingHandover;
    emptyTitle = 'Sin entregas pendientes por confirmar';
    emptyDesc = 'Cuando soporte registre material devuelto o utilizado de tu posesión, lo validarás aquí.';
  } else {
    currentList = completed;
    emptyTitle = 'Sin historial de movimientos';
    emptyDesc = 'Tus órdenes de entrega y devoluciones finalizadas se archivarán aquí.';
  }

  const container = document.getElementById('technician-dispatches-grid');
  const emptyEl = document.getElementById('technician-dispatches-empty');
  if (emptyEl) {
    emptyEl.style.display = currentList.length ? 'none' : 'block';
    document.getElementById('technician-empty-title').textContent = emptyTitle;
    document.getElementById('technician-empty-desc').textContent = emptyDesc;
  }

  if (container) {
    container.innerHTML = currentList.map(d => renderTechnicianDispatchCard(d)).join('');
  }
}

function renderTechnicianDispatchCard(d) {
  const isPendingReceipt = d.status === 'pending_receipt';
  const isRejectedDelivery = d.status === 'rejected_delivery';
  const isPendingHandover = d.status === 'pending_handover';
  const isRejectedReceipt = d.status === 'rejected_receipt';
  const isReceived = d.status === 'received';
  const isCompleted = d.status === 'completed';
  const isEdited = !!d.isEdited;

  const folios = getDispatchFolios(d);
  const dateFormatted = d.at ? new Date(d.at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : 'Reciente';
  const items = Array.isArray(d.items) && d.items.length ? d.items : [{ materialName: d.materialName, quantity: d.quantity, unit: d.unit || 'pieza' }];
  const itemsSummary = items.slice(0, 3).map(it => `${escapeHtml(it.materialName)} (${qty(it.quantity)} ${escapeHtml(it.unit || 'pz')})`).join(', ') + (items.length > 3 ? ` y ${items.length - 3} más...` : '');
  const isReceivedOrClosed = isPendingHandover || isRejectedReceipt || isCompleted;

  const statusLabel = isPendingReceipt 
    ? '🟡 Por aceptar' 
    : isRejectedDelivery
    ? '🔴 Devuelto a soporte'
    : isPendingHandover 
    ? '🟠 Por confirmar entrega' 
    : isRejectedReceipt
    ? '🔴 Recepción devuelta'
    : isReceived 
    ? '🟢 En posesión' 
    : '🔵 Conforme';

  return `
    <article class="dispatch-card compact-card ${isPendingReceipt || isPendingHandover || isRejectedDelivery || isRejectedReceipt ? 'urgent-attention' : ''} ${isCompleted ? 'completed-card' : ''}">
      <div class="dispatch-card-top">
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          <span class="dispatch-folio-tag ${isReceivedOrClosed ? 'receipt' : 'delivery'}" title="${isReceivedOrClosed ? 'Folio de Recepción' : 'Folio de Entrega'}">${escapeHtml(folios.current)}</span>
          <span class="dispatch-meta-date">${dateFormatted}</span>
        </div>
        <span class="dispatch-badge status-${escapeHtml(d.status)}">${statusLabel}</span>
      </div>

      ${isRejectedDelivery ? `
        <div style="margin:2px 0 0;padding:8px 10px;background:#fff1f2;border:1px solid #fecdd3;border-radius:8px;font-size:12px;color:#9f1239">
          <b>↩️ Devolviste esta entrega a Soporte:</b> "${escapeHtml(d.rejectionReason || 'No especificado')}"
          <div style="font-size:11px;color:#e11d48;margin-top:2px">Esperando que Soporte la modifique y te la reenvíe.</div>
        </div>
      ` : isRejectedReceipt ? `
        <div style="margin:2px 0 0;padding:8px 10px;background:#fff1f2;border:1px solid #fecdd3;border-radius:8px;font-size:12px;color:#9f1239">
          <b>↩️ Devolviste esta recepción a Soporte:</b> "${escapeHtml(d.receiptRejectionReason || 'No especificado')}"
          <div style="font-size:11px;color:#e11d48;margin-top:2px">Esperando que Soporte ajuste las cantidades.</div>
        </div>
      ` : (isEdited && isPendingReceipt) ? `
        <div class="dispatch-edited-warning">
          <span style="font-weight:700">✎ Modificado:</span> Revisa los materiales actualizados antes de confirmar.
        </div>
      ` : ''}

      <div class="dispatch-compact-body">
        <div class="dispatch-compact-row">
          <span class="dispatch-compact-label">Materiales:</span>
          <span class="dispatch-compact-val"><b>${items.length} ${items.length === 1 ? 'artículo' : 'artículos'}:</b> ${itemsSummary}</span>
        </div>
        <div class="dispatch-compact-row">
          <span class="dispatch-compact-label">Entregó:</span>
          <span class="dispatch-compact-val">${escapeHtml(d.createdByName || 'Soporte')}</span>
        </div>
        ${d.reference ? `
          <div class="dispatch-compact-row">
            <span class="dispatch-compact-label">Referencia:</span>
            <span class="dispatch-compact-val">${escapeHtml(d.reference)}</span>
          </div>
        ` : ''}
        ${isPendingHandover || isRejectedReceipt || isCompleted ? `
          <div class="dispatch-compact-row" style="color:#c2410c">
            <span class="dispatch-compact-label">Recepción:</span>
            <span class="dispatch-compact-val">
              Devuelto: <b>${qty(d.returnedChange)}</b> · Usado: <b>${qty(d.usedQuantity)}</b> ${d.returnedDamaged > 0 ? `· Dañado: <b>${qty(d.returnedDamaged)}</b>` : ''}
            </span>
          </div>
        ` : ''}
      </div>

      <div class="dispatch-card-actions compact-actions">
        <button type="button" class="dispatch-btn dispatch-btn-outline" onclick="verDetalleEnvio('${d.id}')" title="Ver información completa de la orden">
          👁️ Ver detalle
        </button>
        <button type="button" class="dispatch-btn dispatch-btn-oficio" onclick="abrirOficioMaterial('${d.id}')" title="Ver formato con firmas WiFi-Mex">
          📄 Formato
        </button>
        ${isPendingReceipt ? `
          <button class="dispatch-btn dispatch-btn-success" onclick="aceptarRecepcionTecnico('${d.id}')">
            ${isEdited ? '✓ Confirmar recepción' : '✓ Confirmar que recibí'}
          </button>
          <button class="dispatch-btn" onclick="rechazarRecepcionTecnico('${d.id}')" style="background:#fee2e2;color:#dc2626;border:1px solid #fecdd3;font-weight:700">
            ✕ No conforme / Devolver
          </button>
        ` : ''}
        ${isReceived ? `
          <button class="dispatch-btn dispatch-btn-amber" onclick="abrirDevolucionTecnico('${d.id}')">
            ↑ Entregar a soporte
          </button>
        ` : ''}
        ${isPendingHandover ? `
          <button class="dispatch-btn dispatch-btn-amber" onclick="aceptarEntregaTecnico('${d.id}')">
            ✓ Confirmar entrega a soporte
          </button>
          <button class="dispatch-btn" onclick="rechazarEntregaTecnico('${d.id}')" style="background:#fee2e2;color:#dc2626;border:1px solid #fecdd3;font-weight:700">
            ✕ No conforme / Devolver
          </button>
        ` : ''}
      </div>
    </article>
  `;
}

function switchTechTab(tab) {
  activeTechTab = tab;
  ['pending_receipt', 'received', 'pending_handover', 'completed'].forEach(t => {
    document.getElementById(`tech-tab-${t}`)?.classList.toggle('active', t === tab);
  });
  renderTechnicianMaterialView();
}

function verPendientesTecnico() {
  const pendingReceiptBadge = document.getElementById('tech-badge-pending-receipt');
  const countReceipt = Number(pendingReceiptBadge?.textContent || 0);
  if (countReceipt > 0) {
    switchTechTab('pending_receipt');
  } else {
    switchTechTab('pending_handover');
  }
}

/* ==========================================================================
   VISTA DE ADMINISTRADOR / SOPORTE
   ========================================================================== */
function switchAdminMainTab(tab) {
  activeAdminMainTab = tab;
  document.getElementById('admin-tab-dispatches')?.classList.toggle('active', tab === 'dispatches');
  document.getElementById('admin-tab-catalog')?.classList.toggle('active', tab === 'catalog');
  
  const dispatchesSec = document.getElementById('admin-section-dispatches');
  const catalogSec = document.getElementById('admin-section-catalog');
  if (dispatchesSec && catalogSec) {
    dispatchesSec.style.display = tab === 'dispatches' ? 'block' : 'none';
    catalogSec.style.display = tab === 'catalog' ? 'block' : 'none';
  }
  if (tab === 'dispatches') {
    renderAdminDispatches();
  } else {
    if (typeof renderMateriales === 'function') renderMateriales();
  }
}

function setDispatchFilterStatus(status) {
  activeDispatchFilterStatus = status;
  dispatchCurrentPage = 1;
  ['all', 'pending_receipt', 'received', 'pending_handover', 'completed'].forEach(s => {
    document.getElementById(`chip-status-${s}`)?.classList.toggle('active', s === status);
  });
  renderAdminDispatches();
}

function filtrarDispatches() {
  dispatchCurrentPage = 1;
  renderAdminDispatches();
}

function renderAdminDispatches() {
  const all = getAllDispatches();
  const search = (document.getElementById('dispatch-search')?.value || '').toLowerCase().trim();
  const folioFilter = (document.getElementById('dispatch-folio-filter')?.value || '').toLowerCase().trim();
  const techFilter = document.getElementById('dispatch-tech-filter')?.value || 'all';

  // Conteos para chips
  const countAll = all.length;
  const countPendingReceipt = all.filter(d => d.status === 'pending_receipt' || d.status === 'rejected_delivery').length;
  const countReceived = all.filter(d => d.status === 'received').length;
  const countPendingHandover = all.filter(d => d.status === 'pending_handover' || d.status === 'rejected_receipt').length;
  const countCompleted = all.filter(d => d.status === 'completed').length;

  const setCount = (id, count) => {
    const el = document.getElementById(id);
    if (el) el.textContent = count;
  };
  setCount('count-status-all', countAll);
  setCount('count-status-pending_receipt', countPendingReceipt);
  setCount('count-status-received', countReceived);
  setCount('count-status-pending_handover', countPendingHandover);
  setCount('count-status-completed', countCompleted);

  const pendingAdminBadge = document.getElementById('admin-badge-pending');
  if (pendingAdminBadge) {
    const totalPending = countPendingReceipt + countPendingHandover;
    pendingAdminBadge.textContent = totalPending;
    pendingAdminBadge.style.display = totalPending > 0 ? 'inline-block' : 'none';
  }

  // Llenar select de técnicos
  const selectTech = document.getElementById('dispatch-tech-filter');
  if (selectTech && selectTech.options.length <= 1) {
    const activeTechs = (state.technicians || []).filter(t => !t.deletedAt && t.estado !== 'inactivo');
    activeTechs.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.nombre;
      selectTech.appendChild(opt);
    });
  }

  // Filtrar
  const filtered = all.filter(d => {
    let matchesStatus = activeDispatchFilterStatus === 'all';
    if (!matchesStatus) {
      if (activeDispatchFilterStatus === 'pending_receipt') {
        matchesStatus = d.status === 'pending_receipt' || d.status === 'rejected_delivery';
      } else if (activeDispatchFilterStatus === 'pending_handover') {
        matchesStatus = d.status === 'pending_handover' || d.status === 'rejected_receipt';
      } else {
        matchesStatus = d.status === activeDispatchFilterStatus;
      }
    }
    const matchesTech = techFilter === 'all' || d.technicianId === techFilter;
    const folios = getDispatchFolios(d);
    const matchesFolio = !folioFilter ||
      folios.current.toLowerCase().includes(folioFilter) ||
      folios.delivery.toLowerCase().includes(folioFilter) ||
      folios.receipt.toLowerCase().includes(folioFilter) ||
      folios.number.includes(folioFilter) ||
      (d.id && String(d.id).toLowerCase().includes(folioFilter));

    const itemsMatch = (d.items || []).some(it => (it.materialName || '').toLowerCase().includes(search));
    const matchesSearch = !search ||
      (d.materialName || '').toLowerCase().includes(search) ||
      (d.technicianName || '').toLowerCase().includes(search) ||
      (d.reference || '').toLowerCase().includes(search) ||
      (d.notes || '').toLowerCase().includes(search) ||
      folios.current.toLowerCase().includes(search) ||
      folios.delivery.toLowerCase().includes(search) ||
      folios.receipt.toLowerCase().includes(search) ||
      folios.number.includes(search) ||
      itemsMatch;

    return matchesStatus && matchesTech && matchesFolio && matchesSearch;
  });

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / dispatchPageSize));
  if (dispatchCurrentPage > totalPages) dispatchCurrentPage = totalPages;
  if (dispatchCurrentPage < 1) dispatchCurrentPage = 1;

  const startIndex = (dispatchCurrentPage - 1) * dispatchPageSize;
  const endIndex = Math.min(startIndex + dispatchPageSize, totalFiltered);
  const paged = filtered.slice(startIndex, endIndex);

  const grid = document.getElementById('dispatches-grid');
  const empty = document.getElementById('dispatches-empty');
  if (empty) empty.style.display = totalFiltered ? 'none' : 'block';
  if (grid) {
    grid.innerHTML = paged.map(d => renderAdminDispatchCard(d)).join('');
  }

  renderDispatchesPagination(totalFiltered, totalPages, startIndex, endIndex);
}

function changeDispatchPage(page) {
  const next = Number(page);
  if (!Number.isFinite(next) || next < 1) return;
  dispatchCurrentPage = next;
  renderAdminDispatches();
  document.getElementById('admin-section-dispatches')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderDispatchesPagination(total, totalPages, startIndex, endIndex) {
  const paginationEl = document.getElementById('dispatches-pagination');
  if (!paginationEl) return;
  if (total <= 0) {
    paginationEl.style.display = 'none';
    paginationEl.innerHTML = '';
    return;
  }
  paginationEl.style.display = 'flex';

  const isFirst = dispatchCurrentPage <= 1;
  const isLast = dispatchCurrentPage >= totalPages;

  let pageButtons = '';
  let startP = Math.max(1, dispatchCurrentPage - 2);
  let endP = Math.min(totalPages, startP + 4);
  if (endP - startP < 4) startP = Math.max(1, endP - 4);

  for (let p = startP; p <= endP; p++) {
    pageButtons += `<button type="button" class="dispatch-page-num ${p === dispatchCurrentPage ? 'active' : ''}" onclick="changeDispatchPage(${p})">${p}</button>`;
  }

  paginationEl.innerHTML = `
    <div class="dispatch-pagination-info">
      Mostrando <strong>${total ? startIndex + 1 : 0}–${endIndex}</strong> de <strong>${total}</strong> entregas
    </div>
    <div class="dispatch-pagination-controls">
      <button type="button" class="dispatch-page-nav-btn" onclick="changeDispatchPage(${dispatchCurrentPage - 1})" ${isFirst ? 'disabled' : ''} title="Página anterior">
        ‹ Anterior
      </button>
      <div class="dispatch-page-numbers">${pageButtons}</div>
      <button type="button" class="dispatch-page-nav-btn" onclick="changeDispatchPage(${dispatchCurrentPage + 1})" ${isLast ? 'disabled' : ''} title="Página siguiente">
        Siguiente ›
      </button>
    </div>
  `;
}

function renderAdminDispatchCard(d) {
  const isPendingReceipt = d.status === 'pending_receipt';
  const isRejectedDelivery = d.status === 'rejected_delivery';
  const isPendingHandover = d.status === 'pending_handover';
  const isRejectedReceipt = d.status === 'rejected_receipt';
  const isReceived = d.status === 'received';
  const isCompleted = d.status === 'completed';
  const isEdited = !!d.isEdited;

  const folios = getDispatchFolios(d);
  const dateFormatted = d.at ? new Date(d.at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : 'Reciente';
  const statusLabel = isPendingReceipt 
    ? '🟡 Pendiente recepción' 
    : isRejectedDelivery
    ? '🔴 Entrega devuelta'
    : isPendingHandover 
    ? '🟠 Por confirmar entrega' 
    : isRejectedReceipt
    ? '🔴 Recepción devuelta'
    : isReceived 
    ? '🟢 En posesión del técnico' 
    : '🔵 Completado';

  const items = Array.isArray(d.items) && d.items.length ? d.items : [{ materialName: d.materialName, quantity: d.quantity, unit: d.unit || 'pieza' }];
  const itemsSummary = items.slice(0, 3).map(it => `${escapeHtml(it.materialName)} (${qty(it.quantity)} ${escapeHtml(it.unit || 'pz')})`).join(', ') + (items.length > 3 ? ` y ${items.length - 3} más...` : '');
  const isReceivedOrClosed = isPendingHandover || isRejectedReceipt || isCompleted;

  return `
    <article class="dispatch-card compact-card ${isPendingReceipt || isPendingHandover || isRejectedDelivery || isRejectedReceipt ? 'urgent-attention' : ''} ${isCompleted ? 'completed-card' : ''}">
      <div class="dispatch-card-top">
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          <span class="dispatch-folio-tag ${isReceivedOrClosed ? 'receipt' : 'delivery'}" title="${isReceivedOrClosed ? 'Folio de Recepción' : 'Folio de Entrega'}">${escapeHtml(folios.current)}</span>
          <span class="dispatch-meta-date">${dateFormatted}</span>
        </div>
        <span class="dispatch-badge status-${escapeHtml(d.status)}">${statusLabel}</span>
      </div>

      ${isRejectedDelivery ? `
        <div style="margin:2px 0 0;padding:8px 10px;background:#fff1f2;border:1px solid #fecdd3;border-radius:8px;font-size:12px;color:#9f1239">
          <b>🔴 Entrega devuelta por el técnico:</b> "${escapeHtml(d.rejectionReason || 'No conforme')}"
          <div style="font-size:11px;color:#e11d48;margin-top:2px">Edita este envío para ajustar los materiales y re-enviar al técnico.</div>
        </div>
      ` : isRejectedReceipt ? `
        <div style="margin:2px 0 0;padding:8px 10px;background:#fff1f2;border:1px solid #fecdd3;border-radius:8px;font-size:12px;color:#9f1239">
          <b>🔴 Recepción no aceptada por el técnico:</b> "${escapeHtml(d.receiptRejectionReason || 'No conforme')}"
          <div style="font-size:11px;color:#e11d48;margin-top:2px">Corrige las cantidades de recepción devueltas/usadas sobre esta orden.</div>
        </div>
      ` : (isEdited && isPendingReceipt) ? `
        <div class="dispatch-edited-warning">
          <span style="font-weight:700">✎ Modificado:</span> Pendiente confirmación del técnico.
        </div>
      ` : ''}

      <div class="dispatch-compact-body">
        <div class="dispatch-compact-row">
          <span class="dispatch-compact-label">Técnico:</span>
          <strong class="dispatch-compact-val">${escapeHtml(d.technicianName || techName(d.technicianId))}</strong>
        </div>
        <div class="dispatch-compact-row">
          <span class="dispatch-compact-label">Materiales:</span>
          <span class="dispatch-compact-val"><b>${items.length} ${items.length === 1 ? 'artículo' : 'artículos'}:</b> ${itemsSummary}</span>
        </div>
        ${d.reference ? `
          <div class="dispatch-compact-row">
            <span class="dispatch-compact-label">Referencia:</span>
            <span class="dispatch-compact-val">${escapeHtml(d.reference)}</span>
          </div>
        ` : ''}
        ${isPendingHandover || isRejectedReceipt || isCompleted ? `
          <div class="dispatch-compact-row" style="color:#c2410c">
            <span class="dispatch-compact-label">Recepción:</span>
            <span class="dispatch-compact-val">
              Devuelto: <b>${qty(d.returnedChange)}</b> · Usado: <b>${qty(d.usedQuantity)}</b> ${d.returnedDamaged > 0 ? `· Dañado: <b>${qty(d.returnedDamaged)}</b>` : ''}
            </span>
          </div>
        ` : ''}
      </div>

      <div class="dispatch-card-actions compact-actions">
        <button type="button" class="dispatch-btn dispatch-btn-outline" onclick="verDetalleEnvio('${d.id}')" title="Ver información completa de la orden">
          👁️ Ver detalle
        </button>
        <button type="button" class="dispatch-btn dispatch-btn-oficio" onclick="abrirOficioMaterial('${d.id}')" title="Ver formato con firmas WiFi-Mex">
          📄 Formato
        </button>
        ${isRejectedDelivery ? `
          <button type="button" class="dispatch-btn dispatch-btn-secondary" onclick="editarEnvio('${d.id}')" style="background:#fee2e2;color:#991b1b;border-color:#fca5a5;font-weight:700" title="Modificar materiales de la entrega devuelta">
            ✎ Corregir entrega devuelta
          </button>
        ` : isRejectedReceipt ? `
          <button type="button" class="dispatch-btn dispatch-btn-primary" onclick="abrirRecepcion('${d.technicianId}', '${d.id}')" style="background:#ea580c;border-color:#c2410c;font-weight:700" title="Corregir cantidades de recepción devuelta">
            ↓ Corregir recepción devuelta
          </button>
        ` : !isCompleted ? `
          <button type="button" class="dispatch-btn dispatch-btn-secondary" onclick="editarEnvio('${d.id}')" title="Modificar materiales de este envío">
            ✎ Editar
          </button>
          ${isReceived ? `
            <button type="button" class="dispatch-btn dispatch-btn-primary" onclick="abrirRecepcion('${d.technicianId}', '${d.id}')" title="Recibir material devuelto sobre este envío">
              ↓ Recibir material
            </button>
          ` : `
            <span style="font-size:11px;color:#b45309;font-weight:700;display:flex;align-items:center">
              ⏳ Esperando recepción del técnico
            </span>
          `}
        ` : `
          <span style="font-size:11px;color:var(--mat-primary);font-weight:700;display:flex;align-items:center">
            ✓ Finalizado y conforme
          </span>
        `}
      </div>
    </article>
  `;
}

function verDetalleEnvio(dispatchId) {
  const all = getAllDispatches();
  const d = all.find(x => x.id === dispatchId);
  if (!d) return notify('Orden no encontrada', 'err');

  const folios = getDispatchFolios(d);
  const isPendingReceipt = d.status === 'pending_receipt';
  const isRejectedDelivery = d.status === 'rejected_delivery';
  const isPendingHandover = d.status === 'pending_handover';
  const isRejectedReceipt = d.status === 'rejected_receipt';
  const isReceived = d.status === 'received';
  const isCompleted = d.status === 'completed';
  const isEdited = !!d.isEdited;
  const isTechnician = normalizeRole(getCurrentUser().role) === 'tecnico';

  const dateFormatted = d.at ? new Date(d.at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : 'Reciente';

  const titleEl = document.getElementById('detail-modal-title');
  if (titleEl) {
    titleEl.innerHTML = `
      <span class="dispatch-folio-tag ${isPendingHandover || isRejectedReceipt || isCompleted ? 'receipt' : 'delivery'}">${escapeHtml(folios.current)}</span>
      <span style="font-size:16px;font-weight:800;color:var(--mat-text)">Orden #${escapeHtml(folios.number)}</span>
    `;
  }

  const items = Array.isArray(d.items) && d.items.length ? d.items : [{ materialName: d.materialName, quantity: d.quantity, unit: d.unit || 'pieza' }];

  const rowsItems = items.map((it, idx) => {
    const retItem = d.returnDetails?.items?.[idx] || d.returnDetails?.items?.find(r => r.materialName === it.materialName || r.materialId === it.materialId);
    return `
      <tr>
        <td><strong>${escapeHtml(it.materialName)}</strong></td>
        <td><b>${qty(it.quantity)}</b> ${escapeHtml(it.unit || 'pieza')}</td>
        ${d.returnDetails || isPendingHandover || isRejectedReceipt || isCompleted ? `
          <td style="color:#047857;font-weight:700">${retItem ? qty(retItem.returnedGood) : (d.returnedChange > 0 ? qty(d.returnedChange) : '-')}</td>
          <td style="color:#0284c7;font-weight:700">${retItem ? qty(retItem.usedQuantity) : (d.usedQuantity > 0 ? qty(d.usedQuantity) : '-')}</td>
          <td style="color:#dc2626;font-weight:700">${retItem && retItem.returnedDamaged > 0 ? qty(retItem.returnedDamaged) : (d.returnedDamaged > 0 ? qty(d.returnedDamaged) : '-')}</td>
        ` : ''}
      </tr>
    `;
  }).join('');

  const bodyEl = document.getElementById('dispatch-detail-modal-body');
  if (bodyEl) {
    bodyEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;background:#f8fafc;padding:12px;border-radius:10px;border:1px solid var(--mat-border);margin-bottom:14px">
        <div>
          <div style="font-size:11px;color:var(--mat-muted);text-transform:uppercase;font-weight:800">Fecha de entrega</div>
          <div style="font-size:13px;font-weight:700;color:var(--mat-text)">${dateFormatted}</div>
        </div>
        <div>
          <span class="dispatch-badge status-${escapeHtml(d.status)}">
            ${isPendingReceipt ? '🟡 Por aceptar' : isRejectedDelivery ? '🔴 Entrega devuelta' : isPendingHandover ? '🟠 Por confirmar entrega' : isRejectedReceipt ? '🔴 Recepción devuelta' : isReceived ? '🟢 En posesión' : '🔵 Completado'}
          </span>
        </div>
      </div>

      ${isRejectedDelivery ? `
        <div style="margin-bottom:14px;background:#fff1f2;border:1px solid #fecdd3;border-radius:10px;padding:12px;color:#9f1239">
          <div style="font-weight:800;font-size:12px;text-transform:uppercase;margin-bottom:4px">🔴 Motivo de devolución por el técnico (Entrega):</div>
          <div style="font-size:13px;font-weight:600;background:#fff;padding:8px 10px;border-radius:6px;border:1px solid #fecdd3">"${escapeHtml(d.rejectionReason || 'No conforme')}"</div>
          <div style="font-size:11px;color:#e11d48;margin-top:4px">Devuelto el ${d.rejectedAt ? new Date(d.rejectedAt).toLocaleString('es-MX', { dateStyle:'short', timeStyle:'short' }) : ''} por ${escapeHtml(d.rejectedByName || 'Técnico')}</div>
        </div>
      ` : isRejectedReceipt ? `
        <div style="margin-bottom:14px;background:#fff1f2;border:1px solid #fecdd3;border-radius:10px;padding:12px;color:#9f1239">
          <div style="font-weight:800;font-size:12px;text-transform:uppercase;margin-bottom:4px">🔴 Motivo de no conformidad por el técnico (Recepción):</div>
          <div style="font-size:13px;font-weight:600;background:#fff;padding:8px 10px;border-radius:6px;border:1px solid #fecdd3">"${escapeHtml(d.receiptRejectionReason || 'No conforme')}"</div>
          <div style="font-size:11px;color:#e11d48;margin-top:4px">Devuelto el ${d.receiptRejectedAt ? new Date(d.receiptRejectedAt).toLocaleString('es-MX', { dateStyle:'short', timeStyle:'short' }) : ''} por ${escapeHtml(d.receiptRejectedByName || 'Técnico')}</div>
        </div>
      ` : (isEdited && !isCompleted) ? `
        <div class="dispatch-edited-warning" style="margin-bottom:14px">
          <div class="dispatch-edited-badge">✎ Modificado</div>
          <p>Este envío fue modificado el ${d.editedAt ? new Date(d.editedAt).toLocaleString('es-MX', { dateStyle:'short', timeStyle:'short' }) : ''} por ${escapeHtml(d.editedByName || 'Soporte')}.</p>
        </div>
      ` : ''}

      <div style="margin-bottom:14px">
        <div style="font-size:11px;font-weight:800;color:var(--mat-muted);text-transform:uppercase;margin-bottom:6px">Materiales de la orden (${items.length}):</div>
        <div style="overflow-x:auto;border:1px solid var(--mat-border);border-radius:8px">
          <table class="detail-modal-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Entregado</th>
                ${d.returnDetails || isPendingHandover || isRejectedReceipt || isCompleted ? `
                  <th style="color:#047857">Devuelto</th>
                  <th style="color:#0284c7">Utilizado</th>
                  <th style="color:#dc2626">Dañado</th>
                ` : ''}
              </tr>
            </thead>
            <tbody>
              ${rowsItems}
            </tbody>
          </table>
        </div>
      </div>

      <div style="background:#f8fafc;border:1px solid var(--mat-border);border-radius:10px;padding:12px;margin-bottom:14px;font-size:12px">
        <div style="font-size:11px;font-weight:800;color:var(--mat-muted);text-transform:uppercase;margin-bottom:8px">Historial y Participantes:</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px">
          <div>
            <span style="color:var(--mat-muted)">Técnico responsable:</span><br>
            <strong>${escapeHtml(d.technicianName || techName(d.technicianId))}</strong>
          </div>
          <div>
            <span style="color:var(--mat-muted)">Entregado por Soporte:</span><br>
            <strong>${escapeHtml(d.createdByName || 'Soporte')}</strong>
          </div>
          <div>
            <span style="color:var(--mat-muted)">Aceptación del Técnico:</span><br>
            ${d.acceptedAt ? `
              <strong style="color:#047857">✓ Aceptado (${new Date(d.acceptedAt).toLocaleString('es-MX', { dateStyle:'short', timeStyle:'short' })})</strong>
            ` : isRejectedDelivery ? `
              <strong style="color:#dc2626">✕ Devuelto a Soporte</strong>
            ` : `
              <strong style="color:#b45309">⏳ Pendiente de recibir</strong>
            `}
          </div>
          ${d.returnDetails || isPendingHandover || isRejectedReceipt || isCompleted ? `
            <div>
              <span style="color:var(--mat-muted)">Recepción en Soporte:</span><br>
              <strong>${escapeHtml(d.receivedByAdminName || d.returnDetails?.adminReceivedByName || 'Soporte')}</strong>
              ${d.receivedAt ? `<br><small>${new Date(d.receivedAt).toLocaleString('es-MX', { dateStyle:'short', timeStyle:'short' })}</small>` : ''}
            </div>
            <div>
              <span style="color:var(--mat-muted)">Confirmación de Entrega:</span><br>
              ${d.handoverAcceptedAt ? `
                <strong style="color:#047857">✓ Confirmado por técnico (${new Date(d.handoverAcceptedAt).toLocaleString('es-MX', { dateStyle:'short', timeStyle:'short' })})</strong>
              ` : isRejectedReceipt ? `
                <strong style="color:#dc2626">✕ Devuelto a Soporte</strong>
              ` : `
                <strong style="color:#c2410c">⏳ Pendiente confirmación técnico</strong>
              `}
            </div>
          ` : ''}
        </div>
      </div>

      ${d.reference || d.notes || d.receiveNotes || d.returnDetails?.adminNotes ? `
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:14px;font-size:12px">
          <div style="font-size:11px;font-weight:800;color:var(--mat-muted);text-transform:uppercase;margin-bottom:6px">Observaciones y Referencias:</div>
          ${d.reference ? `<div><b>Referencia / Folio:</b> ${escapeHtml(d.reference)}</div>` : ''}
          ${d.notes ? `<div style="margin-top:4px"><b>Notas de entrega:</b> ${escapeHtml(d.notes)}</div>` : ''}
          ${d.receiveNotes || d.returnDetails?.adminNotes ? `<div style="margin-top:4px;color:#c2410c"><b>Notas de recepción:</b> ${escapeHtml(d.receiveNotes || d.returnDetails?.adminNotes)}</div>` : ''}
        </div>
      ` : ''}
    `;
  }

  const actionsEl = document.getElementById('dispatch-detail-modal-actions');
  if (actionsEl) {
    let actionButtons = '';
    if (!isTechnician) {
      if (!isCompleted) {
        if (isRejectedDelivery) {
          actionButtons += `<button class="btn bsm" style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;font-weight:700" onclick="CM('dispatch-detail-modal');editarEnvio('${d.id}')">✎ Corregir entrega devuelta</button>`;
        } else if (isRejectedReceipt) {
          actionButtons += `<button class="btn bsm" style="background:#ea580c;color:#fff;font-weight:700" onclick="CM('dispatch-detail-modal');abrirRecepcion('${d.technicianId}', '${d.id}')">↓ Corregir recepción devuelta</button>`;
        } else {
          actionButtons += `<button class="btn bsm bgh" onclick="CM('dispatch-detail-modal');editarEnvio('${d.id}')">✎ Editar envío</button>`;
          if (isReceived) {
            actionButtons += `<button class="btn bsm bg2" onclick="CM('dispatch-detail-modal');abrirRecepcion('${d.technicianId}', '${d.id}')">↓ Recibir material</button>`;
          }
        }
      }
    } else {
      if (isPendingReceipt) {
        actionButtons += `<button class="btn bsm bg2" onclick="CM('dispatch-detail-modal');aceptarRecepcionTecnico('${d.id}')">✓ Confirmar recepción</button>`;
        actionButtons += `<button class="btn bsm" style="background:#fee2e2;color:#dc2626;border:1px solid #fecdd3;font-weight:700" onclick="CM('dispatch-detail-modal');rechazarRecepcionTecnico('${d.id}')">✕ No conforme / Devolver</button>`;
      } else if (isReceived) {
        actionButtons += `<button class="btn bsm bo2" onclick="CM('dispatch-detail-modal');abrirDevolucionTecnico('${d.id}')">↑ Entregar a soporte</button>`;
      } else if (isPendingHandover) {
        actionButtons += `<button class="btn bsm bo2" onclick="CM('dispatch-detail-modal');aceptarEntregaTecnico('${d.id}')">✓ Confirmar entrega a soporte</button>`;
        actionButtons += `<button class="btn bsm" style="background:#fee2e2;color:#dc2626;border:1px solid #fecdd3;font-weight:700" onclick="CM('dispatch-detail-modal');rechazarEntregaTecnico('${d.id}')">✕ No conforme / Devolver</button>`;
      }
    }
    actionsEl.innerHTML = `
      <button class="btn bsm" style="background:#0284c7;color:#fff;font-weight:700;display:inline-flex;align-items:center;gap:6px" onclick="abrirOficioMaterial('${d.id}')">📄 Ver Formato</button>
      ${actionButtons}
      <button class="btn bsm bgh" onclick="CM('dispatch-detail-modal')">Cerrar</button>
    `;
  }

  OM('dispatch-detail-modal');
}

/* ==========================================================================
   OPERACIONES: ENTREGAR MATERIAL (MÚLTIPLES MATERIALES A LA VEZ)
   ========================================================================== */
function buildMaterialOptionsHtml(selectedId = '') {
  const activeMaterials = (state.materials || []).filter(m => !m.deletedAt);
  return '<option value="">Selecciona material...</option>' +
    activeMaterials.map(m => `<option value="${escapeHtml(m.name)}" data-unit="${escapeHtml(m.unit)}" ${m.id === selectedId || m.name === selectedId ? 'selected' : ''}>${escapeHtml(m.name)}</option>`).join('');
}

function renderMaterialSuggestions(inputEl) {
  const query = (inputEl.value || '').trim().toLowerCase();
  const wrap = inputEl.closest('.mat-autocomplete-wrap');
  if (!wrap) return;
  const box = wrap.querySelector('.mat-suggestions-box');
  if (!box) return;

  const activeMaterials = (state.materials || []).filter(m => !m.deletedAt && (m.name || '').trim());
  
  // Si no hay texto, mostramos todos los materiales disponibles para facilitar la selección inmediata
  const matches = query
    ? activeMaterials.filter(m => m.name.toLowerCase().includes(query))
    : activeMaterials.slice(0, 15);

  if (!matches.length) {
    box.innerHTML = '<div style="padding:10px 12px;font-size:12px;color:#94a3b8">No se encontraron materiales registrados</div>';
    box.style.display = 'block';
    return;
  }

  box.innerHTML = matches.map(m => `
    <div class="mat-suggestion-item" data-name="${escapeHtml(m.name)}" data-unit="${escapeHtml(m.unit || 'pieza')}">
      <div class="mat-suggestion-left">
        <span class="mat-suggestion-name">${escapeHtml(m.name)}</span>
        <span class="mat-suggestion-unit">${escapeHtml(m.unit || 'pieza')}</span>
      </div>
      <span class="mat-suggestion-stock ${Number(m.stock) <= 0 ? 'empty' : Number(m.stock) <= Number(m.minimumStock) ? 'low' : ''}">Stock: ${qty(m.stock)}</span>
    </div>
  `).join('');

  box.style.display = 'block';

  // Eventos de selección
  box.querySelectorAll('.mat-suggestion-item').forEach(item => {
    item.onmousedown = (e) => {
      e.preventDefault(); // Evitar perder foco prematuramente
      const matName = item.dataset.name;
      const matUnit = item.dataset.unit;
      inputEl.value = matName;
      const unitSelect = inputEl.closest('.deliver-item-row')?.querySelector('.deliver-row-unit');
      if (unitSelect && matUnit) {
        unitSelect.value = matUnit.toLowerCase();
      }
      box.style.display = 'none';
    };
  });
}

function hideMaterialSuggestions(inputEl) {
  setTimeout(() => {
    const wrap = inputEl.closest('.mat-autocomplete-wrap');
    const box = wrap?.querySelector('.mat-suggestions-box');
    if (box) box.style.display = 'none';
  }, 200);
}

function addDeliverRow(materialNameOrId = '', quantity = 1, unit = 'pieza') {
  const list = document.getElementById('deliver-items-list');
  if (!list) return;

  let initialName = materialNameOrId || '';
  let initialUnit = unit || 'pieza';
  const foundMat = (state.materials || []).find(m => m.id === materialNameOrId || m.name.toLowerCase() === String(materialNameOrId).toLowerCase());
  if (foundMat) {
    initialName = foundMat.name;
    initialUnit = foundMat.unit || unit;
  }

  const row = document.createElement('div');
  row.className = 'deliver-item-row';
  row.innerHTML = `
    <div class="mat-autocomplete-wrap">
      <div class="mat-search-input-box">
        <span class="mat-input-icon">📦</span>
        <input type="text" class="deliver-row-material" autocomplete="off" placeholder="Escribe o selecciona material..." value="${escapeHtml(initialName)}" oninput="renderMaterialSuggestions(this)" onfocus="renderMaterialSuggestions(this)" onblur="hideMaterialSuggestions(this)">
      </div>
      <div class="mat-suggestions-box"></div>
    </div>
    <div class="deliver-qty-box">
      <input type="number" class="deliver-row-qty" min="0.01" step="0.01" value="${quantity}" placeholder="Cant.">
    </div>
    <div class="deliver-unit-box">
      <select class="deliver-row-unit">
        <option value="pieza" ${initialUnit === 'pieza' ? 'selected' : ''}>pieza</option>
        <option value="metro" ${initialUnit === 'metro' ? 'selected' : ''}>metro</option>
        <option value="unidad" ${initialUnit === 'unidad' ? 'selected' : ''}>unidad</option>
        <option value="rollo" ${initialUnit === 'rollo' ? 'selected' : ''}>rollo</option>
        <option value="paquete" ${initialUnit === 'paquete' ? 'selected' : ''}>paquete</option>
        <option value="bobina" ${initialUnit === 'bobina' ? 'selected' : ''}>bobina</option>
        <option value="caja" ${initialUnit === 'caja' ? 'selected' : ''}>caja</option>
        <option value="kit" ${initialUnit === 'kit' ? 'selected' : ''}>kit</option>
        <option value="kg" ${initialUnit === 'kg' ? 'selected' : ''}>kg</option>
      </select>
    </div>
    <button type="button" class="deliver-row-remove-btn" onclick="removeDeliverRow(this)" title="Quitar este material">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
    </button>
  `;
  list.appendChild(row);
}

function onDeliverRowMaterialInput(inputEl) {
  renderMaterialSuggestions(inputEl);
  const val = (inputEl.value || '').trim().toLowerCase();
  if (!val) return;
  const mat = (state.materials || []).find(m => m.name.toLowerCase() === val);
  if (mat && mat.unit) {
    const unitSelect = inputEl.closest('.deliver-item-row')?.querySelector('.deliver-row-unit');
    if (unitSelect) unitSelect.value = mat.unit.toLowerCase();
  }
}

function removeDeliverRow(btn) {
  const list = document.getElementById('deliver-items-list');
  if (!list) return;
  if (list.children.length <= 1) {
    return notify('La entrega debe contener al menos un material.', 'warn');
  }
  btn.closest('.deliver-item-row')?.remove();
}

function onDeliverRowMaterialChanged(selectEl) {
  const selectedOpt = selectEl.options[selectEl.selectedIndex];
  const unit = selectedOpt?.dataset?.unit || 'Pieza';
  const badge = selectEl.closest('.deliver-item-row')?.querySelector('.deliver-row-unit-badge');
  if (badge) badge.textContent = unit;
}

async function abrirEntrega(materialId = '', technicianId = '') {
  await cargarDirectorioTecnicos();
  updateMaterialDatalist();
  const selectTech = document.getElementById('deliver-tech');
  const itemsList = document.getElementById('deliver-items-list');
  if (!selectTech || !itemsList) return;

  const activeTechs = (state.technicians || []).filter(t => !t.deletedAt && t.estado !== 'inactivo');
  selectTech.innerHTML = '<option value="">Selecciona técnico...</option>' +
    activeTechs.map(t => `<option value="${t.id}">${escapeHtml(t.nombre)}</option>`).join('');

  if (technicianId) selectTech.value = technicianId;

  itemsList.innerHTML = '';
  addDeliverRow(materialId, 1);

  document.getElementById('deliver-reference').value = '';
  document.getElementById('deliver-notes').value = '';

  OM('deliver-material-mo');
}

async function guardarEntrega() {
  try {
    const selectTech = document.getElementById('deliver-tech');
    const technicianId = selectTech?.value;
    const reference = (document.getElementById('deliver-reference')?.value || '').trim();
    const notes = (document.getElementById('deliver-notes')?.value || '').trim();

    if (!technicianId) {
      return notify('Selecciona el técnico receptor.', 'err');
    }

    const selectedOptionText = selectTech?.selectedOptions?.[0]?.textContent?.trim() || '';
    const tech = (state.technicians || []).find(t => t.id === technicianId || t.userId === technicianId || t.usuario === technicianId) || {
      id: technicianId,
      nombre: selectedOptionText || 'Técnico'
    };
    const techDisplayName = tech.nombre || tech.name || selectedOptionText || 'Técnico';

    // Recolectar filas de materiales
    const rows = Array.from(document.querySelectorAll('#deliver-items-list .deliver-item-row'));
    const items = [];

    for (const row of rows) {
      const matInput = row.querySelector('.deliver-row-material');
      const matName = (matInput?.value || '').trim();
      const qtyVal = Number(row.querySelector('.deliver-row-qty')?.value);
      const unitVal = row.querySelector('.deliver-row-unit')?.value || 'pieza';
      if (!matName || !(qtyVal > 0)) {
        return notify('Verifica que todos los materiales tengan un nombre y cantidad mayor a cero.', 'err');
      }
      const mat = (state.materials || []).find(m => (m?.name && m.name.toLowerCase() === matName.toLowerCase()) || m?.id === matName);
      items.push({
        materialId: mat?.id || ('mat-' + Math.random().toString(36).slice(2, 10)),
        materialName: mat?.name || matName,
        quantity: qtyVal,
        unit: unitVal
      });
    }

    if (!items.length) {
      return notify('Agrega al menos un material a la entrega.', 'err');
    }

    const currentUser = (typeof getCurrentUser === 'function' ? getCurrentUser() : null) || {};
    const supportName = currentUser.name || currentUser.username || 'Soporte';
    const now = new Date().toISOString();

    // Cerrar modal de entrega para dar paso limpio al lienzo de firma sin traslape
    CM('deliver-material-mo');

    // FIRMA OBLIGATORIA DE SOPORTE QUE ENTREGA
    const sig = await promptDigitalSignature({
      title: 'Firma de Entrega de Material',
      subtitle: `Firma de quien entrega el material para el técnico ${techDisplayName}.`,
      signerName: supportName,
      role: 'Entrega (Soporte)'
    });

    if (!sig || !sig.signature) {
      OM('deliver-material-mo');
      notify('Entrega cancelada: la firma de entrega es obligatoria.', 'warn');
      return;
    }

    const primaryMaterial = (state.materials || []).find(m => m.id === items[0].materialId);

    const dispatch = {
      id: gid('mm'),
      materialId: items[0].materialId,
      materialName: items.length === 1 ? items[0].materialName : `${items[0].materialName} (+${items.length - 1} más)`,
      unit: items[0].unit,
      items: items,
      quantity: items.reduce((sum, item) => sum + item.quantity, 0),
      technicianId: tech.id || technicianId,
      technicianUserId: tech.userId || tech.id || technicianId,
      technicianName: techDisplayName,
      type: 'give',
      reference: reference,
      reason: 'Entrega a técnico',
      notes: notes,
      status: 'pending_receipt',
      isEdited: false,
      giverSignature: sig.signature,
      giverSignatureName: sig.signerName || supportName,
      giverSignatureAt: sig.timestamp || now,
      giverSignatureRole: sig.role || 'Entrega (Soporte)',
      receiverSignature: null,
      receiverSignatureName: null,
      receiverSignatureAt: null,
      createdBy: currentUser.id || '',
      createdByName: supportName,
      at: now,
      createdAt: now,
      updatedAt: now
    };

    // Mantener en estado de movimientos directos
    state.materialMovements = state.materialMovements || [];
    state.materialMovements.unshift(dispatch);

    if (primaryMaterial) {
      primaryMaterial.movements = primaryMaterial.movements || [];
      primaryMaterial.movements.unshift(dispatch);
      primaryMaterial.updatedAt = now;
    }

    renderMaterialViews();

    const saved = await saveRecord('materialMovements', dispatch);
    if (saved) {
      notify(`✓ Entrega registrada y firmada para ${techDisplayName}.`);
      void loadMaterialPage();
      abrirOficioMaterial(dispatch.id);
    }
  } catch (err) {
    console.error('Error en guardarEntrega:', err);
    notify('Error al procesar la entrega: ' + (err?.message || err), 'err');
    OM('deliver-material-mo');
  }
}

/* ==========================================================================
   OPERACIONES: EDITAR ENVÍO (CON MÚLTIPLES MATERIALES & ALERTA DE EDICIÓN)
   ========================================================================== */
function addEditRow(materialNameOrId = '', quantity = 1, unit = 'pieza') {
  const list = document.getElementById('edit-items-list');
  if (!list) return;

  let initialName = materialNameOrId || '';
  let initialUnit = unit || 'pieza';
  const foundMat = (state.materials || []).find(m => m.id === materialNameOrId || m.name.toLowerCase() === String(materialNameOrId).toLowerCase());
  if (foundMat) {
    initialName = foundMat.name;
    initialUnit = foundMat.unit || unit;
  }

  const row = document.createElement('div');
  row.className = 'deliver-item-row';
  row.innerHTML = `
    <div class="mat-autocomplete-wrap">
      <div class="mat-search-input-box">
        <span class="mat-input-icon">📦</span>
        <input type="text" class="deliver-row-material" autocomplete="off" placeholder="Escribe o selecciona material..." value="${escapeHtml(initialName)}" oninput="renderMaterialSuggestions(this)" onfocus="renderMaterialSuggestions(this)" onblur="hideMaterialSuggestions(this)">
      </div>
      <div class="mat-suggestions-box"></div>
    </div>
    <div class="deliver-qty-box">
      <input type="number" class="deliver-row-qty" min="0.01" step="0.01" value="${quantity}" placeholder="Cant.">
    </div>
    <div class="deliver-unit-box">
      <select class="deliver-row-unit">
        <option value="pieza" ${initialUnit === 'pieza' ? 'selected' : ''}>pieza</option>
        <option value="metro" ${initialUnit === 'metro' ? 'selected' : ''}>metro</option>
        <option value="unidad" ${initialUnit === 'unidad' ? 'selected' : ''}>unidad</option>
        <option value="rollo" ${initialUnit === 'rollo' ? 'selected' : ''}>rollo</option>
        <option value="paquete" ${initialUnit === 'paquete' ? 'selected' : ''}>paquete</option>
        <option value="bobina" ${initialUnit === 'bobina' ? 'selected' : ''}>bobina</option>
        <option value="caja" ${initialUnit === 'caja' ? 'selected' : ''}>caja</option>
        <option value="kit" ${initialUnit === 'kit' ? 'selected' : ''}>kit</option>
        <option value="kg" ${initialUnit === 'kg' ? 'selected' : ''}>kg</option>
      </select>
    </div>
    <button type="button" class="deliver-row-remove-btn" onclick="removeEditRow(this)" title="Quitar este material">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
    </button>
  `;
  list.appendChild(row);
}

function removeEditRow(btn) {
  const list = document.getElementById('edit-items-list');
  if (!list) return;
  if (list.children.length <= 1) {
    return notify('La entrega debe contener al menos un material.', 'warn');
  }
  btn.closest('.deliver-item-row')?.remove();
}

function editarEnvio(dispatchId) {
  const all = getAllDispatches();
  const dispatch = all.find(d => d.id === dispatchId);
  if (!dispatch) return notify('Envío no encontrado', 'err');

  updateMaterialDatalist();
  document.getElementById('edit-dispatch-id').value = dispatch.id;

  const rejectedBanner = document.getElementById('edit-dispatch-rejected-banner');
  if (rejectedBanner) {
    if (dispatch.status === 'rejected_delivery' || dispatch.rejectionReason) {
      rejectedBanner.style.display = 'block';
      rejectedBanner.innerHTML = `
        <div style="font-weight:700;color:#991b1b;display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <span>🔴 Motivo de devolución del técnico:</span>
        </div>
        <div style="color:#7f1d1d;font-style:italic;background:#fff;padding:8px 10px;border-radius:6px;border:1px solid #fecdd3">
          "${escapeHtml(dispatch.rejectionReason || 'No conforme')}"
        </div>
        <div style="font-size:11px;color:#991b1b;margin-top:6px">
          Ajusta los materiales y cantidades a continuación. Los datos originales se conservan para que no tengas que escribir todo de nuevo.
        </div>
      `;
    } else {
      rejectedBanner.style.display = 'none';
      rejectedBanner.innerHTML = '';
    }
  }

  const selectTech = document.getElementById('edit-dispatch-tech');
  const activeTechs = (state.technicians || []).filter(t => !t.deletedAt && t.estado !== 'inactivo');
  selectTech.innerHTML = activeTechs.map(t => `<option value="${t.id}">${escapeHtml(t.nombre)}</option>`).join('');
  selectTech.value = dispatch.technicianId;

  const editItemsList = document.getElementById('edit-items-list');
  editItemsList.innerHTML = '';

  const items = Array.isArray(dispatch.items) && dispatch.items.length 
    ? dispatch.items 
    : [{ materialId: dispatch.materialId, materialName: dispatch.materialName, quantity: dispatch.quantity, unit: dispatch.unit || 'pieza' }];

  items.forEach(it => {
    addEditRow(it.materialName || it.materialId, it.quantity, it.unit || 'pieza');
  });

  document.getElementById('edit-dispatch-reference').value = dispatch.reference || '';
  document.getElementById('edit-dispatch-notes').value = dispatch.notes || '';

  OM('edit-dispatch-mo');
}

async function guardarEdicionEnvio() {
  const dispatchId = document.getElementById('edit-dispatch-id')?.value;
  const newTechId = document.getElementById('edit-dispatch-tech')?.value;
  const newRef = document.getElementById('edit-dispatch-reference')?.value.trim();
  const newNotes = document.getElementById('edit-dispatch-notes')?.value.trim();

  if (!dispatchId || !newTechId) return notify('Completa los campos obligatorios.', 'err');

  const rows = Array.from(document.querySelectorAll('#edit-items-list .deliver-item-row'));
  const items = [];

  for (const row of rows) {
    const matName = row.querySelector('.deliver-row-material')?.value?.trim();
    const qtyVal = Number(row.querySelector('.deliver-row-qty')?.value);
    const unitVal = row.querySelector('.deliver-row-unit')?.value || 'pieza';
    if (!matName || !(qtyVal > 0)) {
      return notify('Todos los materiales deben tener un nombre y una cantidad válida mayor a cero.', 'err');
    }
    const mat = (state.materials || []).find(m => m.name.toLowerCase() === matName.toLowerCase() || m.id === matName);
    items.push({
      materialId: mat?.id || ('mat-' + Math.random().toString(36).slice(2, 10)),
      materialName: mat?.name || matName,
      quantity: qtyVal,
      unit: unitVal
    });
  }

  if (!items.length) return notify('Debe haber al menos un material.', 'err');

  const all = getAllDispatches();
  const dispatch = all.find(d => d.id === dispatchId);
  if (!dispatch) return notify('Envío no encontrado.', 'err');

  const newTech = (state.technicians || []).find(t => t.id === newTechId || t.userId === newTechId);

  // BOTÓN EXTRA DE CONFIRMACIÓN OBLIGATORIO
  const confirmed = await askConfirmation({
    title: 'Confirmar modificación de envío',
    message: `¿Estás seguro de modificar este envío? El técnico ${newTech?.nombre || ''} recibirá un aviso de que fue editado y deberá confirmar los materiales actualizados.`,
    confirmText: 'Sí, guardar cambios',
    cancelText: 'Cancelar',
    tone: 'ok'
  });
  if (!confirmed) return;

  const currentUser = getCurrentUser();
  const now = new Date().toISOString();

  // "en caso de que se edite el material a entregar también debe de aparecerle al técnico la confirmación con el material pero con una notificación de que fue editado"
  dispatch.items = items;
  dispatch.materialId = items[0].materialId;
  dispatch.materialName = items.length === 1 ? items[0].materialName : `${items[0].materialName} (+${items.length - 1} más)`;
  dispatch.unit = items[0].unit;
  dispatch.quantity = items.reduce((sum, it) => sum + it.quantity, 0);
  dispatch.technicianId = newTech?.id || newTechId;
  dispatch.technicianName = newTech?.nombre || dispatch.technicianName;
  dispatch.reference = newRef;
  dispatch.notes = newNotes;
  dispatch.isEdited = true;
  dispatch.editedAt = now;
  dispatch.editedByName = currentUser.name || currentUser.username || 'Soporte';
  dispatch.status = 'pending_receipt'; // El técnico debe reconfirmar la entrega editada
  dispatch.acceptedAt = null;
  dispatch.acceptedBy = null;
  dispatch.acceptedByName = null;
  dispatch.rejectionReason = null;
  dispatch.rejectedAt = null;
  dispatch.rejectedBy = null;
  dispatch.rejectedByName = null;
  dispatch.receiptRejectionReason = null;
  dispatch.receiptRejectedAt = null;
  dispatch.receiptRejectedBy = null;
  dispatch.receiptRejectedByName = null;
  dispatch.updatedAt = now;

  // Actualizar en state.materialMovements
  if (Array.isArray(state.materialMovements)) {
    const idx = state.materialMovements.findIndex(x => x.id === dispatchId);
    if (idx >= 0) state.materialMovements[idx] = { ...dispatch };
  }

  // Actualizar en el material local si existía
  for (const m of (state.materials || [])) {
    const idx = (m.movements || []).findIndex(x => x.id === dispatchId);
    if (idx >= 0) {
      m.movements[idx] = { ...dispatch };
      m.updatedAt = now;
    }
  }

  CM('edit-dispatch-mo');
  renderMaterialViews();

  const saved = await saveRecord('materialMovements', dispatch);
  if (saved) {
    notify('✓ Envío actualizado. El técnico verá la notificación de que fue editado.');
    void loadMaterialPage();
  }
}

/* ==========================================================================
   OPERACIONES: RECIBIR MATERIAL (Solo sobre envíos YA recibidos por técnico)
   ========================================================================== */
async function abrirRecepcion(technicianId = '', dispatchId = '') {
  await cargarDirectorioTecnicos();
  const selectTech = document.getElementById('receive-tech');
  if (!selectTech) return;

  const activeTechs = (state.technicians || []).filter(t => !t.deletedAt && t.estado !== 'inactivo');
  selectTech.innerHTML = '<option value="">Selecciona técnico...</option>' +
    activeTechs.map(t => `<option value="${t.id}">${escapeHtml(t.nombre)}</option>`).join('');

  if (technicianId) {
    selectTech.value = technicianId;
  } else if (activeTechs.length === 1) {
    selectTech.value = activeTechs[0].id;
  }

  onReceiveTechChanged(dispatchId);
  OM('receive-material-mo');
}

function onReceiveTechChanged(preselectedDispatchId = '') {
  const techId = document.getElementById('receive-tech')?.value;
  const warningEl = document.getElementById('receive-empty-warning');
  const formFieldsEl = document.getElementById('receive-dispatch-form-fields');
  const dispatchSelect = document.getElementById('receive-dispatch-select');

  if (!techId) {
    if (warningEl) warningEl.style.display = 'none';
    if (formFieldsEl) formFieldsEl.style.display = 'none';
    return;
  }

  // "les aparezca la opción de entregar solo si ya se ha recibido el material"
  // Solo se pueden recibir envíos con status 'received' (confirmados por el técnico) o en proceso de entrega
  const selectedTech = (state.technicians || []).find(t => t.id === techId || t.userId === techId);
  const all = getAllDispatches();
  const eligibleDispatches = all.filter(d => {
    const isTech = (d.technicianId === techId) ||
                   (selectedTech?.id && d.technicianId === selectedTech.id) ||
                   (selectedTech?.userId && d.technicianId === selectedTech.userId) ||
                   (selectedTech?.nombre && normalizeName(d.technicianName || '') === normalizeName(selectedTech.nombre));
    return isTech && (d.status === 'received' || d.status === 'pending_handover' || d.status === 'rejected_receipt');
  });

  if (eligibleDispatches.length === 0) {
    if (warningEl) {
      warningEl.style.display = 'flex';
      const warningText = document.getElementById('receive-empty-warning-text');
      if (warningText) {
        warningText.textContent = 'Este técnico no tiene materiales recibidos en su posesión para entregar. Solo se puede recibir material sobre un envío que el técnico ya haya confirmado haber recibido previamente en su perfil.';
      }
    }
    if (formFieldsEl) formFieldsEl.style.display = 'none';
    return;
  }

  if (warningEl) warningEl.style.display = 'none';
  if (formFieldsEl) formFieldsEl.style.display = 'block';

  dispatchSelect.innerHTML = eligibleDispatches.map(d => {
    const dateStr = d.at ? new Date(d.at).toLocaleDateString('es-MX') : 'Reciente';
    const itemsCount = (d.items || []).length;
    return `<option value="${d.id}">${escapeHtml(d.materialName)} (${itemsCount} art.) - Enviado ${dateStr}</option>`;
  }).join('');

  if (preselectedDispatchId && eligibleDispatches.some(d => d.id === preselectedDispatchId)) {
    dispatchSelect.value = preselectedDispatchId;
  }

  onReceiveDispatchSelected();
}

function onReceiveDispatchSelected() {
  const dispatchId = document.getElementById('receive-dispatch-select')?.value;
  const all = getAllDispatches();
  const dispatch = all.find(d => d.id === dispatchId);
  if (!dispatch) return;

  const rejectedBanner = document.getElementById('receive-dispatch-rejected-banner');
  if (rejectedBanner) {
    if (dispatch.status === 'rejected_receipt' || dispatch.receiptRejectionReason) {
      rejectedBanner.style.display = 'block';
      rejectedBanner.innerHTML = `
        <div style="font-weight:700;color:#991b1b;display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <span>🔴 Motivo de no conformidad del técnico:</span>
        </div>
        <div style="color:#7f1d1d;font-style:italic;background:#fff;padding:8px 10px;border-radius:6px;border:1px solid #fecdd3">
          "${escapeHtml(dispatch.receiptRejectionReason || 'No conforme')}"
        </div>
        <div style="font-size:11px;color:#991b1b;margin-top:6px">
          Ajusta las cantidades devueltas y utilizadas abajo para corregir la recepción. Los valores previos se han precargado para tu comodidad.
        </div>
      `;
    } else {
      rejectedBanner.style.display = 'none';
      rejectedBanner.innerHTML = '';
    }
  }

  const matNameEl = document.getElementById('receive-summary-mat-name');
  const dateEl = document.getElementById('receive-summary-date');
  const adminEl = document.getElementById('receive-summary-admin');
  const acceptedDateEl = document.getElementById('receive-summary-accepted-date');

  if (matNameEl) matNameEl.textContent = dispatch.materialName;
  if (dateEl) dateEl.textContent = dispatch.at ? new Date(dispatch.at).toLocaleString('es-MX', { dateStyle:'short', timeStyle:'short' }) : '-';
  if (adminEl) adminEl.textContent = dispatch.createdByName || 'Soporte';
  if (acceptedDateEl) acceptedDateEl.textContent = dispatch.acceptedAt ? new Date(dispatch.acceptedAt).toLocaleString('es-MX', { dateStyle:'short', timeStyle:'short' }) : 'No registrado';

  // Desglose de cada material
  const breakdownContainer = document.getElementById('receive-items-breakdown-container');
  if (breakdownContainer) {
    const items = Array.isArray(dispatch.items) && dispatch.items.length ? dispatch.items : [{ materialName: dispatch.materialName, quantity: dispatch.quantity, unit: dispatch.unit || 'pieza' }];
    breakdownContainer.innerHTML = items.map((it, idx) => {
      const retItem = dispatch.returnDetails?.items?.[idx] || dispatch.returnDetails?.items?.find(r => r.materialName === it.materialName || r.materialId === it.materialId);
      const defaultGood = retItem != null ? Number(retItem.returnedGood ?? 0) : (dispatch.returnedChange != null && items.length === 1 ? Number(dispatch.returnedChange) : Number(it.quantity));
      const defaultDamaged = retItem != null ? Number(retItem.returnedDamaged ?? 0) : (dispatch.returnedDamaged != null && items.length === 1 ? Number(dispatch.returnedDamaged) : 0);
      const defaultUsed = retItem != null ? Number(retItem.usedQuantity ?? 0) : (dispatch.usedQuantity != null && items.length === 1 ? Number(dispatch.usedQuantity) : 0);

      return `
        <div class="receive-breakdown-card">
          <div class="receive-breakdown-card-head">
            <div class="receive-breakdown-mat-info">
              <span class="receive-mat-icon">📦</span>
              <div>
                <strong class="receive-breakdown-mat-name">${escapeHtml(it.materialName)}</strong>
                <div class="receive-breakdown-mat-unit">${escapeHtml(it.unit || 'pieza')}</div>
              </div>
            </div>
            <span class="receive-delivered-badge">Entregado: <b>${qty(it.quantity)}</b> ${escapeHtml(it.unit || 'pz')}</span>
          </div>
          <div class="receive-breakdown-grid">
            <div class="receive-input-box good">
              <label><span>🟢</span> Buen estado</label>
              <input type="number" class="receive-item-good" data-index="${idx}" min="0" step="0.01" value="${defaultGood}">
            </div>
            <div class="receive-input-box used">
              <label><span>🛠️</span> Utilizado</label>
              <input type="number" class="receive-item-used" data-index="${idx}" min="0" step="0.01" value="${defaultUsed}">
            </div>
            <div class="receive-input-box damaged">
              <label><span>⚠️</span> Dañado</label>
              <input type="number" class="receive-item-damaged" data-index="${idx}" min="0" step="0.01" value="${defaultDamaged}">
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  document.getElementById('receive-reference').value = dispatch.reference || '';
  document.getElementById('receive-notes').value = dispatch.receiveNotes || dispatch.returnDetails?.adminNotes || '';
}

async function guardarRecepcion() {
  try {
    const dispatchId = document.getElementById('receive-dispatch-select')?.value;
    const all = getAllDispatches();
    const dispatch = all.find(d => d.id === dispatchId);
    if (!dispatch) return notify('Envío original no encontrado.', 'err');

    const goodInputs = Array.from(document.querySelectorAll('.receive-item-good'));
    const damagedInputs = Array.from(document.querySelectorAll('.receive-item-damaged'));
    const usedInputs = Array.from(document.querySelectorAll('.receive-item-used'));

    let totalGood = 0;
    let totalDamaged = 0;
    let totalUsed = 0;

    goodInputs.forEach(inp => totalGood += Number(inp.value) || 0);
    damagedInputs.forEach(inp => totalDamaged += Number(inp.value) || 0);
    usedInputs.forEach(inp => totalUsed += Number(inp.value) || 0);

    if (totalGood + totalDamaged + totalUsed <= 0) {
      return notify('Indica al menos una cantidad a recibir.', 'err');
    }

    // Cerrar modal de recepción para dar paso limpio al lienzo de firma sin traslape
    CM('receive-material-mo');

    const currentUser = (typeof getCurrentUser === 'function' ? getCurrentUser() : null) || {};
    const supportSignerName = currentUser.name || currentUser.username || 'Soporte';

    const sig = await promptDigitalSignature({
      title: 'Firma de Recepción de Material',
      subtitle: 'Certificas la recepción del material devuelto.',
      signerName: supportSignerName,
      role: 'Recibe (Soporte)'
    });
    if (!sig || !sig.signature) {
      OM('receive-material-mo');
      notify('Recepción cancelada: la firma de recepción es obligatoria.', 'warn');
      return;
    }

    const now = new Date().toISOString();
    const reference = (document.getElementById('receive-reference')?.value || '').trim();
    const notes = (document.getElementById('receive-notes')?.value || '').trim();

    const items = Array.isArray(dispatch.items) && dispatch.items.length 
      ? dispatch.items 
      : [{ materialId: dispatch.materialId, materialName: dispatch.materialName, quantity: dispatch.quantity, unit: dispatch.unit || 'pieza' }];

    const returnItems = items.map((it, idx) => ({
      materialId: it.materialId || dispatch.materialId,
      materialName: it.materialName,
      deliveredQuantity: Number(it.quantity) || 0,
      returnedGood: Number(goodInputs[idx]?.value) || 0,
      returnedDamaged: Number(damagedInputs[idx]?.value) || 0,
      usedQuantity: Number(usedInputs[idx]?.value) || 0,
      unit: it.unit || 'pieza'
    }));

    // Soporte registra la recepción en almacén con su firma
    dispatch.returnReceiverSignature = sig.signature;
    dispatch.returnReceiverSignatureName = sig.signerName || supportSignerName;
    dispatch.returnReceiverSignatureAt = sig.timestamp || now;
    dispatch.returnReceiverSignatureRole = sig.role || 'Recibe (Soporte)';
    dispatch.status = dispatch.returnGiverSignature ? 'completed' : 'pending_handover';
    dispatch.returnedChange = totalGood;
    dispatch.returnedDamaged = totalDamaged;
    dispatch.usedQuantity = totalUsed;
    dispatch.receivedByAdminId = currentUser.id || '';
    dispatch.receivedByAdminName = currentUser.name || currentUser.username || 'Soporte';
    dispatch.receivedAt = now;
    dispatch.receiveNotes = notes;
    if (reference) dispatch.reference = reference;
    dispatch.returnDetails = {
      adminReceivedBy: currentUser.id || '',
      adminReceivedByName: currentUser.name || currentUser.username || 'Soporte',
      adminReceivedAt: now,
      adminNotes: notes,
      reference: reference,
      items: returnItems,
      techConfirmedBy: null,
      techConfirmedByName: null,
      techConfirmedAt: null
    };
    dispatch.receiptRejectionReason = null;
    dispatch.receiptRejectedAt = null;
    dispatch.receiptRejectedBy = null;
    dispatch.receiptRejectedByName = null;
    dispatch.updatedAt = now;

    // Actualizar en state.materialMovements
    if (Array.isArray(state.materialMovements)) {
      const idx = state.materialMovements.findIndex(x => x.id === dispatchId);
      if (idx >= 0) state.materialMovements[idx] = { ...dispatch };
    }

    for (const m of (state.materials || [])) {
      const idx = (m.movements || []).findIndex(x => x.id === dispatchId);
      if (idx >= 0) {
        m.movements[idx] = { ...dispatch };
        m.updatedAt = now;
      }
    }

    CM('receive-material-mo');
    renderMaterialViews();

    const saved = await saveRecord('materialMovements', dispatch);
    if (saved) {
      notify('✓ Recepción registrada. El técnico debe confirmar haber entregado el material en su perfil.');
      void loadMaterialPage();
    }
  } catch (err) {
    console.error('Error en guardarRecepcion:', err);
    notify('Error al procesar la recepción: ' + (err?.message || err), 'err');
    OM('receive-material-mo');
  }
}

/* ==========================================================================
   TÉCNICO: ENTREGAR / DEVOLVER MATERIAL A SOPORTE DESDE SU CELULAR
   ========================================================================== */
function abrirDevolucionTecnico(dispatchId) {
  const all = getAllDispatches();
  const dispatch = all.find(d => d.id === dispatchId);
  if (!dispatch) return notify('Envío no encontrado.', 'err');

  // "les aparezca la opción de entregar solo si ya se ha recibido el material"
  if (dispatch.status !== 'received') {
    return notify('Solo puedes entregar material que ya hayas confirmado de recibido.', 'err');
  }

  document.getElementById('tech-return-dispatch-id').value = dispatch.id;
  const summaryEl = document.getElementById('tech-return-summary');
  const itemsContainer = document.getElementById('tech-return-items-container');

  if (summaryEl) {
    summaryEl.innerHTML = `
      <h4>Envío #${escapeHtml(String(dispatch.id || '').slice(-6).toUpperCase())}</h4>
      <div style="font-size:12px;color:var(--mat-muted)">
        <div>Recibido el: <strong>${dispatch.acceptedAt ? new Date(dispatch.acceptedAt).toLocaleString('es-MX', { dateStyle:'short', timeStyle:'short' }) : 'Reciente'}</strong></div>
      </div>
    `;
  }

  if (itemsContainer) {
    const items = Array.isArray(dispatch.items) && dispatch.items.length ? dispatch.items : [{ materialName: dispatch.materialName, quantity: dispatch.quantity, unit: dispatch.unit || 'pieza' }];
    itemsContainer.innerHTML = items.map((it, idx) => `
      <div style="background:#f8fafc;border:1px solid #dfe6ef;border-radius:10px;padding:12px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <strong>${escapeHtml(it.materialName)}</strong>
          <span style="font-size:12px;color:var(--mat-primary);font-weight:700">En posesión: ${qty(it.quantity)} ${escapeHtml(it.unit || 'pieza')}</span>
        </div>
        <div class="row2">
          <div class="fi">
            <label style="font-size:10px">Cantidad a devolver</label>
            <input type="number" class="tech-return-qty-input" data-index="${idx}" min="0" step="0.01" value="${it.quantity}">
          </div>
          <div class="fi">
            <label style="font-size:10px">Cantidad utilizada en órdenes</label>
            <input type="number" class="tech-used-qty-input" data-index="${idx}" min="0" step="0.01" value="0">
          </div>
        </div>
      </div>
    `).join('');
  }

  document.getElementById('tech-return-reference').value = '';
  document.getElementById('tech-return-notes').value = '';

  OM('tech-return-material-mo');
}

async function guardarEntregaTecnicoASoporte() {
  const dispatchId = document.getElementById('tech-return-dispatch-id')?.value;
  const all = getAllDispatches();
  const dispatch = all.find(d => d.id === dispatchId);
  if (!dispatch) return notify('Envío no encontrado.', 'err');

  const returnInputs = Array.from(document.querySelectorAll('.tech-return-qty-input'));
  const usedInputs = Array.from(document.querySelectorAll('.tech-used-qty-input'));

  let totalReturned = 0;
  let totalUsed = 0;

  returnInputs.forEach(inp => totalReturned += Number(inp.value) || 0);
  usedInputs.forEach(inp => totalUsed += Number(inp.value) || 0);

  if (totalReturned + totalUsed <= 0) {
    return notify('Indica una cantidad a devolver o utilizada.', 'err');
  }

  // BOTÓN EXTRA DE CONFIRMACIÓN OBLIGATORIO
  const confirmed = await askConfirmation({
    title: 'Confirmar entrega a soporte',
    message: `¿Estás seguro de registrar la entrega de este material hacia soporte? (A devolver: ${totalReturned}, Utilizado: ${totalUsed})`,
    confirmText: 'Sí, registrar entrega',
    cancelText: 'Cancelar',
    tone: 'ok'
  });
  if (!confirmed) return;

  const currentUser = getCurrentUser();
  const techSignerName = currentUser.name || currentUser.username || dispatch.technicianName || 'Técnico';

  const sig = await promptDigitalSignature({
    title: 'Firma de Entrega de Material (Devolución)',
    subtitle: 'Certificas la entrega física de los sobrantes a soporte.',
    signerName: techSignerName,
    role: 'Entrega (Técnico)'
  });
  if (!sig || !sig.signature) {
    notify('Devolución cancelada: la firma es obligatoria.', 'warn');
    return;
  }

  const now = new Date().toISOString();
  const ref = document.getElementById('tech-return-reference')?.value.trim();
  const notes = document.getElementById('tech-return-notes')?.value.trim();

  dispatch.status = dispatch.returnReceiverSignature ? 'completed' : 'pending_handover';
  dispatch.returnGiverSignature = sig.signature;
  dispatch.returnGiverSignatureName = sig.signerName || techSignerName;
  dispatch.returnGiverSignatureAt = sig.timestamp || now;
  dispatch.returnGiverSignatureRole = sig.role || 'Entrega (Técnico)';
  dispatch.returnedChange = totalReturned;
  dispatch.usedQuantity = totalUsed;
  dispatch.handoverInitiatedByTech = true;
  dispatch.handoverAcceptedAt = now;
  dispatch.handoverAcceptedBy = currentUser.id || '';
  dispatch.handoverAcceptedByName = techSignerName;
  if (ref) dispatch.reference = ref;
  if (notes) dispatch.notes = notes;
  dispatch.receiptRejectionReason = null;
  dispatch.receiptRejectedAt = null;
  dispatch.receiptRejectedBy = null;
  dispatch.receiptRejectedByName = null;
  dispatch.updatedAt = now;

  if (Array.isArray(state.materialMovements)) {
    const idx = state.materialMovements.findIndex(x => x.id === dispatchId);
    if (idx >= 0) state.materialMovements[idx] = { ...dispatch };
  }

  for (const m of (state.materials || [])) {
    const idx = (m.movements || []).findIndex(x => x.id === dispatchId);
    if (idx >= 0) {
      m.movements[idx] = { ...dispatch };
      m.updatedAt = now;
    }
  }

  CM('tech-return-material-mo');
  renderMaterialViews();

  const saved = await saveRecord('materialMovements', dispatch);
  if (saved) {
    notify('✓ Entrega de material registrada y firmada hacia soporte.');
    abrirOficioMaterial(dispatch.id);
    void loadMaterialPage();
  }
}

/* ==========================================================================
   CONFIRMACIONES DEL TÉCNICO (Flujo bidireccional)
   ========================================================================== */

// El técnico acepta haber recibido el material entregado por soporte
async function aceptarRecepcionTecnico(dispatchId) {
  const all = getAllDispatches();
  const dispatch = all.find(d => d.id === dispatchId);
  if (!dispatch) return notify('Envío no encontrado.', 'err');

  const currentUser = getCurrentUser();
  const techSignerName = currentUser.name || currentUser.username || dispatch.technicianName || 'Técnico';

  // BOTÓN EXTRA DE CONFIRMACIÓN OBLIGATORIO
  const itemsText = Array.isArray(dispatch.items) && dispatch.items.length
    ? dispatch.items.map(i => `${i.quantity} ${i.unit} de ${i.materialName}`).join(', ')
    : `${dispatch.quantity} ${dispatch.unit} de ${dispatch.materialName}`;

  const confirmed = await askConfirmation({
    title: 'Confirmar recepción de material',
    message: `¿Confirmas haber recibido todos los materiales y cantidades entregados por soporte? (${itemsText})`,
    confirmText: 'Sí, confirmo recibido',
    cancelText: 'Cancelar',
    tone: 'ok'
  });
  if (!confirmed) return;

  const sig = await promptDigitalSignature({
    title: 'Firma de Recepción de Material',
    subtitle: `Dibuja tu firma para certificar que recibiste el material (${itemsText}).`,
    signerName: techSignerName,
    role: 'Recibe (Técnico)'
  });
  if (!sig) return;

  const now = new Date().toISOString();

  dispatch.status = 'received';
  dispatch.acceptedAt = now;
  dispatch.receiverSignature = sig.signature;
  dispatch.receiverSignatureName = sig.signerName || techSignerName;
  dispatch.receiverSignatureAt = sig.timestamp || now;
  dispatch.acceptedBy = currentUser.id || '';
  dispatch.acceptedByName = techSignerName;
  dispatch.receiptRejectionReason = null;
  dispatch.receiptRejectedAt = null;
  dispatch.receiptRejectedBy = null;
  dispatch.receiptRejectedByName = null;
  dispatch.updatedAt = now;

  if (Array.isArray(state.materialMovements)) {
    const idx = state.materialMovements.findIndex(x => x.id === dispatchId);
    if (idx >= 0) state.materialMovements[idx] = { ...dispatch };
  }

  for (const m of (state.materials || [])) {
    const idx = (m.movements || []).findIndex(x => x.id === dispatchId);
    if (idx >= 0) {
      m.movements[idx] = { ...dispatch };
      m.updatedAt = now;
    }
  }

  renderMaterialViews();
  const saved = await saveRecord('materialMovements', dispatch);
  if (saved) {
    notify('✓ Has confirmado y firmado haber recibido el material.');
    abrirOficioMaterial(dispatch.id);
    void loadMaterialPage();
  }
}

// El técnico acepta haber entregado/devuelto el material a soporte
async function aceptarEntregaTecnico(dispatchId) {
  const all = getAllDispatches();
  const dispatch = all.find(d => d.id === dispatchId);
  if (!dispatch) return notify('Envío no encontrado.', 'err');

  const currentUser = getCurrentUser();
  const techSignerName = currentUser.name || currentUser.username || dispatch.technicianName || 'Técnico';

  // BOTÓN EXTRA DE CONFIRMACIÓN OBLIGATORIO
  const confirmed = await askConfirmation({
    title: 'Confirmar entrega a soporte',
    message: '¿Confirmas haber entregado el material a soporte conforme a las cantidades detalladas?',
    confirmText: 'Sí, confirmo entrega',
    cancelText: 'Cancelar',
    tone: 'ok'
  });
  if (!confirmed) return;

  const sig = await promptDigitalSignature({
    title: 'Firma de Entrega de Material (Devolución)',
    subtitle: 'Certificas la entrega física de los sobrantes a soporte.',
    signerName: techSignerName,
    role: 'Entrega (Técnico)'
  });
  if (!sig) return;

  const now = new Date().toISOString();

  dispatch.status = dispatch.returnReceiverSignature ? 'completed' : 'pending_handover';
  dispatch.returnGiverSignature = sig.signature;
  dispatch.returnGiverSignatureName = sig.signerName || techSignerName;
  dispatch.returnGiverSignatureAt = sig.timestamp || now;
  dispatch.handoverAcceptedAt = now;
  dispatch.handoverAcceptedBy = currentUser.id || '';
  dispatch.handoverAcceptedByName = techSignerName;
  if (dispatch.returnDetails) {
    dispatch.returnDetails.techConfirmedAt = now;
    dispatch.returnDetails.techConfirmedBy = currentUser.id || '';
    dispatch.returnDetails.techConfirmedByName = currentUser.name || currentUser.username || 'Técnico';
  }
  dispatch.receiptRejectionReason = null;
  dispatch.receiptRejectedAt = null;
  dispatch.receiptRejectedBy = null;
  dispatch.receiptRejectedByName = null;
  dispatch.updatedAt = now;

  if (Array.isArray(state.materialMovements)) {
    const idx = state.materialMovements.findIndex(x => x.id === dispatchId);
    if (idx >= 0) state.materialMovements[idx] = { ...dispatch };
  }

  for (const m of (state.materials || [])) {
    const idx = (m.movements || []).findIndex(x => x.id === dispatchId);
    if (idx >= 0) {
      m.movements[idx] = { ...dispatch };
      m.updatedAt = now;
    }
  }

  renderMaterialViews();
  const saved = await saveRecord('materialMovements', dispatch);
  if (saved) {
    notify('✓ Has confirmado y firmado la entrega del material a soporte.');
    abrirOficioMaterial(dispatch.id);
    void loadMaterialPage();
  }
}

// El técnico rechaza/devuelve la entrega realizada por soporte
async function rechazarRecepcionTecnico(dispatchId) {
  const all = getAllDispatches();
  const dispatch = all.find(d => d.id === dispatchId);
  if (!dispatch) return notify('Envío no encontrado.', 'err');

  const reason = await askReasonPrompt({
    title: 'Devolver entrega a Soporte',
    message: 'Indica el motivo por el cual no estás conforme con el material entregado (ej: falta material, cantidades incorrectas, material dañado o no corresponde):',
    placeholder: 'Escribe el motivo de la devolución...',
    confirmText: 'Devolver a Soporte',
    cancelText: 'Cancelar'
  });
  if (!reason) return;

  const currentUser = getCurrentUser();
  const now = new Date().toISOString();

  dispatch.status = 'rejected_delivery';
  dispatch.rejectionReason = reason;
  dispatch.rejectedAt = now;
  dispatch.rejectedBy = currentUser.id || '';
  dispatch.rejectedByName = currentUser.name || currentUser.username || 'Técnico';
  dispatch.updatedAt = now;

  if (Array.isArray(state.materialMovements)) {
    const idx = state.materialMovements.findIndex(x => x.id === dispatchId);
    if (idx >= 0) state.materialMovements[idx] = { ...dispatch };
  }

  for (const m of (state.materials || [])) {
    const idx = (m.movements || []).findIndex(x => x.id === dispatchId);
    if (idx >= 0) {
      m.movements[idx] = { ...dispatch };
      m.updatedAt = now;
    }
  }

  renderMaterialViews();
  const saved = await saveRecord('materialMovements', dispatch);
  if (saved) {
    notify('↩️ Entrega devuelta a soporte con tus observaciones.');
    void loadMaterialPage();
  }
}

// El técnico rechaza/devuelve el registro de recepción realizado por soporte
async function rechazarEntregaTecnico(dispatchId) {
  const all = getAllDispatches();
  const dispatch = all.find(d => d.id === dispatchId);
  if (!dispatch) return notify('Envío no encontrado.', 'err');

  const reason = await askReasonPrompt({
    title: 'Devolver recepción a Soporte',
    message: 'Indica el motivo por el cual no estás de acuerdo con las cantidades de recepción registradas por Soporte:',
    placeholder: 'Escribe el motivo de la no conformidad o cantidades reales...',
    confirmText: 'Devolver a Soporte',
    cancelText: 'Cancelar'
  });
  if (!reason) return;

  const currentUser = getCurrentUser();
  const now = new Date().toISOString();

  dispatch.status = 'rejected_receipt';
  dispatch.receiptRejectionReason = reason;
  dispatch.receiptRejectedAt = now;
  dispatch.receiptRejectedBy = currentUser.id || '';
  dispatch.receiptRejectedByName = currentUser.name || currentUser.username || 'Técnico';
  dispatch.updatedAt = now;

  if (Array.isArray(state.materialMovements)) {
    const idx = state.materialMovements.findIndex(x => x.id === dispatchId);
    if (idx >= 0) state.materialMovements[idx] = { ...dispatch };
  }

  for (const m of (state.materials || [])) {
    const idx = (m.movements || []).findIndex(x => x.id === dispatchId);
    if (idx >= 0) {
      m.movements[idx] = { ...dispatch };
      m.updatedAt = now;
    }
  }

  renderMaterialViews();
  const saved = await saveRecord('materialMovements', dispatch);
  if (saved) {
    notify('↩️ Recepción devuelta a soporte con tus observaciones.');
    void loadMaterialPage();
  }
}

/* ==========================================================================
   CATÁLOGO: AGREGAR / EDITAR MATERIAL (Existencias de Almacén)
   ========================================================================== */
function agregarMaterial() {
  currentMaterialId = null;
  materialPhotoData = '';
  document.getElementById('material-modal-title').textContent = 'Nuevo material';
  ['mat-nombre', 'mat-desc'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('mat-cantidad').value = '0';
  document.getElementById('mat-minimo').value = '0';
  document.getElementById('mat-unidad').value = 'pieza';
  document.getElementById('mat-package-size').value = '1';
  document.getElementById('mat-cantidad').disabled = false;
  document.getElementById('mat-foto').value = '';
  document.getElementById('mat-cantidad-label').textContent = 'Cantidad inicial';
  renderFotoMaterial();
  actualizarUnidadMaterial();
  OM('material-mo');
}

function editarMaterial(id) {
  const m = state.materials.find(x => x.id === id);
  if (!m) return;
  currentMaterialId = id;
  materialPhotoData = m.photo || '';
  document.getElementById('material-modal-title').textContent = 'Editar material';
  document.getElementById('mat-nombre').value = m.name;
  document.getElementById('mat-cantidad').value = m.stock;
  document.getElementById('mat-cantidad').disabled = false;
  document.getElementById('mat-cantidad-label').textContent = 'Existencia actual';
  document.getElementById('mat-minimo').value = m.minimumStock;
  document.getElementById('mat-unidad').value = m.unit;
  document.getElementById('mat-package-size').value = m.packageSize || 1;
  document.getElementById('mat-foto').value = '';
  document.getElementById('mat-desc').value = m.notes;
  renderFotoMaterial();
  actualizarUnidadMaterial();
  OM('material-mo');
}

async function guardarMaterial() {
  const name = document.getElementById('mat-nombre').value.trim();
  if (!name) return notify('El nombre es obligatorio', 'err');
  if (!materialPhotoData) return notify('Agrega al menos una foto del material.', 'err');

  const old = state.materials.find(x => x.id === currentMaterialId);
  const stockValue = document.getElementById('mat-cantidad').value.trim();
  const initialStock = Number(stockValue);
  if (stockValue === '' || !Number.isFinite(initialStock) || initialStock < 0) {
    return notify('Indica una existencia válida, igual o mayor a cero.', 'err');
  }

  const previousStock = old ? Number(old.stock) || 0 : 0;
  const actor = getCurrentUser();
  const now = new Date().toISOString();

  const rec = {
    ...(old || {}),
    id: old?.id || gid('m'),
    name,
    stock: initialStock,
    minimumStock: Number(document.getElementById('mat-minimo').value) || 0,
    unit: document.getElementById('mat-unidad').value,
    packageSize: Math.max(1, Number(document.getElementById('mat-package-size').value) || 1),
    photo: materialPhotoData,
    notes: document.getElementById('mat-desc').value.trim(),
    status: 'activo',
    allocations: old?.allocations || [],
    movements: old?.movements || [],
    updatedAt: now
  };

  if (!old && initialStock > 0) {
    rec.movement = crearMovimientoMaterial('entry', initialStock, { reference: 'Existencia inicial', at: now, actor });
  }
  if (old && Math.abs(initialStock - previousStock) > 0.0001) {
    rec.movement = crearMovimientoMaterial('adjustment', initialStock - previousStock, { reference: 'Edición del material', reason: `Existencia ajustada de ${qty(previousStock)} a ${qty(initialStock)}`, at: now, actor });
  }

  if (old) Object.assign(old, rec);
  else state.materials.push(rec);

  if (await guardarMaterialConAuditoria(rec, old ? 'modificó material de inventario' : 'creó material de inventario')) {
    CM('material-mo');
    await loadMaterialPage();
    notify(old ? 'Material actualizado.' : 'Material agregado al inventario.');
  }
}

async function eliminarMaterial(id) {
  const m = state.materials.find(x => x.id === id);
  if (!m) return;
  const confirmed = await askConfirmation({
    title: 'Eliminar material',
    message: `¿Estás seguro de eliminar "${m.name || 'este material'}" del catálogo de inventario?`,
    confirmText: 'Eliminar',
    cancelText: 'Cancelar',
    tone: 'danger'
  });
  if (!confirmed) return;
  m.deletedAt = new Date().toISOString();
  await saveRecord('materials', m);
  renderMaterialViews();
  notify(`"${m.name}" eliminado del inventario.`);
}

function crearMovimientoMaterial(type, quantity, extra = {}) {
  const actor = extra.actor || getCurrentUser();
  return {
    id: gid('mm'),
    type,
    quantity: Number(quantity) || 0,
    technicianId: extra.technicianId || '',
    returnedChange: Number(extra.returnedChange) || 0,
    returnedDamaged: Number(extra.returnedDamaged) || 0,
    usedQuantity: Number(extra.usedQuantity) || 0,
    newInstallations: !!extra.newInstallations,
    reference: extra.reference || '',
    reason: extra.reason || '',
    createdBy: actor?.id || '',
    createdByName: actor?.name || actor?.nombre || actor?.username || 'Usuario',
    at: extra.at || new Date().toISOString(),
    status: extra.status || 'pending_receipt'
  };
}

async function guardarMaterialConAuditoria(material, action) {
  const auditStart = Array.isArray(state.auditLog) ? state.auditLog.length : 0;
  if (typeof setUpdatedAudit === 'function') setUpdatedAudit(material, action);
  return typeof saveRecordWithAudit === 'function' ? saveRecordWithAudit('materials', material, auditStart) : saveRecord('materials', material);
}

async function seleccionarFotoMaterial(files) {
  const file = Array.from(files || []).find(item => /^image\//i.test(item.type));
  if (!file) return;
  try {
    materialPhotoData = await compressAdminDetailCompletionImage(file);
    renderFotoMaterial();
  } catch (error) {
    notify('No se pudo procesar la fotografía.', 'err');
  }
}

function renderFotoMaterial() {
  const preview = document.getElementById('mat-foto-preview');
  const placeholder = document.getElementById('mat-foto-placeholder');
  if (!preview || !placeholder) return;
  preview.hidden = !materialPhotoData;
  placeholder.hidden = !materialPhotoData;
  if (materialPhotoData) preview.src = materialPhotoData;
  else preview.removeAttribute('src');
}

function actualizarUnidadMaterial() {
  const unit = document.getElementById('mat-unidad')?.value || 'pieza';
  const field = document.getElementById('mat-package-size-field');
  if (field) field.hidden = !['paquete', 'caja'].includes(unit);
}

function materialOptions() {
  return (state.materials || []).filter(m => !m.deletedAt).map(m => `<option value="${m.id}">${escapeHtml(m.name)} (${qty(m.stock)} ${escapeHtml(m.unit)} disponibles)</option>`).join('');
}

function abrirEntrada(materialId = '') {
  const select = document.getElementById('entry-material');
  select.innerHTML = '<option value="">Selecciona material</option>' + materialOptions();
  select.value = materialId;
  document.getElementById('entry-qty').value = '1';
  document.getElementById('entry-reference').value = '';
  document.getElementById('entry-reason').value = '';
  actualizarEntradaInfo();
  OM('entry-mo');
}

function actualizarEntradaInfo() {
  const m = state.materials.find(x => x.id === document.getElementById('entry-material')?.value);
  document.getElementById('entry-info').textContent = m ? `Existencia actual: ${qty(m.stock)} ${m.unit}. La entrada se sumará sin borrar movimientos anteriores.` : 'Selecciona el material que llegó al almacén.';
}

async function guardarEntrada() {
  const m = state.materials.find(x => x.id === document.getElementById('entry-material').value);
  const amount = Number(document.getElementById('entry-qty').value);
  if (!m || !(amount > 0)) return notify('Selecciona el material e indica una cantidad válida.', 'err');
  const now = new Date().toISOString();
  m.stock = Number(m.stock) + amount;
  m.updatedAt = now;
  m.movement = crearMovimientoMaterial('entry', amount, { reference: document.getElementById('entry-reference').value.trim(), reason: document.getElementById('entry-reason').value.trim(), at: now });
  if (await guardarMaterialConAuditoria(m, 'registró entrada de material')) {
    CM('entry-mo');
    await loadMaterialPage();
    notify(`Entrada registrada: ${qty(amount)} ${m.unit}.`);
  }
}

async function cargarDirectorioTecnicos() {
  if (materialTechnicianDirectoryLoaded) return true;
  try {
    const people = await fetchDataPage('people', { scoped: '1', role: 'tecnico', offset: 0, limit: 100 });
    state.technicians = Array.isArray(people.technicians) ? people.technicians : (state.technicians || []);
    materialTechnicianDirectoryLoaded = true;
    return true;
  } catch (error) {
    return false;
  }
}
