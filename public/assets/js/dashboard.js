function dashboardDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

let dashboardLoadSequence=0;
let dashboardMonthlyGoal=350;
let dashboardSelectedPeriod='week';
let dashboardSelectedDetailKind='physical';
let dashboardTechPeriod='week';
let dashboardGlobalStats={};
let dashboardTooltipBound=false;
const dashboardGlobal=typeof window!=='undefined'?window:globalThis;
dashboardGlobal.dashboardSelectedDetailKind=dashboardSelectedDetailKind;
const DASHBOARD_PHYSICAL_EXCLUDED_CATEGORIES=new Set(['instalacion','nueva_instalacion','instalacion_nueva','reubicacion_antena','reubicacion','resurtir_antena','surtir_antena','solicitud_respaldo','solicitud_de_respaldo']);
function dashboardOperationsParams(){const selected=document.getElementById('dashboard-from')?.value||dashboardDateKey();const selectedDate=new Date(`${selected}T00:00:00`);const now=new Date();const previousMonth=new Date(now.getFullYear(),now.getMonth()-1,1);const from=new Date(Math.min(selectedDate.getTime(),previousMonth.getTime()));const toKey=document.getElementById('dashboard-to')?.value||dashboardDateKey();const toDate=new Date(`${toKey}T00:00:00`);toDate.setDate(toDate.getDate()+1);const tomorrow=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);return {scoped:'1',windowed:'1',limit:100,detailKind:dashboardSelectedDetailKind||'physical',from:from.toISOString(),to:new Date(Math.max(toDate.getTime(),tomorrow.getTime())).toISOString()};}
const previousDashboardDataPartParams=dashboardGlobal.netopsGetDataPartParams;
dashboardGlobal.netopsGetDataPartParams=part=>part==='operations'?dashboardOperationsParams():part==='people'?{scoped:'1'}:previousDashboardDataPartParams?.(part);
async function loadDashboardData(shouldRender = true, initialPage = null) {
  if (typeof fetchDataPage !== 'function') {
    if (shouldRender) renderAdminDashboard();
    return;
  }
  const sequence = ++dashboardLoadSequence;
  try {
    const params = dashboardOperationsParams();
    const data = initialPage || await fetchDataPage('operations', {...params,offset:0,limit:100});
    const rows = Array.isArray(data.workOrders) ? [...data.workOrders] : [];
    const total = Number(data.total) || rows.length;
    const offsets = [];
    for (let offset = 100; offset < total; offset += 100) offsets.push(offset);
    let next = 0;
    const pages = new Array(offsets.length);
    await Promise.all(Array.from({length:Math.min(3,offsets.length)}, async () => {
      while (next < offsets.length && sequence === dashboardLoadSequence) {
        const index = next++;
        pages[index] = await fetchDataPage('operations', {...params,offset:offsets[index],limit:100});
      }
    }));
    if (sequence !== dashboardLoadSequence) return;
    for (const page of pages) rows.push(...(page?.workOrders || []));
    dashboardGlobalStats = {...(data.stats || {})};
    state.workOrders = [...new Map(rows.map(row => [row.id,row])).values()];
    if (shouldRender) renderAdminDashboard();
  } catch (error) {
    if (sequence === dashboardLoadSequence && typeof notify === 'function') {
      notify(typeof describeSyncError === 'function' ? describeSyncError(error) : String(error), 'err');
    }
  }
}

