function dashboardDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

let dashboardLoadSequence=0;
let dashboardMonthlyGoal=350;
let dashboardSelectedPeriod='week';
let dashboardGlobalStats={};
const DASHBOARD_PHYSICAL_EXCLUDED_CATEGORIES=new Set(['instalacion','nueva_instalacion','instalacion_nueva','reubicacion_antena','reubicacion','resurtir_antena','surtir_antena','solicitud_respaldo','solicitud_de_respaldo']);
function dashboardOperationsParams(){const selected=document.getElementById('dashboard-from')?.value||dashboardDateKey();const selectedDate=new Date(`${selected}T00:00:00`);const now=new Date();const previousMonth=new Date(now.getFullYear(),now.getMonth()-1,1);const from=new Date(Math.min(selectedDate.getTime(),previousMonth.getTime()));const toKey=document.getElementById('dashboard-to')?.value||dashboardDateKey();const toDate=new Date(`${toKey}T00:00:00`);toDate.setDate(toDate.getDate()+1);const tomorrow=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);return {scoped:'1',windowed:'1',detailKind:'physical',from:from.toISOString(),to:new Date(Math.max(toDate.getTime(),tomorrow.getTime())).toISOString()};}
const dashboardGlobal=typeof window!=='undefined'?window:globalThis;
const previousDashboardDataPartParams=dashboardGlobal.netopsGetDataPartParams;
dashboardGlobal.netopsGetDataPartParams=part=>part==='operations'?dashboardOperationsParams():part==='people'?{scoped:'1',role:'tecnico'}:previousDashboardDataPartParams?.(part);
async function loadDashboardData(shouldRender=true){if(typeof fetchDataPage!=='function'){if(shouldRender)renderAdminDashboard();return;}const sequence=++dashboardLoadSequence;try{const params=dashboardOperationsParams();let data=await fetchDataPage('operations',{...params,offset:0,limit:100});let rows=Array.isArray(data.workOrders)?data.workOrders:[];dashboardGlobalStats={...(data.stats||{})};const total=Number(data.total)||rows.length;for(let offset=100;offset<total;offset+=100){const page=await fetchDataPage('operations',{...params,offset,limit:100});rows.push(...(page.workOrders||[]));}if(sequence!==dashboardLoadSequence)return;state.workOrders=[...new Map(rows.map(row=>[row.id,row])).values()];if(shouldRender)renderAdminDashboard();}catch(error){if(typeof notify==='function')notify(typeof describeSyncError==='function'?describeSyncError(error):String(error),'err');}}

function dashboardEscape(value) {
  return typeof escapeHtml === 'function' ? escapeHtml(String(value ?? '')) : String(value ?? '').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function dashboardTime(value) {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(time) ? time : NaN;
}

function dashboardCompletionTime(detail) {
  return dashboardTime(detail?.completedAt || detail?.technicianReport?.completedAt || '');
}

function dashboardCompletionActor(detail) {
  const report = detail?.technicianReport || {};
  const id = String(report.completedBy || detail?.updatedById || '').trim();
  const name = String(report.completedByName || detail?.updatedByName || detail?.lastActionBy || 'Sin técnico').trim();
  return { id:id || name, name:name || 'Sin técnico' };
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
    return { id:String(source?.id || user.id || user.username || user.name).trim(), userId:String(user.id || ''), username:String(user.username || ''), name:user.name };
  });
}

function dashboardDirectoryMatchesActor(item,actor) {
  if (!item || !actor) return false;
  const actorId = normalizeName(actor.id);
  const matchesId = [item.id,item.userId,item.username].map(normalizeName).filter(Boolean).includes(actorId);
  return matchesId || item.name === dashboardVisibleTechnicianName(actor.name);
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
  const actor = dashboardCompletionActor(detail);
  const directory = dashboardTechnicianDirectory();
  const visibleActor = directory.find(item => dashboardDirectoryMatchesActor(item,actor));
  if (tech) {
    if(tech==='__office__') {
      if(visibleActor) return false;
    } else {
    const selected = directory.find(item => item.id === tech);
    if (!visibleActor || !selected || visibleActor.name !== selected.name) return false;
    }
  }
  if (zone && dashboardDetailZone(detail) !== zone) return false;
  if (origin && dashboardDetailOrigin(detail) !== origin) return false;
  return true;
}

