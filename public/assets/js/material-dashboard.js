/* Presentación tabular del inventario. Se carga después de material.js. */
function renderMateriales() {
  const search = (document.getElementById('material-table-search')?.value || document.getElementById('material-search')?.value || '').toLowerCase().trim();
  const all = (state.materials || []).filter(m => !m.deletedAt);
  const status = document.getElementById('material-status-filter')?.value || 'all';
  const materiales = all.filter(m => {
    const matchesSearch = !search || m.name.toLowerCase().includes(search) || (m.notes || '').toLowerCase().includes(search);
    const materialStatus = Number(m.stock) <= 0 ? 'empty' : Number(m.stock) <= Number(m.minimumStock) ? 'low' : 'available';
    return matchesSearch && (status === 'all' || status === materialStatus);
  });
  const meta = window.netopsPageMeta?.materials || {};
  const stats = meta.stats || {};
  const total = Number.isFinite(Number(meta.total)) ? Number(meta.total) : all.length;
  const low = all.filter(m => Number(m.stock) <= Number(m.minimumStock) && Number(m.stock) > 0);
  const empty = all.filter(m => Number(m.stock) <= 0);
  const available = all.filter(m => Number(m.stock) > Number(m.minimumStock));

  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = typeof value === 'number' ? qty(value) : value; };
  setText('material-total', Number(stats.total) || total);
  setText('material-available-count', available.length);
  setText('material-low', Number(stats.low) || low.length);
  setText('material-empty-count', empty.length);
  setText('material-table-count', `Mostrando ${materiales.length} de ${total} materiales`);
  
  const emptyEl = document.getElementById('material-empty');
  if (emptyEl) emptyEl.style.display = materiales.length ? 'none' : 'block';

  const gridEl = document.getElementById('material-grid');
  if (gridEl) {
    gridEl.innerHTML = materiales.map(m => {
      const missing = Math.max(0, Number(m.minimumStock) - Number(m.stock));
      const stateKey = Number(m.stock) <= 0 ? 'empty' : missing > 0 ? 'low' : 'available';
      const stateLabel = stateKey === 'empty' ? 'Sin stock' : stateKey === 'low' ? 'Stock bajo' : 'Disponible';
      const sku = `MAT-${String(m.id || '').slice(-6).toUpperCase()}`;
      const photo = m.photo ? `<button class="material-photo-thumb" type="button" onclick="openEvidenceGallery(['${escapeHtml(m.photo)}'])" title="Ver fotografía"><img src="${escapeHtml(m.photo)}" alt="${escapeHtml(m.name)}"></button>` : '<span class="material-thumb material-photo-missing" title="Falta agregar fotografía">!</span>';
      return `<article class="material-row">
        <div class="material-name-cell">${photo}<span><b>${escapeHtml(m.name)}</b><small>${escapeHtml(m.notes || 'Material de inventario')}</small></span></div>
        <span class="material-sku">${escapeHtml(sku)}</span>
        <span class="material-stock ${stateKey}"><b>${qty(m.stock)}</b><small>${escapeHtml(m.unit)}${Number(m.packageSize)>1?` · ${qty(m.packageSize)} unidades por ${escapeHtml(m.unit)}`:''}</small></span>
        <span><i class="material-status ${stateKey}">${stateLabel}</i></span>
        <span class="material-row-actions">
          <button type="button" onclick="abrirEntrada('${m.id}')" title="Registrar entrada de existencias">＋</button>
          <button type="button" onclick="editarMaterial('${m.id}')" title="Editar material">✎</button>
          <button type="button" onclick="eliminarMaterial('${m.id}')" title="Eliminar material" style="color:#dc2626">🗑</button>
        </span>
      </article>`;
    }).join('');

    const totalPages = Math.max(1, Math.ceil(total / materialPageSize));
    const rangeStart = Number(meta.offset) || 0;
    gridEl.insertAdjacentHTML('beforeend', `<footer class="inventory-pagination"><button onclick="changeMaterialPage(${materialCurrentPage-1})" ${materialCurrentPage===1?'disabled':''}>‹</button><span>${total?rangeStart+1:0}-${Math.min(rangeStart+materiales.length,total)} de ${total}</span><button onclick="changeMaterialPage(${materialCurrentPage+1})" ${materialCurrentPage>=totalPages?'disabled':''}>›</button></footer>`);
  }
}

function syncMaterialSearch(value) {
  const input = document.getElementById('material-search');
  if (input) input.value = value;
  const tableInput = document.getElementById('material-table-search');
  if (tableInput && tableInput.value !== value) tableInput.value = value;
  resetMaterialPagination();
}