function dashboardEscape(value) {
  return typeof escapeHtml === 'function' ? escapeHtml(String(value ?? '')) : String(value ?? '').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function dashboardTime(value) {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(time) ? time : NaN;
}

function dashboardCompletionTime(detail) {
  const primary = detail?.completedAt || detail?.technicianReport?.completedAt;
  if (primary) {
    const t = dashboardTime(primary);
    if (Number.isFinite(t)) return t;
  }
  const followUps = Array.isArray(detail?.followUps) ? detail.followUps : [];
  const closeFu = [...followUps].reverse().find(f => ['completada','closure_confirmed_soporte','closure_confirmed_atencion','closure_proposed_soporte','closure_proposed_atencion','resuelto_soporte','solved','concluded'].includes(f?.action));
  if (closeFu?.at) {
    const t = dashboardTime(closeFu.at);
    if (Number.isFinite(t)) return t;
  }
  if (detail?.updatedAt && (detail?.status === 'completada' || detail?.status === 'resuelto_soporte')) {
    const t = dashboardTime(detail.updatedAt);
    if (Number.isFinite(t)) return t;
  }
  return NaN;
}

function dashboardCompletionActor(detail) {
  const report = detail?.technicianReport || {};
  let id = String(report.completedBy || report.completedById || detail?.updatedById || '').trim();
  let name = String(report.completedByName || detail?.updatedByName || detail?.lastActionBy || '').trim();

  const followUps = Array.isArray(detail?.followUps) ? detail.followUps : [];
  const closeFu = [...followUps].reverse().find(f => ['completada','closure_confirmed_soporte','closure_confirmed_atencion','closure_proposed_soporte','closure_proposed_atencion','resuelto_soporte','solved','concluded'].includes(f?.action));
  if (closeFu) {
    if (!id && closeFu.byId) id = String(closeFu.byId).trim();
    if ((!name || name === 'Sin técnico') && closeFu.byName) name = String(closeFu.byName).trim();
  }

  if (!id && detail?.updatedBy) id = String(detail.updatedBy).trim();

  if (id && (!name || name === 'Sin técnico')) {
    const u = (state.users || []).find(user => String(user.id) === id || String(user.userId) === id || String(user.username) === id);
    if (u) name = u.name || u.nombre || u.username || '';
  } else if (name && !id) {
    const norm = typeof normalizeName === 'function' ? normalizeName(name) : name.toLowerCase();
    const u = (state.users || []).find(user => (typeof normalizeName === 'function' ? normalizeName(user.name || user.username || '') : (user.name||'').toLowerCase()) === norm);
    if (u) id = String(u.id || u.username);
  }

  return { id: id || name || 'Sin técnico', name: name || 'Sin técnico' };
}

function dashboardDetailOrigin(detail) {
  if (detail?.nodeId) return 'node';
  if (detail?.equipmentId) return 'equipment';
  return 'manual';
}

function dashboardDetailZone(detail) {
  return String(detail?.region || detail?.zone || detail?.town || '').trim();
}

function dashboardCurrentTechnicianUsers() {
  const users = new Map();
  (state.users || []).filter(user => {
    const role = String(user.role || '').trim().toLowerCase();
    const status = String(user.status || 'activo').trim().toLowerCase();
    return !user.deletedAt && role === 'tecnico' && status !== 'inactivo';
  }).forEach(user => {
    const name = String(user.name || user.nombre || user.username || '').trim();
    const fingerprint = normalizeName(user.username || name);
    if (name && fingerprint && !users.has(fingerprint)) users.set(fingerprint,{...user,name});
  });
  return [...users.values()];
}

function dashboardVisibleTechnicianName(value) {
  const normalized = normalizeName(String(value || ''));
  const user = dashboardCurrentTechnicianUsers().find(item => [item.id,item.userId,item.username,item.name].map(normalizeName).includes(normalized));
  return user?.name || '';
}

function dashboardTechnicianDirectory() {
  return dashboardCurrentTechnicianUsers().map(user => {
    const source = (state.technicians || []).find(tech => !tech.deletedAt && (tech.userId === user.id || normalizeName(tech.usuario) === normalizeName(user.username) || normalizeName(tech.nombre) === normalizeName(user.name)));
    return { id:String(source?.id || user.id || user.username || user.name).trim(), userId:String(user.id || ''), username:String(user.username || ''), name:user.name, role:'tecnico' };
  });
}

function dashboardOfficeUsers() {
  const users = new Map();
  (state.users || []).filter(user => {
    const role = String(user.role || '').trim().toLowerCase();
    const status = String(user.status || 'activo').trim().toLowerCase();
    return !user.deletedAt && role !== 'tecnico' && status !== 'inactivo';
  }).forEach(user => {
    const name = String(user.name || user.nombre || user.username || '').trim();
    const fingerprint = normalizeName(user.username || name);
    if (name && fingerprint && !users.has(fingerprint)) {
      users.set(fingerprint, {
        id: String(user.id || user.userId || user.username || name).trim(),
        userId: String(user.id || ''),
        username: String(user.username || ''),
        name,
        role: String(user.role || '').trim().toLowerCase()
      });
    }
  });
  return [...users.values()];
}

function dashboardDirectoryMatchesActor(item,actor) {
  if (!item || !actor) return false;
  const actorId = normalizeName(actor.id);
  const matchesId = [item.id,item.userId,item.username].map(normalizeName).filter(Boolean).includes(actorId);
  return matchesId || item.name === dashboardVisibleTechnicianName(actor.name) || normalizeName(item.name) === normalizeName(actor.name);
}

function dashboardResolveOrderActor(detail) {
  const techDir = dashboardTechnicianDirectory();
  const officeUsers = dashboardOfficeUsers();
  const rawActor = dashboardCompletionActor(detail);
  const actorIdNorm = normalizeName(rawActor.id);
  const actorNameNorm = normalizeName(rawActor.name);

  const matchedTech = techDir.find(item => dashboardDirectoryMatchesActor(item, rawActor));
  if (matchedTech && dashboardSelectedDetailKind !== 'network') {
    return {
      type: 'tech',
      id: matchedTech.id,
      name: matchedTech.name,
      area: 'campo',
      areaLabel: 'Técnico de campo'
    };
  }

  const matchedOfficeUser = officeUsers.find(u => {
    const uId = normalizeName(u.id);
    const uUserId = normalizeName(u.userId);
    const uUser = normalizeName(u.username);
    const uName = normalizeName(u.name);
    return (actorIdNorm && [uId, uUserId, uUser].includes(actorIdNorm)) || (actorNameNorm && uName === actorNameNorm);
  });

  if (matchedOfficeUser) {
    const isAtencion = ['atencion_clientes', 'atencion'].includes(matchedOfficeUser.role);
    return {
      type: 'office',
      id: matchedOfficeUser.id,
      name: matchedOfficeUser.name,
      role: matchedOfficeUser.role,
      area: isAtencion ? 'atencion' : 'soporte',
      areaLabel: isAtencion ? 'Atención a clientes' : 'Soporte'
    };
  }

  const followUps = Array.isArray(detail?.followUps) ? detail.followUps : [];
  const closeFu = [...followUps].reverse().find(f => ['completada','closure_confirmed_soporte','closure_confirmed_atencion','closure_proposed_soporte','closure_proposed_atencion','resuelto_soporte'].includes(f?.action));
  const fuRole = String(closeFu?.byRole || closeFu?.action || '').toLowerCase();
  const targetRole = String(detail?.targetRole || detail?.assignedUserRole || '').toLowerCase();

  const isAtencion = fuRole.includes('atencion') || targetRole.includes('atencion');
  const name = closeFu?.byName || rawActor.name || (isAtencion ? 'Atención a clientes' : 'Soporte');
  const id = closeFu?.byId || rawActor.id || (isAtencion ? '__atencion__' : '__soporte__');

  return {
    type: 'office',
    id,
    name,
    role: isAtencion ? 'atencion_clientes' : 'soporte',
    area: isAtencion ? 'atencion' : 'soporte',
    areaLabel: isAtencion ? 'Atención a clientes' : 'Soporte'
  };
}

function dashboardBounds() {
  const fromKey = document.getElementById('dashboard-from')?.value || dashboardDateKey();
  const toKey = document.getElementById('dashboard-to')?.value || fromKey;
  return {fromKey,toKey,from:new Date(`${fromKey}T00:00:00`).getTime(),to:new Date(`${toKey}T23:59:59.999`).getTime()};
}

function dashboardMatchesDimensions(detail) {
  const tech = document.getElementById('dashboard-tech')?.value || '';
  const zone = document.getElementById('dashboard-zone')?.value || '';
  const origin = document.getElementById('dashboard-origin')?.value || '';

  if (tech) {
    const resolved = dashboardResolveOrderActor(detail);
    if (tech === '__soporte__') {
      if (resolved.area !== 'soporte') return false;
    } else if (tech === '__atencion__') {
      if (resolved.area !== 'atencion') return false;
    } else if (tech === '__office__') {
      if (resolved.type !== 'office') return false;
    } else {
      const techDir = dashboardTechnicianDirectory();
      const officeUsers = dashboardOfficeUsers();
      const selectedTech = techDir.find(item => item.id === tech);
      const selectedOffice = officeUsers.find(item => item.id === tech);

      if (selectedTech) {
        if (resolved.type !== 'tech' || (resolved.id !== selectedTech.id && resolved.name !== selectedTech.name)) return false;
      } else if (selectedOffice) {
        if (resolved.id !== selectedOffice.id && normalizeName(resolved.name) !== normalizeName(selectedOffice.name)) return false;
      } else {
        if (resolved.id !== tech && normalizeName(resolved.name) !== normalizeName(tech)) return false;
      }
    }
  }
  if (zone && dashboardDetailZone(detail) !== zone) return false;
  if (origin && dashboardDetailOrigin(detail) !== origin) return false;
  return true;
}

function dashboardIsResolved(detail) {
  const isNetwork = dashboardSelectedDetailKind === 'network' || String(detail?.detailKind || '') === 'network';
  if (isNetwork) {
    return ['completada','resuelto_soporte'].includes(detail?.status || '') && Number.isFinite(dashboardCompletionTime(detail));
  }
  return ['completada','no_realizado'].includes(detail?.status || '') && Number.isFinite(dashboardCompletionTime(detail));
}

function dashboardIsSolved(detail) {
  const isNetwork = dashboardSelectedDetailKind === 'network' || String(detail?.detailKind || '') === 'network';
  if (isNetwork) {
    return (detail?.status === 'completada' || detail?.status === 'resuelto_soporte') && Number.isFinite(dashboardCompletionTime(detail));
  }
  return detail?.status === 'completada' && Number.isFinite(dashboardCompletionTime(detail));
}

function dashboardMatchesDetailKind(detail) {
  if (detail?.deletedAt) return false;
  const kind = String(detail?.detailKind || (/_red$|^red_/.test(String(detail?.category || '')) ? 'network' : 'physical')).trim().toLowerCase();
  if (dashboardSelectedDetailKind === 'network') {
    return kind === 'network';
  }
  const category = String(typeof getOrderCategory === 'function' ? getOrderCategory(detail) : (detail?.category || '')).trim().toLowerCase();
  return kind !== 'network' && !DASHBOARD_PHYSICAL_EXCLUDED_CATEGORIES.has(category);
}

function dashboardIsPhysical(detail) {
  return dashboardMatchesDetailKind(detail);
}

function populateDashboardFilters() {
  const techSelect = document.getElementById('dashboard-tech');
  if (!techSelect) return;
  const currentVal = techSelect.value;
  const isNetwork = dashboardSelectedDetailKind === 'network';

  const labelEl = document.getElementById('dashboard-tech-label');
  if (labelEl) labelEl.textContent = isNetwork ? 'Personal de oficina' : 'Técnico u oficina';

  if (isNetwork) {
    const officeUsers = dashboardOfficeUsers();
    const soporteUsers = officeUsers.filter(u => ['soporte', 'administrador', 'admin', 'jefe_area'].includes(u.role));
    const atencionUsers = officeUsers.filter(u => ['atencion_clientes', 'atencion'].includes(u.role));

    let html = '<option value="">Todo el personal de oficina</option>';
    html += '<option value="__soporte__">Soporte (Área)</option>';
    html += '<option value="__atencion__">Atención a clientes (Área)</option>';
    if (soporteUsers.length) {
      html += '<optgroup label="Soporte y Administración">';
      soporteUsers.forEach(u => {
        html += `<option value="${dashboardEscape(u.id)}">${dashboardEscape(u.name)} (Soporte)</option>`;
      });
      html += '</optgroup>';
    }
    if (atencionUsers.length) {
      html += '<optgroup label="Atención a clientes">';
      atencionUsers.forEach(u => {
        html += `<option value="${dashboardEscape(u.id)}">${dashboardEscape(u.name)} (Atención)</option>`;
      });
      html += '</optgroup>';
    }
    techSelect.innerHTML = html;
  } else {
    const techs = dashboardTechnicianDirectory();
    let html = '<option value="">Todos los técnicos y oficina</option>';
    html += '<option value="__soporte__">Soporte (Oficina)</option>';
    html += '<option value="__atencion__">Atención a clientes (Oficina)</option>';
    if (techs.length) {
      html += '<optgroup label="Técnicos de campo">';
      techs.forEach(tech => {
        html += `<option value="${dashboardEscape(tech.id)}">${dashboardEscape(tech.name)}</option>`;
      });
      html += '</optgroup>';
    }
    techSelect.innerHTML = html;
  }

  if (currentVal && techSelect.querySelector(`option[value="${CSS.escape(currentVal)}"]`)) {
    techSelect.value = currentVal;
  } else {
    techSelect.value = '';
  }

  const activeDetails = (state.workOrders || []).filter(dashboardMatchesDetailKind);
  const zones = [...new Set(activeDetails.map(dashboardDetailZone).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  document.getElementById('dashboard-zone').innerHTML = '<option value="">Todas las zonas</option>' + zones.map(zone=>`<option value="${dashboardEscape(zone)}">${dashboardEscape(typeof getZoneLabel==='function' ? getZoneLabel(zone) : zone)}</option>`).join('');
}

function setDashboardValue(id,value) { const el=document.getElementById(id); if(el) el.textContent=String(value); }

function countSolvedBetween(details,from,to) {
  return details.filter(detail => dashboardIsSolved(detail) && dashboardCompletionTime(detail)>=from && dashboardCompletionTime(detail)<=to).length;
}

function initDashboardTooltips() {
  if (dashboardTooltipBound || typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;
  dashboardTooltipBound = true;
  const getTipEl = () => document.getElementById('dashboard-tooltip');

  const positionTooltip = (tip, clientX, clientY) => {
    if (!tip || !Number.isFinite(clientX) || !Number.isFinite(clientY)) return;
    const vw = typeof window !== 'undefined' ? (window.innerWidth || 1280) : 1280;
    const vh = typeof window !== 'undefined' ? (window.innerHeight || 720) : 720;
    const rect = typeof tip.getBoundingClientRect === 'function' ? tip.getBoundingClientRect() : { width: 180, height: 64 };
    const pad = 14;
    let x = clientX + 14;
    let y = clientY - rect.height - 14;
    if (x + rect.width + pad > vw) x = Math.max(pad, clientX - rect.width - 14);
    if (y < pad) y = Math.min(vh - rect.height - pad, clientY + 18);
    tip.style.left = `${Math.round(x)}px`;
    tip.style.top = `${Math.round(y)}px`;
  };

  const showFromTarget = (target, clientX, clientY) => {
    const tip = getTipEl();
    if (!tip || !target || typeof target.closest !== 'function') return;
    const host = target.closest('[data-tip-title]');
    if (!host) {
      tip.hidden = true;
      return;
    }
    const title = host.getAttribute('data-tip-title') || '';
    const rawLines = host.getAttribute('data-tip-lines') || '';
    const lines = rawLines ? rawLines.split('|').filter(Boolean) : [];
    tip.innerHTML = `<strong>${dashboardEscape(title)}</strong>${lines.map(line => `<span>${dashboardEscape(line)}</span>`).join('')}`;
    tip.hidden = false;
    positionTooltip(tip, clientX, clientY);
  };

  document.addEventListener('pointermove', event => {
    showFromTarget(event.target, event.clientX, event.clientY);
  });

  document.addEventListener('pointerover', event => {
    const target = event.target;
    if (!target || typeof target.closest !== 'function') return;
    const sliceHost = target.closest('[data-slice-idx]');
    if (sliceHost) {
      const container = sliceHost.closest('.dashboard-distribution-chart, .tech-dash-donut-wrap');
      const idx = sliceHost.getAttribute('data-slice-idx');
      if (container && typeof container.querySelectorAll === 'function') {
        container.querySelectorAll('[data-slice-idx]').forEach(node => {
          node.classList?.toggle?.('is-highlighted', node.getAttribute('data-slice-idx') === idx);
        });
      }
    }
  });

  document.addEventListener('pointerout', event => {
    const target = event.target;
    if (!target || typeof target.closest !== 'function') return;
    const host = target.closest('[data-tip-title]');
    if (host) {
      const tip = getTipEl();
      if (tip) tip.hidden = true;
    }
    const sliceHost = target.closest('[data-slice-idx]');
    if (sliceHost) {
      const container = sliceHost.closest('.dashboard-distribution-chart, .tech-dash-donut-wrap');
      if (container && typeof container.querySelectorAll === 'function') {
        container.querySelectorAll('[data-slice-idx]').forEach(node => {
          node.classList?.remove?.('is-highlighted');
        });
      }
    }
  });
}

function renderDashboardDailyChart(details,bounds) {
  const box = document.getElementById('dashboard-daily-chart');
  if (!box) return;
  const days = [];
  const cursor = new Date(`${bounds.fromKey}T12:00:00`);
  const end = new Date(`${bounds.toKey}T12:00:00`);
  while (cursor <= end && days.length < 120) { days.push(dashboardDateKey(cursor)); cursor.setDate(cursor.getDate()+1); }
  const solvedCounts = days.map(key => details.filter(detail => dashboardIsSolved(detail) && dashboardDateKey(dashboardCompletionTime(detail))===key).length);
  const createdCounts = days.map(key => details.filter(detail => Number.isFinite(dashboardTime(detail.createdAt)) && dashboardDateKey(detail.createdAt)===key).length);
  if(!days.length){box.innerHTML='<div class="analytics-empty">Sin días en el período.</div>';return;}

  const isNetwork = dashboardSelectedDetailKind === 'network';
  const accentColor = isNetwork ? '#7c3aed' : '#0874f9';
  const max = Math.max(1, ...solvedCounts, ...createdCounts);
  const stepWidth = days.length > 14 ? 46 : 74;
  const width = Math.max(540, 74 + (Math.max(1, days.length - 1) * stepWidth));
  const height = 248;
  const left = 36; const right = 20; const top = 26; const bottom = 38;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const pointX = index => days.length === 1 ? left + (chartWidth / 2) : left + (index / (days.length - 1)) * chartWidth;
  const pointY = value => top + chartHeight - ((value / max) * chartHeight);

  const solvedPoints = solvedCounts.map((value,index)=>`${pointX(index).toFixed(1)},${pointY(value).toFixed(1)}`).join(' ');
  const createdPoints = createdCounts.map((value,index)=>`${pointX(index).toFixed(1)},${pointY(value).toFixed(1)}`).join(' ');
  const firstX = pointX(0).toFixed(1);
  const lastX = pointX(days.length - 1).toFixed(1);
  const areaPoints = `${firstX},${top+chartHeight} ${solvedPoints} ${lastX},${top+chartHeight}`;

  const grid = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
    const y = top + chartHeight - (ratio * chartHeight);
    const value = Math.round(max * ratio);
    return `<line x1="${left}" y1="${y.toFixed(1)}" x2="${width-right}" y2="${y.toFixed(1)}" class="dashboard-line-grid"/><text x="${left-9}" y="${(y+3.5).toFixed(1)}" class="dashboard-line-axis" text-anchor="end">${value}</text>`;
  }).join('');

  const labelStep = days.length > 18 ? Math.ceil(days.length / 10) : (days.length > 10 ? 2 : 1);
  const nodes = days.map((key, index) => {
    const date = new Date(`${key}T12:00:00`);
    const label = date.toLocaleDateString('es-MX',{day:'numeric',month:'short'});
    const x = pointX(index);
    const ys = pointY(solvedCounts[index]);
    const yc = pointY(createdCounts[index]);
    const showXLabel = index === 0 || index === days.length - 1 || index % labelStep === 0;
    const tipLines = `Solucionados: ${solvedCounts[index]}|Creados: ${createdCounts[index]}`;
    return `<g class="dashboard-line-node" data-tip-title="${dashboardEscape(label)}" data-tip-lines="${dashboardEscape(tipLines)}">` +
      `<line x1="${x.toFixed(1)}" y1="${top}" x2="${x.toFixed(1)}" y2="${top+chartHeight}" class="dashboard-line-guide"/>` +
      `<circle cx="${x.toFixed(1)}" cy="${yc.toFixed(1)}" r="3.2" class="dashboard-created-dot"/>` +
      `<circle cx="${x.toFixed(1)}" cy="${ys.toFixed(1)}" r="5" class="dashboard-solved-dot"><title>${dashboardEscape(label)}: ${solvedCounts[index]} solucionados · ${createdCounts[index]} creados</title></circle>` +
      `<circle cx="${x.toFixed(1)}" cy="${ys.toFixed(1)}" r="15" class="dashboard-hit-area"/>` +
      `${solvedCounts[index] > 0 || days.length <= 10 ? `<text x="${x.toFixed(1)}" y="${Math.max(14, ys - 10).toFixed(1)}" class="dashboard-line-value" text-anchor="middle">${solvedCounts[index]}</text>` : ''}` +
      `${showXLabel ? `<text x="${x.toFixed(1)}" y="${height - 13}" class="dashboard-line-label" text-anchor="middle">${dashboardEscape(label)}</text>` : ''}` +
      `</g>`;
  }).join('');

  box.innerHTML = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Tendencia de solucionados y creados por día">` +
    `<defs><linearGradient id="dashboard-line-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${accentColor}" stop-opacity=".22"/><stop offset="1" stop-color="${accentColor}" stop-opacity="0"/></linearGradient></defs>` +
    `${grid}<polygon points="${areaPoints}" class="dashboard-line-area"/>` +
    `<polyline points="${createdPoints}" class="dashboard-line-created"/>` +
    `<polyline points="${solvedPoints}" class="dashboard-line-path" style="stroke:${accentColor}"/>${nodes}</svg>`;

  const totalPeriodSolved = solvedCounts.reduce((a,b)=>a+b,0);
  const totalPeriodCreated = createdCounts.reduce((a,b)=>a+b,0);
  setDashboardValue('dashboard-daily-caption',`${days.length} día${days.length===1?'':'s'} · ${totalPeriodSolved} solucionados / ${totalPeriodCreated} creados`);
}

function dashboardWeekStart(value) {
  const date = new Date(value); date.setHours(0,0,0,0);
  const day = date.getDay() || 7; date.setDate(date.getDate()-day+1);
  return date;
}

function renderDashboardTechTable(details,bounds) {
  const isNetwork = dashboardSelectedDetailKind === 'network';
  const directory = dashboardTechnicianDirectory();
  const officeUsers = dashboardOfficeUsers();
  const selectedTech = document.getElementById('dashboard-tech')?.value || '';

  const groups = new Map();

  if (isNetwork) {
    let visibleOffice = officeUsers;
    if (selectedTech === '__soporte__') {
      visibleOffice = officeUsers.filter(u => ['soporte', 'administrador', 'admin', 'jefe_area'].includes(u.role));
    } else if (selectedTech === '__atencion__') {
      visibleOffice = officeUsers.filter(u => ['atencion_clientes', 'atencion'].includes(u.role));
    } else if (selectedTech && selectedTech !== '__office__') {
      visibleOffice = officeUsers.filter(u => u.id === selectedTech || normalizeName(u.name) === normalizeName(selectedTech));
    }

    visibleOffice.forEach(user => {
      const isAtencion = ['atencion_clientes', 'atencion'].includes(user.role);
      groups.set(user.name, {
        name: user.name,
        area: isAtencion ? 'Atención' : 'Soporte',
        solved: 0,
        office: true,
        officeType: isAtencion ? 'atencion' : 'soporte'
      });
    });

    details.filter(detail => dashboardIsSolved(detail) && dashboardCompletionTime(detail) >= bounds.from && dashboardCompletionTime(detail) <= bounds.to).forEach(detail => {
      const resolved = dashboardResolveOrderActor(detail);
      const groupName = resolved.name || (resolved.area === 'atencion' ? 'Atención a clientes' : 'Soporte');
      if (!groups.has(groupName)) {
        groups.set(groupName, {
          name: groupName,
          area: resolved.area === 'atencion' ? 'Atención' : 'Soporte',
          solved: 0,
          office: true,
          officeType: resolved.area === 'atencion' ? 'atencion' : 'soporte'
        });
      }
      groups.get(groupName).solved++;
    });
  } else {
    const visibleTechs = selectedTech && !selectedTech.startsWith('__') ? directory.filter(tech => tech.id === selectedTech) : directory;
    visibleTechs.forEach(tech => {
      groups.set(tech.name, { name: tech.name, area: 'Campo', solved: 0, office: false });
    });

    const includeSoporte = !selectedTech || selectedTech === '__office__' || selectedTech === '__soporte__';
    const includeAtencion = !selectedTech || selectedTech === '__office__' || selectedTech === '__atencion__';

    if (includeSoporte) {
      groups.set('Soporte (Oficina)', { name: 'Soporte (Oficina)', area: 'Oficina', solved: 0, office: true, officeType: 'soporte' });
    }
    if (includeAtencion) {
      groups.set('Atención a clientes (Oficina)', { name: 'Atención a clientes (Oficina)', area: 'Oficina', solved: 0, office: true, officeType: 'atencion' });
    }

    details.filter(detail => dashboardIsSolved(detail) && dashboardCompletionTime(detail) >= bounds.from && dashboardCompletionTime(detail) <= bounds.to).forEach(detail => {
      const resolved = dashboardResolveOrderActor(detail);
      if (resolved.type === 'tech') {
        if (groups.has(resolved.name)) groups.get(resolved.name).solved++;
      } else {
        const officeKey = resolved.area === 'atencion' ? 'Atención a clientes (Oficina)' : 'Soporte (Oficina)';
        if (groups.has(officeKey)) groups.get(officeKey).solved++;
      }
    });
  }

  let rows = [...groups.values()].filter(row => row.solved > 0);
  if (!rows.length) {
    rows = [...groups.values()].slice(0, 6);
  } else {
    rows.sort((a,b) => b.solved - a.solved || Number(b.office) - Number(a.office) || a.name.localeCompare(b.name));
    rows = rows.slice(0, 8);
  }

  const total = rows.reduce((sum, row) => sum + row.solved, 0);
  const maxRow = Math.max(1, ...rows.map(row => row.solved));
  const colors = ['#0874f9','#10b981','#8b5cf6','#f59e0b','#06b6d4','#ec4899','#64748b','#6366f1'];

  rows.forEach((row, index) => {
    if (row.officeType === 'soporte') {
      row.color = '#f59e0b';
    } else if (row.officeType === 'atencion') {
      row.color = '#06b6d4';
    } else {
      row.color = colors[index % colors.length];
    }
  });

  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const svgSlices = total > 0 ? rows.map((row, idx) => {
    if (!row.solved) return '';
    const share = row.solved / total;
    const pct = Math.round(share * 100);
    const dashLen = share * circumference;
    const dashOffset = -offset;
    offset += dashLen;
    const tipLines = `${row.solved} solucionado${row.solved===1?'':'s'}|${pct}% del período`;
    return `<circle class="dashboard-donut-arc" data-slice-idx="${idx}" data-tip-title="${dashboardEscape(row.name)}" data-tip-lines="${dashboardEscape(tipLines)}" cx="76" cy="76" r="${radius}" stroke="${row.color}" stroke-dasharray="${Math.max(1, dashLen - 1.5).toFixed(2)} ${circumference.toFixed(2)}" stroke-dashoffset="${dashOffset.toFixed(2)}"><title>${dashboardEscape(row.name)}: ${row.solved} (${pct}%)</title></circle>`;
  }).join('') : `<circle class="dashboard-donut-empty" cx="76" cy="76" r="${radius}"/>`;

  const box = document.getElementById('dashboard-tech-table');
  if (!box) return;

  const emptyMsg = total === 0 ? '<div class="analytics-empty dashboard-mini-empty">Sin soluciones en este período.</div>' : '';

  box.innerHTML = `<div class="dashboard-distribution-chart">` +
    `<div class="dashboard-distribution-donut">` +
      `<svg class="dashboard-donut-svg" viewBox="0 0 152 152" role="img" aria-label="Distribución de soluciones">${svgSlices}</svg>` +
      `<div class="dashboard-donut-center"><strong>${total}</strong><span>Solucionados</span></div>` +
    `</div>` +
    `<div class="dashboard-distribution-legend">` +
      rows.map((row, idx) => {
        const pct = total ? Math.round((row.solved / total) * 100) : 0;
        const barW = total ? Math.max(4, Math.round((row.solved / maxRow) * 100)) : 0;
        const tipLines = `${row.solved} solucionado${row.solved===1?'':'s'}|${pct}% del período`;
        return `<div class="dashboard-dist-item" data-slice-idx="${idx}" data-tip-title="${dashboardEscape(row.name)}" data-tip-lines="${dashboardEscape(tipLines)}">` +
          `<div class="dashboard-dist-top">` +
            `<i style="background:${row.color}"></i>` +
            `<span title="${dashboardEscape(row.name)}">${dashboardEscape(row.name)}${isNetwork && row.area ? ` <small>(${dashboardEscape(row.area)})</small>` : ''}</span>` +
            `<strong>${row.solved}</strong>` +
            `<em>${pct}%</em>` +
          `</div>` +
          `<div class="dashboard-dist-bar"><b style="width:${barW}%;background:${row.color}"></b></div>` +
        `</div>`;
      }).join('') +
    `</div>` +
  `</div>${emptyMsg}`;
}

function renderDashboardWeeklyChart(details) {
  const box = document.getElementById('dashboard-weekly-chart');
  if (!box) return;

  const isNetwork = dashboardSelectedDetailKind === 'network';
  const solvedColor = isNetwork ? '#7c3aed' : '#0874f9';
  const createdColor = isNetwork ? '#c4b5fd' : '#93c5fd';
  const currentWeekStart = dashboardWeekStart(new Date());
  const weeks = [];

  for (let i = 3; i >= 0; i--) {
    const start = new Date(currentWeekStart);
    start.setDate(start.getDate() - (i * 7));
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    const fromMs = start.getTime();
    const toMs = end.getTime();
    const created = details.filter(item => {
      const t = dashboardTime(item.createdAt);
      return Number.isFinite(t) && t >= fromMs && t <= toMs;
    }).length;
    const solved = countSolvedBetween(details, fromMs, toMs);
    const shortLabel = i === 0 ? 'Esta sem.' : (i === 1 ? 'Sem. ant.' : `${start.toLocaleDateString('es-MX',{day:'numeric',month:'short'})}`);
    const rangeLabel = `${start.toLocaleDateString('es-MX',{day:'numeric',month:'short'})} – ${end.toLocaleDateString('es-MX',{day:'numeric',month:'short'})}`;
    weeks.push({ shortLabel, rangeLabel, created, solved });
  }

  const max = Math.max(1, ...weeks.map(w => Math.max(w.created, w.solved)));
  const width = 520;
  const height = 228;
  const left = 36; const right = 18; const top = 26; const bottom = 38;
  const chartW = width - left - right;
  const chartH = height - top - bottom;
  const groupW = chartW / weeks.length;
  const barW = Math.min(28, groupW * 0.27);
  const gap = 8;

  const grid = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
    const y = top + chartH - (ratio * chartH);
    const val = Math.round(max * ratio);
    return `<line x1="${left}" y1="${y.toFixed(1)}" x2="${width - right}" y2="${y.toFixed(1)}" class="dashboard-line-grid"/><text x="${left - 8}" y="${(y + 3.5).toFixed(1)}" class="dashboard-line-axis" text-anchor="end">${val}</text>`;
  }).join('');

  const bars = weeks.map((week, idx) => {
    const cx = left + (idx * groupW) + (groupW / 2);
    const x1 = cx - barW - (gap / 2);
    const x2 = cx + (gap / 2);
    const h1 = (week.created / max) * chartH;
    const h2 = (week.solved / max) * chartH;
    const y1 = top + chartH - h1;
    const y2 = top + chartH - h2;
    const eff = week.created ? Math.round((week.solved / week.created) * 100) : (week.solved ? 100 : 0);
    const tipLines = `Creados: ${week.created}|Solucionados: ${week.solved}|Balance: ${eff}%`;
    return `<g class="dashboard-week-group" data-tip-title="${dashboardEscape(week.rangeLabel)}" data-tip-lines="${dashboardEscape(tipLines)}">` +
      `<rect x="${(cx - groupW * 0.42).toFixed(1)}" y="${top}" width="${(groupW * 0.84).toFixed(1)}" height="${chartH}" rx="8" class="dashboard-week-hover-bg"/>` +
      `<rect x="${x1.toFixed(1)}" y="${y1.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(2, h1).toFixed(1)}" rx="5" fill="${createdColor}" class="dashboard-bar-rect"><title>${dashboardEscape(week.rangeLabel)} · Creados: ${week.created}</title></rect>` +
      `<text x="${(x1 + barW / 2).toFixed(1)}" y="${Math.max(14, y1 - 6).toFixed(1)}" class="dashboard-bar-val is-muted" text-anchor="middle">${week.created}</text>` +
      `<rect x="${x2.toFixed(1)}" y="${y2.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(2, h2).toFixed(1)}" rx="5" fill="${solvedColor}" class="dashboard-bar-rect"><title>${dashboardEscape(week.rangeLabel)} · Solucionados: ${week.solved}</title></rect>` +
      `<text x="${(x2 + barW / 2).toFixed(1)}" y="${Math.max(14, y2 - 6).toFixed(1)}" class="dashboard-bar-val" text-anchor="middle">${week.solved}</text>` +
      `<text x="${cx.toFixed(1)}" y="${height - 12}" class="dashboard-line-label" text-anchor="middle">${dashboardEscape(week.shortLabel)}</text>` +
    `</g>`;
  }).join('');

  box.innerHTML = `<svg viewBox="0 0 ${width} ${height}" class="dashboard-weekly-svg" role="img" aria-label="Comparativa semanal de creados y solucionados">${grid}${bars}</svg>`;
}