function dashboardIsResolved(detail) {
  return ['completada','no_realizado'].includes(detail?.status || '') && Number.isFinite(dashboardCompletionTime(detail));
}

function dashboardIsSolved(detail) {
  return detail?.status === 'completada' && Number.isFinite(dashboardCompletionTime(detail));
}

function dashboardIsPhysical(detail) {
  const category=String(typeof getOrderCategory==='function'?getOrderCategory(detail):(detail?.category||'')).trim().toLowerCase();
  return !detail?.deletedAt&&String(detail?.detailKind||'physical')!=='network'&&!DASHBOARD_PHYSICAL_EXCLUDED_CATEGORIES.has(category);
}

function populateDashboardFilters() {
  const techs = dashboardTechnicianDirectory();
  document.getElementById('dashboard-tech').innerHTML = '<option value="">Todos los técnicos y oficina</option><option value="__office__">Oficina</option>' + techs.map(tech=>`<option value="${dashboardEscape(tech.id)}">${dashboardEscape(tech.name)}</option>`).join('');
  const zones = [...new Set((state.workOrders || []).map(dashboardDetailZone).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  document.getElementById('dashboard-zone').innerHTML = '<option value="">Todas las zonas</option>' + zones.map(zone=>`<option value="${dashboardEscape(zone)}">${dashboardEscape(typeof getZoneLabel==='function' ? getZoneLabel(zone) : zone)}</option>`).join('');
}

function setDashboardValue(id,value) { const el=document.getElementById(id); if(el) el.textContent=String(value); }

function countSolvedBetween(details,from,to) {
  return details.filter(detail => dashboardIsSolved(detail) && dashboardCompletionTime(detail)>=from && dashboardCompletionTime(detail)<=to).length;
}

function renderDashboardDailyChart(details,bounds) {
  const box = document.getElementById('dashboard-daily-chart');
  const days = [];
  const cursor = new Date(`${bounds.fromKey}T12:00:00`);
  const end = new Date(`${bounds.toKey}T12:00:00`);
  while (cursor <= end && days.length < 120) { days.push(dashboardDateKey(cursor)); cursor.setDate(cursor.getDate()+1); }
  const counts = days.map(key => details.filter(detail => dashboardIsSolved(detail) && dashboardDateKey(detail.completedAt || detail.technicianReport?.completedAt)===key).length);
  if(!days.length){box.innerHTML='<div class="analytics-empty">Sin días dentro del período.</div>';return;}
  const max=Math.max(1,...counts);
  const width=Math.max(560,80+(Math.max(1,days.length-1)*78));
  const height=245; const left=38; const right=22; const top=28; const bottom=42;
  const chartWidth=width-left-right; const chartHeight=height-top-bottom;
  const pointX=index=>days.length===1?left+(chartWidth/2):left+(index/(days.length-1))*chartWidth;
  const pointY=value=>top+chartHeight-((value/max)*chartHeight);
  const points=counts.map((value,index)=>`${pointX(index).toFixed(1)},${pointY(value).toFixed(1)}`).join(' ');
  const areaPoints=`${left},${top+chartHeight} ${points} ${width-right},${top+chartHeight}`;
  const grid=[0,.25,.5,.75,1].map(ratio=>{const y=top+chartHeight-(ratio*chartHeight);const value=Math.round(max*ratio);return `<line x1="${left}" y1="${y}" x2="${width-right}" y2="${y}" class="dashboard-line-grid"/><text x="${left-9}" y="${y+3}" class="dashboard-line-axis" text-anchor="end">${value}</text>`;}).join('');
  const nodes=days.map((key,index)=>{const date=new Date(`${key}T12:00:00`);const label=date.toLocaleDateString('es-MX',{day:'numeric',month:'short'});const x=pointX(index);const y=pointY(counts[index]);return `<g class="dashboard-line-node"><circle cx="${x}" cy="${y}" r="5"><title>${dashboardEscape(label)}: ${counts[index]} solucionados</title></circle><text x="${x}" y="${Math.max(13,y-11)}" class="dashboard-line-value" text-anchor="middle">${counts[index]}</text><text x="${x}" y="${height-15}" class="dashboard-line-label" text-anchor="middle">${dashboardEscape(label)}</text></g>`;}).join('');
  box.innerHTML=`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Detalles solucionados por día"><defs><linearGradient id="dashboard-line-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0874f9" stop-opacity=".2"/><stop offset="1" stop-color="#0874f9" stop-opacity="0"/></linearGradient></defs>${grid}<polygon points="${areaPoints}" class="dashboard-line-area"/><polyline points="${points}" class="dashboard-line-path"/>${nodes}</svg>`;
  setDashboardValue('dashboard-daily-caption',`${days.length} día${days.length===1?'':'s'} analizado${days.length===1?'':'s'}`);
}

function dashboardWeekStart(value) {
  const date = new Date(value); date.setHours(0,0,0,0);
  const day = date.getDay() || 7; date.setDate(date.getDate()-day+1);
  return date;
}

function renderDashboardTechTable(details,bounds) {
  const directory = dashboardTechnicianDirectory();
  const selectedTech = document.getElementById('dashboard-tech')?.value || '';
  const visibleDirectory = selectedTech&&selectedTech!=='__office__' ? directory.filter(tech => tech.id === selectedTech) : directory;
  const groups = new Map(visibleDirectory.map(tech => [tech.name,{name:tech.name,solved:0,office:false}]));
  if(!selectedTech||selectedTech==='__office__') groups.set('Oficina',{name:'Oficina',solved:0,office:true});
  details.filter(detail=>dashboardIsSolved(detail)&&dashboardCompletionTime(detail)>=bounds.from&&dashboardCompletionTime(detail)<=bounds.to).forEach(detail=>{
    const actor=dashboardCompletionActor(detail);
    const technician=directory.find(item => dashboardDirectoryMatchesActor(item,actor));
    const groupName=technician?.name||'Oficina';
    if(groups.has(groupName)) groups.get(groupName).solved++;
  });
  const rows=[...groups.values()].sort((a,b)=>b.solved-a.solved||Number(b.office)-Number(a.office)||a.name.localeCompare(b.name)).slice(0,8);
  const total=rows.reduce((sum,row)=>sum+row.solved,0);
  const colors=['#0874f9','#11ad55','#8f25ef','#f49b00','#08a9b7','#ef476f','#617493','#7c5cff'];
  rows.forEach((row,index)=>{row.color=row.office?'#f49b00':colors[index%colors.length];});
  let progress=0;
  const segments=rows.filter(row=>row.solved>0).map(row=>{const start=progress;progress+=(row.solved/Math.max(1,total))*360;return `${row.color} ${start.toFixed(2)}deg ${progress.toFixed(2)}deg`;});
  const gradient=segments.length?`conic-gradient(${segments.join(',')})`:'#edf2f8';
  const box=document.getElementById('dashboard-tech-table');
  box.innerHTML=`<div class="dashboard-distribution-chart"><div class="dashboard-distribution-donut" style="background:${gradient}"><div><strong>${total}</strong><span>Solucionados</span></div></div><div class="dashboard-distribution-legend">${rows.map(row=>`<div><i style="background:${row.color}"></i><span>${dashboardEscape(row.name)}</span><strong>${row.solved}</strong></div>`).join('')}</div></div>`;
}

function renderDashboardCompliance(solved,total,rate) {
  setDashboardValue('dashboard-compliance-value',`${rate}%`);
  setDashboardValue('dashboard-compliance-count',`${solved} / ${total}`);
  setDashboardValue('dashboard-ring-goal',`Meta: ${total}`);
  const ring=document.getElementById('dashboard-compliance-ring');
  if(ring) ring.style.setProperty('--rate',`${Math.min(100,Math.max(0,rate))*3.6}deg`);
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

function renderAdminDashboard() {
  const bounds=dashboardBounds();
  const physicalDetails=(state.workOrders||[]).filter(dashboardIsPhysical);
  const details=physicalDetails.filter(dashboardMatchesDimensions);
  const now=new Date(); const todayStart=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime(); const todayEnd=todayStart+86400000-1;
  const weekStart=dashboardWeekStart(now).getTime(); const monthStart=new Date(now.getFullYear(),now.getMonth(),1).getTime();
  const todayCount=countSolvedBetween(details,todayStart,todayEnd);
  const weekCount=countSolvedBetween(details,weekStart,todayEnd);
  const monthCount=countSolvedBetween(details,monthStart,todayEnd);
  const todayAdded=details.filter(item=>{const time=dashboardTime(item.createdAt);return Number.isFinite(time)&&time>=todayStart&&time<=todayEnd;}).length;
  const monthAdded=details.filter(item=>{const time=dashboardTime(item.createdAt);return Number.isFinite(time)&&time>=monthStart&&time<=todayEnd;}).length;
  const statTotal=Number(dashboardGlobalStats.total); const statPending=Number(dashboardGlobalStats.pending); const statDone=Number(dashboardGlobalStats.done);
  const totalDetails=Number.isFinite(statTotal)?statTotal:physicalDetails.length;
  const physicalPending=Number.isFinite(statPending)?statPending:physicalDetails.filter(item=>!dashboardIsResolved(item)).length;
  const totalSolved=Number.isFinite(statDone)?statDone:physicalDetails.filter(dashboardIsSolved).length;
  const previousWeekEnd=weekStart-1; const previousWeekStart=previousWeekEnd-(7*86400000)+1;
  const previousMonthStart=new Date(now.getFullYear(),now.getMonth()-1,1).getTime(); const previousMonthEnd=monthStart-1;
  setDashboardValue('dashboard-done-today',todayCount);
  setDashboardValue('dashboard-done-week',weekCount);
  setDashboardValue('dashboard-done-month',monthCount);
  renderDashboardTrend('dashboard-week-trend',weekCount,countSolvedBetween(details,previousWeekStart,previousWeekEnd),'semana anterior');
  renderDashboardTrend('dashboard-month-trend',monthCount,countSolvedBetween(details,previousMonthStart,previousMonthEnd),'mes anterior');
  setDashboardValue('dashboard-total-details',totalDetails);
  const periodSolved=details.filter(item=>dashboardIsSolved(item)&&dashboardCompletionTime(item)>=bounds.from&&dashboardCompletionTime(item)<=bounds.to);
  const periodGoal=dashboardGoalForPeriod(bounds);
  const rate=Math.round((periodSolved.length/periodGoal)*100);
  setDashboardValue('dashboard-period-added',todayAdded); setDashboardValue('dashboard-period-solved',monthAdded); setDashboardValue('dashboard-period-pending',physicalPending); setDashboardValue('dashboard-period-rate',totalSolved);
  setDashboardValue('dashboard-period-goal-label','Histórico');
  setDashboardValue('dashboard-compliance-goal-label',`Meta ${dashboardGoalLabel()}`);
  setDashboardValue('dashboard-goal-guidance',`Meta mensual: ${dashboardMonthlyGoal} · Meta semanal: ${Math.ceil(dashboardMonthlyGoal/4)} · Faltan ${Math.max(0,dashboardMonthlyGoal-monthCount)} este mes`);
  setDashboardValue('dashboard-updated-at',new Date().toLocaleString('es-MX',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}));
  renderDashboardDailyChart(details,bounds); renderDashboardCompliance(periodSolved.length,periodGoal,rate); renderDashboardTechTable(details,bounds);
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
  if(!userHasRole('administrador','admin','atencion_clientes')){location.href='mapa.html';return;}
  const today=new Date(); const weekStart=dashboardWeekStart(today);
  document.getElementById('dashboard-from').value=dashboardDateKey(weekStart); document.getElementById('dashboard-to').value=dashboardDateKey(today);
  await Promise.all([loadDB({loadingTitle:'Cargando dashboard',loadingSubtitle:'Calculando indicadores y rendimiento.'}),loadDashboardGoal()]);
  dashboardGlobalStats={...(window.netopsPageMeta?.operations?.stats||dashboardGlobalStats)};
  await loadDashboardData(false);
  const canEditGoal=typeof isPrincipalAdministratorClient==='function'&&isPrincipalAdministratorClient();
  const goalInput=document.getElementById('dashboard-monthly-goal'); const goalButton=document.getElementById('dashboard-save-goal');
  const goalEditor=goalInput?.closest?.('.dashboard-goal-editor'); if(goalEditor) goalEditor.hidden=!canEditGoal;
  if(goalInput) goalInput.disabled=!canEditGoal; if(goalButton) goalButton.hidden=!canEditGoal;
  ['dashboard-from','dashboard-to'].forEach(id=>{const field=document.getElementById(id);if(field)field.onchange=setDashboardCustomRange;});
  populateDashboardFilters(); renderAdminDashboard();
}
