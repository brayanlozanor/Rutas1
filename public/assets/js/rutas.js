    let routeCurrentPage=1;
    const routePageSize=20;
    let routeLoadSequence=0;
    function routeRemoteParams(){return {windowed:'1',offset:(routeCurrentPage-1)*routePageSize,limit:routePageSize,q:document.getElementById('rrs')?.value.trim()||''};}
    const previousRouteDataPartParams=window.netopsGetDataPartParams;
    window.netopsGetDataPartParams=part=>part==='routes'?routeRemoteParams():previousRouteDataPartParams?.(part);
    async function loadRoutePage(){const sequence=++routeLoadSequence;try{const params=routeRemoteParams();const data=await fetchDataPage('routes',params);if(sequence!==routeLoadSequence)return;const total=Number(data.total)||0;if(total>0&&Number(params.offset)>=total){routeCurrentPage=Math.max(1,Math.ceil(total/routePageSize));return loadRoutePage();}state.routes=Array.isArray(data.routes)?data.routes:[];if(typeof _previousStateSaved!=='undefined'&&_previousStateSaved)_previousStateSaved.routes=cloneData(state.routes);window.netopsPageMeta=window.netopsPageMeta||{};window.netopsPageMeta.routes={total,offset:Number(params.offset)||0,limit:routePageSize};renderRutas();}catch(error){notify(describeSyncError(error),'err');}}
    function resetRoutePagination(){routeCurrentPage=1;void loadRoutePage();}
    function changeRoutePage(page){const next=Number(page);if(!Number.isFinite(next)||next<1)return;routeCurrentPage=next;void loadRoutePage();}

    async function initRutasPage() {
      if (!checkAuth()) return;
      
      initCommon();
      await loadDB({ showOverlay: false, preferCache: true });
      applyRoutesPermissions();
      renderRutas();
      renderRutaSelect();   // Si usas selector en mapa
    }

    function canEditRoutes() {
      return userHasRole('administrador', 'admin');
    }

    function applyRoutesPermissions() {
      const readOnly = !canEditRoutes();
      document.body.classList.toggle('routes-readonly', readOnly);
      document.querySelectorAll('[data-routes-edit]').forEach(el => {
        el.style.display = readOnly ? 'none' : '';
      });
      const hint = document.getElementById('routes-mode-hint');
      if (hint) hint.textContent = readOnly
        ? 'Vista de consulta: puedes ver las rutas, pero no editarlas ni agregar nuevas.'
        : 'Tus rutas se guardan de forma local en tu navegador y se sincronizan con la nube.';
    }

    function renderRutas() {
      const search = document.getElementById('rrs').value.toLowerCase().trim();
      let list = state.routes || [];

      if (search) {
        list = list.filter(r => 
          r.n.toLowerCase().includes(search) ||
          (r.coords && r.coords.some(c => c.name && c.name.toLowerCase().includes(search)))
        );
      }

      const meta=window.netopsPageMeta?.routes||{};
      const total=Number.isFinite(Number(meta.total))?Number(meta.total):list.length;
      document.getElementById('rr-count').textContent = `${total} Rutas Guardadas`;

      const html = list.map(r => {
        const pueblos = r.coords && r.coords.length 
          ? r.coords.map(c => c.name || 'Punto').join(', ') 
          : 'Sin puntos';

        return `
          <div class="card">
            <div class="ch">
              <div class="ci" style="background:rgba(9,132,227,0.1)">🚗</div>
              <div style="flex:1">
                <div class="ct2" style="font-size:14px">${r.n}</div>
              </div>
            </div>
            <div class="cs" style="margin-top:6px; line-height:1.4">📍 ${pueblos}</div>
            <div style="display:flex; gap:6px; margin-top:12px">
              <button class="btn bsm bc" onclick="irARuta('${r.id}')">🗺️ Ver en Mapa</button>
              <button class="btn bsm br" onclick="delRuta('${r.id}')">✕ Eliminar</button>
            </div>
          </div>`;
      }).join('');

      document.getElementById('rr-grid').innerHTML = html || `
        <div class="emp">
          <div class="ei">🚗</div>
          <div class="et">No hay rutas guardadas todavía.<br>Sube un CSV o crea una manual.</div>
        </div>`;
      const totalPages=Math.max(1,Math.ceil(total/routePageSize));
      const offset=Number(meta.offset)||0;
      document.getElementById('rr-grid').insertAdjacentHTML('beforeend',`<footer class="inventory-pagination"><button onclick="changeRoutePage(${routeCurrentPage-1})" ${routeCurrentPage===1?'disabled':''}>â€¹</button><span>${total?offset+1:0}-${Math.min(offset+list.length,total)} de ${total}</span><button onclick="changeRoutePage(${routeCurrentPage+1})" ${routeCurrentPage>=totalPages?'disabled':''}>â€º</button></footer>`);
    }

    // Crear ruta desde texto manual
    async function guardarRutaTexto() {
      if (!canEditRoutes()) {
        notify('Solo el administrador puede crear rutas.', 'err');
        return;
      }
      const nombre = document.getElementById('nr-nombre').value.trim();
      const texto = document.getElementById('nr-csv').value.trim();

      if (!nombre) {
        notify("Ingresa un nombre para la ruta", "err");
        return;
      }
      if (!texto) {
        notify("Ingresa los puntos de la ruta", "err");
        return;
      }

      const lines = texto.split('\n').map(l => l.trim()).filter(Boolean);
      let coords = [];

      lines.forEach(line => {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 3) {
          const lat = parseFloat(parts[parts.length-2]);
          const lng = parseFloat(parts[parts.length-1]);
          const name = parts.slice(0, parts.length-2).join(', ') || `Punto ${coords.length + 1}`;
          
          if (!isNaN(lat) && !isNaN(lng)) {
            coords.push({ lat, lng, name });
          }
        }
      });

      if (coords.length < 2) {
        notify("Se necesitan al menos 2 puntos válidos", "err");
        return;
      }

      const newRoute={
        id: gid('r'),
        n: nombre,
        coords: coords
      };state.routes.push(newRoute);

      await saveRecord('routes',newRoute);
      await loadRoutePage();
      CM('add-ruta-mo');
      notify(`Ruta "${nombre}" creada con ${coords.length} puntos ✓`);
    }

    function abrirModalRuta() {
      if (!canEditRoutes()) {
        notify('Solo el administrador puede crear rutas.', 'err');
        return;
      }
      document.getElementById('nr-nombre').value = '';
      document.getElementById('nr-csv').value = '';
      OM('add-ruta-mo');
    }

    // Renombrar en lote
    function abrirRenameRutas() {
      if (!canEditRoutes()) {
        notify('Solo el administrador puede renombrar rutas.', 'err');
        return;
      }
      document.getElementById('bulk-names').value = '';
      OM('rename-mo');
    }

    async function bulkRenameRoutes() {
      if (!canEditRoutes()) {
        notify('Solo el administrador puede renombrar rutas.', 'err');
        return;
      }
      const text = document.getElementById('bulk-names').value.trim();
      if (!text) {
        notify("Pega los nombres primero", "err");
        return;
      }

      const names = text.split('\n').map(l => l.trim()).filter(Boolean);

      // Ordenar rutas numéricamente
      state.routes.sort((a, b) => {
        const numA = parseInt(a.n.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.n.replace(/\D/g, '')) || 0;
        return numA - numB;
      });

      let renamed = 0;
      state.routes.forEach((r, i) => {
        if (names[i]) {
          r.n = names[i];
          renamed++;
        }
      });

      for(const route of state.routes)await saveRecord('routes',route);
      await loadRoutePage();
      CM('rename-mo');
      notify(`${renamed} rutas renombradas correctamente ✓`);
    }

    async function delRuta(id) {
      if (!canEditRoutes()) {
        notify('Solo el administrador puede eliminar rutas.', 'err');
        return;
      }
      const confirmed = await askConfirmation({ title:'Eliminar ruta', message:'La ruta dejará de estar disponible.', confirmText:'Eliminar', cancelText:'Cancelar', tone:'danger' });
      if (!confirmed) return;
      await deleteCloudRecord('routes',id);
      await loadRoutePage();
      notify("Ruta eliminada");
    }

    function irARuta(id) {
      // Redirige al mapa y muestra la ruta
      localStorage.setItem('selectedRouteId', id);
      window.location.href = 'mapa.html';
    }

    // Renderizar selector de rutas (útil para mapa)
    function renderRutaSelect() {
      // Se puede llamar desde mapa.js
      console.log("Selector de rutas actualizado");
    }