function renderDashboardStatusAndZonesChart(details, bounds) {
  const box = document.getElementById('dashboard-status-chart');
  if (!box) return;

  const periodItems = details.filter(item => {
    const ct = dashboardTime(item.createdAt);
    const ft = dashboardCompletionTime(item);
    const inCreated = Number.isFinite(ct) && ct >= bounds.from && ct <= bounds.to;
    const inCompleted = Number.isFinite(ft) && ft >= bounds.from && ft <= bounds.to;
    return inCreated || inCompleted;
  });
  const source = periodItems.length ? periodItems : details;

  let solved = 0;
  let pending = 0;
  let notDone = 0;
  source.forEach(item => {
    if (dashboardIsSolved(item)) solved++;
    else if (item?.status === 'no_realizado') notDone++;
    else pending++;
  });

  const total = Math.max(1, solved + pending + notDone);
  const solvedPct = Math.round((solved / total) * 100);
  const pendingPct = Math.round((pending / total) * 100);
  const notDonePct = Math.max(0, 100 - solvedPct - pendingPct);

  const zonesMap = new Map();
  source.forEach(item => {
    const rawZone = dashboardDetailZone(item);
    const label = rawZone
      ? (typeof getZoneLabel === 'function' ? getZoneLabel(rawZone) : rawZone)
      : ({ equipment: 'Antenas', node: 'Pueblos', manual: 'Generales' }[dashboardDetailOrigin(item)] || 'General');
    const entry = zonesMap.get(label) || { name: label, total: 0, solved: 0 };
    entry.total++;
    if (dashboardIsSolved(item)) entry.solved++;
    zonesMap.set(label, entry);
  });

  const topZones = [...zonesMap.values()].sort((a,b) => b.total - a.total || a.name.localeCompare(b.name)).slice(0, 5);
  const maxZone = Math.max(1, ...topZones.map(z => z.total));
  const isNetwork = dashboardSelectedDetailKind === 'network';
  const barColor = isNetwork ? '#7c3aed' : '#0874f9';

  const segments = [
    { key: 'solved', label: 'Completados', count: solved, pct: solvedPct, color: '#10b981' },
    { key: 'pending', label: 'Pendientes', count: pending, pct: pendingPct, color: '#f59e0b' },
    { key: 'notdone', label: 'No realizados', count: notDone, pct: notDonePct, color: '#ef4444' }
  ];

  box.innerHTML = `<div class="dashboard-status-block">` +
    `<div class="dashboard-seg-bar" role="img" aria-label="Proporción de estatus">` +
      segments.filter(s => s.count > 0).map(s => `<span style="width:${Math.max(4, s.pct)}%;background:${s.color}" data-tip-title="${dashboardEscape(s.label)}" data-tip-lines="${s.count} registro${s.count===1?'':'s'}|${s.pct}% del total"></span>`).join('') +
    `</div>` +
    `<div class="dashboard-seg-pills">` +
      segments.map(s => `<div class="dashboard-seg-pill" data-tip-title="${dashboardEscape(s.label)}" data-tip-lines="${s.count} registro${s.count===1?'':'s'}|${s.pct}%"><i style="background:${s.color}"></i><span>${dashboardEscape(s.label)}</span><strong>${s.count}</strong><em>${s.pct}%</em></div>`).join('') +
    `</div>` +
  `</div>` +
  `<div class="dashboard-zones-block">` +
    `<div class="dashboard-subchart-title">Top zonas con actividad</div>` +
    (topZones.length
      ? topZones.map(z => {
          const w = Math.max(6, Math.round((z.total / maxZone) * 100));
          const sw = z.total ? Math.round((z.solved / z.total) * 100) : 0;
          const tipLines = `Total: ${z.total}|Solucionados: ${z.solved} (${sw}%)`;
          return `<div class="dashboard-zone-row" data-tip-title="${dashboardEscape(z.name)}" data-tip-lines="${dashboardEscape(tipLines)}">` +
            `<span class="dashboard-zone-name" title="${dashboardEscape(z.name)}">${dashboardEscape(z.name)}</span>` +
            `<div class="dashboard-zone-track"><b style="width:${w}%;background:${barColor}"></b></div>` +
            `<strong class="dashboard-zone-val">${z.total}</strong>` +
          `</div>`;
        }).join('')
      : '<div class="analytics-empty dashboard-mini-empty">Sin datos de zonas en este período.</div>') +
  `</div>`;

  setDashboardValue('dashboard-status-caption', `${source.length} registro${source.length===1?'':'s'} en análisis`);
}

function renderDashboardCompliance(solved,total,rate) {
  setDashboardValue('dashboard-compliance-value',`${rate}%`);
  setDashboardValue('dashboard-compliance-count',`${solved} / ${total}`);
  setDashboardValue('dashboard-ring-goal',`Meta: ${total}`);
  const clamped = Math.min(100, Math.max(0, rate));
  const ring = document.getElementById('dashboard-compliance-ring');
  if (ring) {
    ring.style.setProperty('--rate',`${clamped * 3.6}deg`);
    ring.classList?.toggle?.('is-achieved', rate >= 100);
  }
  const arc = document.getElementById('dashboard-compliance-arc');
  if (arc && typeof arc.setAttribute === 'function') {
    const circ = 2 * Math.PI * 76;
    const offset = circ * (1 - (clamped / 100));
    arc.setAttribute('stroke-dasharray', circ.toFixed(2));
    arc.setAttribute('stroke-dashoffset', offset.toFixed(2));
  }
}

function dashboardGoalForPeriod(bounds) {
  const monthly=Math.max(1,Math.round(Number(dashboardMonthlyGoal)||350));
  if(dashboardSelectedPeriod==='month') return monthly;
  if(dashboardSelectedPeriod==='fortnight') return Math.ceil(monthly/2);
  if(dashboardSelectedPeriod==='week') return Math.ceil(monthly/4);
  if(dashboardSelectedPeriod==='day') {
    const date=new Date(`${bounds.toKey}T12:00:00`);
    return Math.ceil(monthly/new Date(date.getFullYear(),date.getMonth()+1,0).getDate());
  }
  const days=Math.max(1,Math.round((bounds.to-bounds.from+1)/86400000));
  const date=new Date(`${bounds.toKey}T12:00:00`);
  return Math.ceil(monthly*days/new Date(date.getFullYear(),date.getMonth()+1,0).getDate());
}

function dashboardGoalLabel() {
  return ({day:'diaria',week:'semanal',fortnight:'quincenal',month:'mensual'})[dashboardSelectedPeriod]||'del período';
}

async function loadDashboardGoal() {
  try {
    const response=await fetch(`${API}/api/dashboard-goal?t=${Date.now()}`,{cache:'no-store',headers:{'Cache-Control':'no-cache'}});
    const body=await response.json().catch(()=>({}));
    if(!response.ok||body.ok!==true) throw new Error(body.error||'No se pudo cargar la meta mensual');
    dashboardMonthlyGoal=Math.max(1,Math.round(Number(body.monthlyGoal)||350));
    const input=document.getElementById('dashboard-monthly-goal');
    if(input) input.value=String(dashboardMonthlyGoal);
  } catch(error) {
    if(typeof notify==='function') notify(String(error?.message||error),'err');
  }
}

async function saveDashboardGoal() {
  const input=document.getElementById('dashboard-monthly-goal');
  const button=document.getElementById('dashboard-save-goal');
  const monthlyGoal=Number(input?.value);
  if(!Number.isInteger(monthlyGoal)||monthlyGoal<1||monthlyGoal>100000){if(typeof notify==='function')notify('Escribe una meta mensual válida entre 1 y 100000.','warn');return;}
  if(button) button.disabled=true;
  try {
    const response=await fetch(`${API}/api/dashboard-goal`,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({monthlyGoal})});
    const body=await response.json().catch(()=>({}));
    if(!response.ok||body.ok!==true) throw new Error(body.error||'No se pudo guardar la meta mensual');
    dashboardMonthlyGoal=body.monthlyGoal;
    renderAdminDashboard();
    if(typeof notify==='function')notify(`Meta mensual guardada: ${dashboardMonthlyGoal}.`,'ok');
  } catch(error) {
    if(typeof notify==='function') notify(String(error?.message||error),'err');
  } finally { if(button) button.disabled=false; }
}

function renderDashboardTrend(id,current,previous,label) {
  const element=document.getElementById(id);
  if(!element) return;
  const percent=previous ? Math.round(((current-previous)/previous)*100) : (current ? 100 : 0);
  element.classList.toggle('positive',percent>0);
  element.classList.toggle('negative',percent<0);
  element.textContent=`${percent>0?'↑ ':percent<0?'↓ ':''}${Math.abs(percent)}% vs. ${label}`;
}

function updateDashboardKindModeUI(kind) {
  const isNetwork = kind === 'network';
  const modePill = document.getElementById('dashboard-mode-pill');
  const modeText = document.getElementById('dashboard-mode-text');
  if (modePill) {
    modePill.classList?.toggle?.('is-network', isNetwork);
    modePill.classList?.toggle?.('is-physical', !isNetwork);
    modePill.setAttribute?.('data-mode', kind);
  }
  if (modeText) {
    modeText.textContent = isNetwork ? 'Detalles de Red' : 'Detalles Físicos';
  }
  if (typeof document !== 'undefined') {
    if (typeof document.querySelector === 'function') {
      document.querySelector('.dashboard-shell')?.classList?.toggle?.('is-network-mode', isNetwork);
    }
    document.body?.classList?.toggle?.('dashboard-network-mode', isNetwork);
  }
}

function setDashboardDetailKind(kind, force = false) {
  if (kind !== 'network' && kind !== 'physical') kind = 'physical';
  if (dashboardSelectedDetailKind === kind && !force) {
    document.getElementById('dashboard-tab-physical')?.classList?.toggle?.('is-active', kind === 'physical');
    document.getElementById('dashboard-tab-network')?.classList?.toggle?.('is-active', kind === 'network');
    document.getElementById('dashboard-tab-physical')?.setAttribute?.('aria-selected', String(kind === 'physical'));
    document.getElementById('dashboard-tab-network')?.setAttribute?.('aria-selected', String(kind === 'network'));
    updateDashboardKindModeUI(kind);
    return;
  }
  dashboardSelectedDetailKind = kind;
  dashboardGlobal.dashboardSelectedDetailKind = kind;

  document.getElementById('dashboard-tab-physical')?.classList?.toggle?.('is-active', kind === 'physical');
  document.getElementById('dashboard-tab-network')?.classList?.toggle?.('is-active', kind === 'network');
  document.getElementById('dashboard-tab-physical')?.setAttribute?.('aria-selected', String(kind === 'physical'));
  document.getElementById('dashboard-tab-network')?.setAttribute?.('aria-selected', String(kind === 'network'));
  updateDashboardKindModeUI(kind);

  try {
    const url = new URL(window.location.href);
    url.searchParams.set('detailKind', kind);
    window.history.replaceState({}, '', url.toString());
  } catch (_) {}

  const isNetwork = kind === 'network';
  setDashboardValue('dashboard-heading-desc', isNetwork
    ? 'Resumen ejecutivo · Oficina y NOC'
    : 'Resumen ejecutivo · Campo y soporte');
  setDashboardValue('dashboard-total-label', isNetwork ? 'Detalles de red totales' : 'Detalles físicos totales');
  setDashboardValue('dashboard-pending-label', isNetwork ? 'Pendientes de red actuales' : 'Pendientes físicos actuales');
  setDashboardValue('dashboard-tech-label', isNetwork ? 'Personal de oficina' : 'Técnico u oficina');
  setDashboardValue('dashboard-distribution-title', isNetwork ? 'Distribución de oficina (Red)' : 'Distribución de soluciones');

  populateDashboardFilters();
  void loadDashboardData();
}

function renderAdminDashboard() {
  initDashboardTooltips();
  const bounds=dashboardBounds();
  const activeDetails=(state.workOrders||[]).filter(dashboardMatchesDetailKind);
  const details=activeDetails.filter(dashboardMatchesDimensions);
  const now=new Date(); const todayStart=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime(); const todayEnd=todayStart+86400000-1;
  const weekStart=dashboardWeekStart(now).getTime(); const monthStart=new Date(now.getFullYear(),now.getMonth(),1).getTime();
  const todayCount=countSolvedBetween(details,todayStart,todayEnd);
  const weekCount=countSolvedBetween(details,weekStart,todayEnd);
  const monthCount=countSolvedBetween(details,monthStart,todayEnd);
  const todayAdded=details.filter(item=>{const time=dashboardTime(item.createdAt);return Number.isFinite(time)&&time>=todayStart&&time<=todayEnd;}).length;
  const monthAdded=details.filter(item=>{const time=dashboardTime(item.createdAt);return Number.isFinite(time)&&time>=monthStart&&time<=todayEnd;}).length;
  const statTotal=Number(dashboardGlobalStats.total); const statPending=Number(dashboardGlobalStats.pending); const statDone=Number(dashboardGlobalStats.done);
  const totalDetails=Number.isFinite(statTotal)?statTotal:activeDetails.length;
  const pendingCount=Number.isFinite(statPending)?statPending:activeDetails.filter(item=>!dashboardIsResolved(item)).length;
  const totalSolved=Number.isFinite(statDone)?statDone:activeDetails.filter(dashboardIsSolved).length;
  const previousWeekEnd=weekStart-1; const previousWeekStart=previousWeekEnd-(7*86400000)+1;
  const previousMonthStart=new Date(now.getFullYear(),now.getMonth()-1,1).getTime(); const previousMonthEnd=monthStart-1;
  setDashboardValue('dashboard-done-today',todayCount);
  setDashboardValue('dashboard-done-week',weekCount);
  setDashboardValue('dashboard-done-month',monthCount);
  renderDashboardTrend('dashboard-week-trend',weekCount,countSolvedBetween(details,previousWeekStart,previousWeekEnd),'sem. ant.');
  renderDashboardTrend('dashboard-month-trend',monthCount,countSolvedBetween(details,previousMonthStart,previousMonthEnd),'mes ant.');
  setDashboardValue('dashboard-total-details',totalDetails);
  const periodSolved=details.filter(item=>dashboardIsSolved(item)&&dashboardCompletionTime(item)>=bounds.from&&dashboardCompletionTime(item)<=bounds.to);
  const periodGoal=dashboardGoalForPeriod(bounds);
  const rate=Math.round((periodSolved.length/periodGoal)*100);
  setDashboardValue('dashboard-period-added',todayAdded); setDashboardValue('dashboard-period-solved',monthAdded); setDashboardValue('dashboard-period-pending',pendingCount); setDashboardValue('dashboard-period-rate',totalSolved);
  setDashboardValue('dashboard-period-goal-label','Histórico');
  setDashboardValue('dashboard-compliance-goal-label',`Meta ${dashboardGoalLabel()}`);
  setDashboardValue('dashboard-goal-guidance',`Mensual: ${dashboardMonthlyGoal} · Faltan ${Math.max(0,dashboardMonthlyGoal-monthCount)}`);
  setDashboardValue('dashboard-updated-at',new Date().toLocaleString('es-MX',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}));

  const isNetwork = dashboardSelectedDetailKind === 'network';
  setDashboardValue('dashboard-heading-desc', isNetwork
    ? 'Resumen ejecutivo · Oficina y NOC'
    : 'Resumen ejecutivo · Campo y soporte');
  setDashboardValue('dashboard-total-label', isNetwork ? 'Detalles de red totales' : 'Detalles físicos totales');
  setDashboardValue('dashboard-pending-label', isNetwork ? 'Pendientes de red actuales' : 'Pendientes físicos actuales');
  setDashboardValue('dashboard-tech-label', isNetwork ? 'Personal de oficina' : 'Técnico u oficina');
  setDashboardValue('dashboard-distribution-title', isNetwork ? 'Distribución de oficina (Red)' : 'Distribución de soluciones');

  renderDashboardDailyChart(details,bounds);
  renderDashboardCompliance(periodSolved.length,periodGoal,rate);
  renderDashboardTechTable(details,bounds);
  renderDashboardWeeklyChart(details);
  renderDashboardStatusAndZonesChart(details,bounds);
}

function isTechnicianDashboardView() {
  const search = typeof window !== 'undefined' && window.location ? String(window.location.search || '') : '';
  if (typeof URLSearchParams !== 'undefined' && search) {
    const view = new URLSearchParams(search).get('view');
    if (view === 'tecnico') return true;
    if (view === 'admin') return false;
  }
  const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const rawRole = typeof normalizeRole === 'function'
    ? normalizeRole(currentUser?.role || '')
    : String(currentUser?.role || '').trim().toLowerCase();
  if (rawRole === 'tecnico') return true;
  if (['administrador', 'admin', 'soporte', 'atencion_clientes', 'atencion'].includes(rawRole)) return false;
  const isAdminLike = typeof userHasRole === 'function' && userHasRole('administrador', 'admin', 'soporte', 'atencion_clientes');
  const isTech = typeof userHasRole === 'function' && userHasRole('tecnico');
  return Boolean(isTech && !isAdminLike);
}

function dashboardCurrentTechAliases() {
  const norm = v => (typeof normalizeName === 'function' ? normalizeName(v) : String(v || '').trim().toLowerCase());
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
  const aliases = new Set([user?.id, user?.userId, user?.username, user?.usuario, user?.name, user?.nombre].map(norm).filter(Boolean));
  const tech = (state.technicians || []).find(t => !t.deletedAt && (
    (user?.id && (String(t.userId || '') === String(user.id) || String(t.id || '') === String(user.id))) ||
    (user?.username && (norm(t.usuario) === norm(user.username) || norm(t.nombre) === norm(user.username))) ||
    (user?.name && norm(t.nombre) === norm(user.name))
  ));
  if (tech) {
    [tech.id, tech.userId, tech.usuario, tech.username, tech.nombre, tech.name].map(norm).filter(Boolean).forEach(a => aliases.add(a));
  }
  return aliases;
}

function dashboardOrderBelongsToCurrentTech(order, aliases) {
  if (!order || order.deletedAt) return false;
  if (String(order.detailKind || '').toLowerCase() === 'network') return false;
  const norm = v => (typeof normalizeName === 'function' ? normalizeName(v) : String(v || '').trim().toLowerCase());
  const report = order.technicianReport || {};
  const candidates = [
    order.assignedTechId, order.technicianId, order.assignedUserId, order.assignedUserName,
    order.assignedTechName, order.technicianName,
    report.completedBy, report.completedById, report.completedByName,
    order.updatedById, order.updatedByName
  ].map(norm).filter(Boolean);
  return candidates.some(c => aliases.has(c));
}

function setTechDashboardPeriod(period) {
  dashboardTechPeriod = ['day', 'week', 'month'].includes(period) ? period : 'week';
  if (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function') {
    document.querySelectorAll('[data-tech-period]').forEach(btn => {
      btn.classList?.toggle?.('is-active', btn.getAttribute('data-tech-period') === dashboardTechPeriod);
    });
  }
  renderTechnicianDashboard();
}

function renderTechnicianDashboard() {
  initDashboardTooltips();
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : {};
  const displayName = String(user?.name || user?.nombre || user?.username || 'Mi avance').trim();
  setDashboardValue('tech-dash-name', displayName || 'Mi avance');

  const aliases = dashboardCurrentTechAliases();
  const myOrders = (state.workOrders || []).filter(order => dashboardOrderBelongsToCurrentTech(order, aliases));

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = todayStart + 86400000 - 1;
  let fromMs = todayStart;
  if (dashboardTechPeriod === 'week') fromMs = dashboardWeekStart(now).getTime();
  if (dashboardTechPeriod === 'month') fromMs = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const completed = myOrders.filter(o => o.status === 'completada' && Number.isFinite(dashboardCompletionTime(o)) && dashboardCompletionTime(o) >= fromMs && dashboardCompletionTime(o) <= todayEnd).length;
  const notDone = myOrders.filter(o => o.status === 'no_realizado' && Number.isFinite(dashboardCompletionTime(o) || dashboardTime(o.updatedAt)) && (dashboardCompletionTime(o) || dashboardTime(o.updatedAt)) >= fromMs && (dashboardCompletionTime(o) || dashboardTime(o.updatedAt)) <= todayEnd).length;
  const pending = myOrders.filter(o => !['completada', 'no_realizado', 'resuelto_soporte'].includes(String(o.status || ''))).length;

  const total = completed + pending + notDone;
  const progress = total ? Math.round((completed / total) * 100) : 0;

  setDashboardValue('tech-kpi-completed', completed);
  setDashboardValue('tech-kpi-pending', pending);
  setDashboardValue('tech-kpi-notdone', notDone);
  setDashboardValue('tech-kpi-progress', `${progress}%`);
  setDashboardValue('tech-dash-ratio-caption', `${completed} de ${total} trabajo${total===1?'':'s'}`);

  const donutBox = document.getElementById('tech-dash-donut');
  if (donutBox) {
    const segs = [
      { label: 'Completados', count: completed, color: '#10b981' },
      { label: 'Pendientes', count: pending, color: '#f59e0b' },
      { label: 'No realizados', count: notDone, color: '#ef4444' }
    ];
    const r = 58;
    const circ = 2 * Math.PI * r;
    let off = 0;
    const arcs = total > 0 ? segs.map((s, idx) => {
      if (!s.count) return '';
      const len = (s.count / total) * circ;
      const pct = Math.round((s.count / total) * 100);
      const out = `<circle class="dashboard-donut-arc" data-slice-idx="${idx}" data-tip-title="${dashboardEscape(s.label)}" data-tip-lines="${s.count} trabajo${s.count===1?'':'s'}|${pct}%" cx="76" cy="76" r="${r}" stroke="${s.color}" stroke-dasharray="${Math.max(1, len - 1.5).toFixed(2)} ${circ.toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"/>`;
      off += len;
      return out;
    }).join('') : `<circle class="dashboard-donut-empty" cx="76" cy="76" r="${r}"/>`;

    donutBox.innerHTML = `<div class="tech-dash-donut-wrap">` +
      `<div class="dashboard-distribution-donut">` +
        `<svg class="dashboard-donut-svg" viewBox="0 0 152 152" role="img" aria-label="Progreso personal">${arcs}</svg>` +
        `<div class="dashboard-donut-center"><strong>${progress}%</strong><span>Avance</span></div>` +
      `</div>` +
      `<div class="tech-dash-donut-legend">` +
        segs.map((s, idx) => {
          const pct = total ? Math.round((s.count / total) * 100) : 0;
          return `<div class="tech-dash-legend-row" data-slice-idx="${idx}" data-tip-title="${dashboardEscape(s.label)}" data-tip-lines="${s.count} trabajo${s.count===1?'':'s'}|${pct}%"><i style="background:${s.color}"></i><span>${dashboardEscape(s.label)}</span><strong>${s.count}</strong><em>${pct}%</em></div>`;
        }).join('') +
      `</div>` +
    `</div>`;
  }

  const barsBox = document.getElementById('tech-dash-bars');
  if (barsBox) {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 12);
      const key = dashboardDateKey(d);
      const count = myOrders.filter(o => o.status === 'completada' && dashboardDateKey(dashboardCompletionTime(o)) === key).length;
      const label = d.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '');
      const fullLabel = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });
      days.push({ key, label, fullLabel, count });
    }
    const max = Math.max(1, ...days.map(d => d.count));
    const width = 420; const height = 190;
    const left = 26; const right = 14; const top = 24; const bottom = 32;
    const cw = width - left - right; const ch = height - top - bottom;
    const slot = cw / days.length;
    const bw = Math.min(28, slot * 0.56);

    const barsSvg = days.map((d, i) => {
      const cx = left + (i * slot) + (slot / 2);
      const bh = (d.count / max) * ch;
      const y = top + ch - bh;
      return `<g class="dashboard-week-group" data-tip-title="${dashboardEscape(d.fullLabel)}" data-tip-lines="Completados: ${d.count}">` +
        `<rect x="${(cx - bw / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(3, bh).toFixed(1)}" rx="6" fill="${d.count ? '#10b981' : '#e2e8f0'}" class="dashboard-bar-rect"/>` +
        `<text x="${cx.toFixed(1)}" y="${Math.max(13, y - 6).toFixed(1)}" class="dashboard-bar-val" text-anchor="middle">${d.count}</text>` +
        `<text x="${cx.toFixed(1)}" y="${height - 10}" class="dashboard-line-label" text-anchor="middle">${dashboardEscape(d.label)}</text>` +
      `</g>`;
    }).join('');

    barsBox.innerHTML = `<svg viewBox="0 0 ${width} ${height}" class="dashboard-weekly-svg" role="img" aria-label="Completados en los últimos 7 días">${barsSvg}</svg>`;
  }
}

function setDashboardPeriod(range) {
  dashboardSelectedPeriod=range;
  const today=new Date(); today.setHours(12,0,0,0); let from=new Date(today);
  if(range==='week') from=dashboardWeekStart(today);
  if(range==='fortnight') from=new Date(today.getFullYear(),today.getMonth(),today.getDate()<=15?1:16,12);
  if(range==='month') from=new Date(today.getFullYear(),today.getMonth(),1,12);
  document.getElementById('dashboard-from').value=dashboardDateKey(from); document.getElementById('dashboard-to').value=dashboardDateKey(today);
  document.querySelectorAll('[data-dashboard-period]').forEach(select=>{select.value=range;});
  const labels={day:'Rendimiento diario',week:'Rendimiento semanal',fortnight:'Rendimiento quincenal',month:'Rendimiento mensual'};
  setDashboardValue('dashboard-performance-title',labels[range] || 'Rendimiento del período');
  renderAdminDashboard();
  void loadDashboardData();
}

function setDashboardQuickRange(range) { setDashboardPeriod(range); }

function setDashboardCustomRange() {
  dashboardSelectedPeriod='custom';
  document.querySelectorAll('[data-dashboard-period]').forEach(select=>{
    if(!select.querySelector?.('option[value="custom"]')) select.insertAdjacentHTML?.('afterbegin','<option value="custom" hidden>Personalizado</option>');
    select.value='custom';
  });
  setDashboardValue('dashboard-performance-title','Rendimiento personalizado');
  renderAdminDashboard();
  void loadDashboardData();
}

function resetDashboardFilters() {
  ['dashboard-tech','dashboard-zone','dashboard-origin'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  setDashboardQuickRange('week');
}

async function initAdminDashboard() {
  initCommon();
  initDashboardTooltips();
  const techMode = isTechnicianDashboardView();
  if (techMode) {
    const adminView = document.getElementById('dashboard-admin-view');
    const techView = document.getElementById('dashboard-tech-view');
    if (adminView) adminView.hidden = true;
    if (techView) techView.hidden = false;
    document.body?.classList?.add('dashboard-tech-mode');
    await loadDB({loadingTitle:'Cargando tu avance',loadingSubtitle:'Consultando tus trabajos recientes.'});
    renderTechnicianDashboard();
    return;
  }

  if(!userHasRole('administrador','admin','soporte','atencion_clientes')){location.href='mapa.html';return;}
  const adminView = document.getElementById('dashboard-admin-view');
  const techView = document.getElementById('dashboard-tech-view');
  if (adminView) adminView.hidden = false;
  if (techView) techView.hidden = true;

  let urlKind = null;
  if (typeof URLSearchParams !== 'undefined' && typeof window !== 'undefined' && window.location?.search) {
    urlKind = new URLSearchParams(window.location.search).get('detailKind');
  }
  if(urlKind==='network'||urlKind==='physical'){dashboardSelectedDetailKind=urlKind;}
  document.getElementById('dashboard-tab-physical')?.classList?.toggle?.('is-active',dashboardSelectedDetailKind==='physical');
  document.getElementById('dashboard-tab-network')?.classList?.toggle?.('is-active',dashboardSelectedDetailKind==='network');
  document.getElementById('dashboard-tab-physical')?.setAttribute?.('aria-selected',String(dashboardSelectedDetailKind==='physical'));
  document.getElementById('dashboard-tab-network')?.setAttribute?.('aria-selected',String(dashboardSelectedDetailKind==='network'));
  updateDashboardKindModeUI(dashboardSelectedDetailKind);

  const today=new Date(); const weekStart=dashboardWeekStart(today);
  document.getElementById('dashboard-from').value=dashboardDateKey(weekStart); document.getElementById('dashboard-to').value=dashboardDateKey(today);
  await Promise.all([loadDB({loadingTitle:'Cargando dashboard',loadingSubtitle:'Calculando indicadores y rendimiento.'}),loadDashboardGoal()]);
  dashboardGlobalStats={...(window.netopsPageMeta?.operations?.stats||dashboardGlobalStats)};
  const initialOperations = (window.netopsCloudLoadOk !== false && dashboardSelectedDetailKind === 'physical') ? window.netopsPageMeta?.operations : null;
  await loadDashboardData(false, initialOperations ? {...initialOperations,workOrders:state.workOrders} : null);
  const canEditGoal=typeof isPrincipalAdministratorClient==='function'&&isPrincipalAdministratorClient();
  const goalInput=document.getElementById('dashboard-monthly-goal'); const goalButton=document.getElementById('dashboard-save-goal');
  const goalEditor=goalInput?.closest?.('.dashboard-goal-editor'); if(goalEditor) goalEditor.hidden=!canEditGoal;
  if(goalInput) goalInput.disabled=!canEditGoal; if(goalButton) goalButton.hidden=!canEditGoal;
  ['dashboard-from','dashboard-to'].forEach(id=>{const field=document.getElementById(id);if(field)field.onchange=setDashboardCustomRange;});
  populateDashboardFilters(); renderAdminDashboard();
}

dashboardGlobal.setDashboardDetailKind = setDashboardDetailKind;
dashboardGlobal.populateDashboardFilters = populateDashboardFilters;
dashboardGlobal.renderAdminDashboard = renderAdminDashboard;
dashboardGlobal.loadDashboardData = loadDashboardData;
dashboardGlobal.isTechnicianDashboardView = isTechnicianDashboardView;
dashboardGlobal.renderTechnicianDashboard = renderTechnicianDashboard;
dashboardGlobal.setTechDashboardPeriod = setTechDashboardPeriod;
dashboardGlobal.renderDashboardWeeklyChart = renderDashboardWeeklyChart;
dashboardGlobal.renderDashboardStatusAndZonesChart = renderDashboardStatusAndZonesChart;
