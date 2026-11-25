const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

function createMockLeaflet() {
  const markers = [];
  const polylines = [];
  const makeLayerGroup = () => {
    const layers = [];
    return {
      layers,
      addTo() { return this; },
      clearLayers() { layers.length = 0; },
      addLayer(layer) { layers.push(layer); }
    };
  };
  const L = {
    divIcon(opts) { return { __divIcon: true, ...opts }; },
    layerGroup: makeLayerGroup,
    tileLayer() {
      return {
        on() { return this; },
        addTo() { return this; }
      };
    },
    map() {
      let center = { lat: 17.35, lng: -99.35 };
      let zoom = 8;
      return {
        setView(c, z) { center = c; zoom = z; return this; },
        getCenter() { return center; },
        getZoom() { return zoom; },
        fitBounds() {},
        invalidateSize() {},
        removeLayer(layer) {
          const idx = markers.indexOf(layer);
          if (idx >= 0) markers.splice(idx, 1);
        }
      };
    },
    marker(latlng, options) {
      const m = {
        latlng,
        options,
        popupHtml: '',
        tooltipText: '',
        getLatLng() { return latlng; },
        addTo(target) {
          if (target && Array.isArray(target.layers)) target.layers.push(m);
          markers.push(m);
          return m;
        },
        bindPopup(html) { m.popupHtml = html; return m; },
        bindTooltip(text) { m.tooltipText = text; return m; }
      };
      return m;
    },
    polyline(latlngs, options) {
      const p = {
        latlngs,
        options,
        popupHtml: '',
        addTo(target) {
          if (target && Array.isArray(target.layers)) target.layers.push(p);
          polylines.push(p);
          return p;
        },
        bindPopup(html) { p.popupHtml = html; return p; }
      };
      return p;
    }
  };
  return { L, markers, polylines };
}

function testMainMapDeduplicationAndConsolidation() {
  const { L, markers, polylines } = createMockLeaflet();
  const elements = {
    'map-view-filter': { value: 'both' },
    'map-zone-filter': { value: 'all', innerHTML: '' },
    'map-search': { value: '' },
    'map-search-options': { innerHTML: '' },
    'map-show-labels': { checked: true },
    'map-show-plan': { checked: false },
    'map-stat-equipment': { textContent: '' },
    'map-stat-nodes': { textContent: '' },
    'map-stat-visible': { textContent: '' },
    'map-stat-critical': { textContent: '' },
    'map': { classList: { add() {}, remove() {} }, appendChild() {} }
  };

  let currentRole = 'administrador';
  const context = {
    console,
    setTimeout: () => 0,
    clearTimeout: () => {},
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    window: { addEventListener() {} },
    localStorage: { removeItem() {}, setItem() {}, getItem() { return null; } },
    location: { href: '' },
    document: {
      getElementById: id => elements[id] || null,
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => ({ id: '', className: '', textContent: '' })
    },
    L,
    REGS: [{ id: 'centro', n: 'Centro' }],
    state: {
      equipment: [
        { id: 'eq-1', name: 'Antena Centro', ip: '10.0.0.1', region: 'centro', lat: 17.35000, lng: -99.35000, linkedNodeIds: ['nd-1', 'nd-2'] },
        // Duplicado por ID
        { id: 'eq-1', name: 'Antena Centro', ip: '10.0.0.1', region: 'centro', lat: 17.35000, lng: -99.35000, linkedNodeIds: ['nd-1', 'nd-2'] },
        // Otra antena a ~8m (dentro de 0.0001°)
        { id: 'eq-2', name: 'Antena Respaldo', ip: '10.0.0.2', region: 'centro', lat: 17.35007, lng: -99.35004, linkedNodeIds: [] },
        // Antena lejana
        { id: 'eq-3', name: 'Antena Norte', ip: '10.0.0.3', region: 'centro', lat: 17.42000, lng: -99.42000, linkedNodeIds: [] }
      ],
      nodes: [
        // Pueblo en la misma ubicación que eq-1 y eq-2 (~5m)
        { id: 'nd-1', nodeCode: 'R10', town: 'Pueblo Centro', zone: 'centro', lat: 17.35004, lng: -99.35002 },
        // Duplicado por ID
        { id: 'nd-1', nodeCode: 'R10', town: 'Pueblo Centro', zone: 'centro', lat: 17.35004, lng: -99.35002 },
        // Pueblo lejano vinculado a eq-1
        { id: 'nd-2', nodeCode: 'R20', town: 'Pueblo Sur', zone: 'centro', lat: 17.28000, lng: -99.28000 }
      ],
      weekPlan: {},
      technicians: []
    },
    userHasRole: role => currentRole === role,
    safeFloat: v => {
      const n = Number(v);
      return Number.isFinite(n) ? n : NaN;
    },
    normalizeName: v => String(v || '').trim().toLowerCase(),
    getZoneLabel: id => id === 'centro' ? 'Centro' : String(id || ''),
    getNodeLabel: n => [n?.nodeCode, n?.town].filter(Boolean).join(' - '),
    getEntityPriorityStatus: (type, id) => {
      if (type === 'node' && id === 'nd-1') return { key: 'critico', label: 'Crítico', color: '#ef4444', count: 2 };
      return { key: 'despejado', label: 'Despejado', color: '#22c55e', count: 0 };
    },
    renderMapEntityDetailStats: () => '',
    getEquipmentLinkedNodeIds: eqId => eqId === 'eq-1' ? ['nd-1', 'nd-2', 'nd-2'] : [],
    getEquipmentLinkedNodes: eqId => eqId === 'eq-1' ? [context.state.nodes[0], context.state.nodes[2]] : []
  };

  vm.createContext(context);
  const mapaSource = fs.readFileSync('public/assets/js/mapa.js', 'utf8');
  vm.runInContext(mapaSource, context, { filename: 'public/assets/js/mapa.js' });

  context.initMapCanvas();
  context.updateMapMarkers({ fit: true });

  // 3 ubicaciones distintas: [eq-1 + eq-2 + nd-1 consolidados], [eq-3], [nd-2]
  assert.equal(markers.length, 3, `Se esperaban 3 marcadores consolidados y se crearon ${markers.length}`);

  // Stats sin duplicados por ID
  assert.equal(elements['map-stat-equipment'].textContent, 3, 'Debe contar 3 antenas únicas sin duplicados');
  assert.equal(elements['map-stat-nodes'].textContent, 2, 'Debe contar 2 pueblos únicos sin duplicados');
  assert.equal(elements['map-stat-visible'].textContent, 5, 'Debe contar 5 elementos visibles únicos');
  assert.equal(elements['map-stat-critical'].textContent, 1, 'Debe contar 1 crítico único');

  // Marcador consolidado con 3 elementos (2 antenas + 1 pueblo), color crítico (#ef4444) y sin duplicados en popup
  const consolidated = markers.find(m => m.options.icon.className.includes('map-cluster-mixed'));
  assert(consolidated, 'Debe existir un marcador consolidado mixto');
  assert(consolidated.options.icon.html.includes('>3<'), 'El marcador consolidado debe mostrar la cantidad 3');
  assert(consolidated.options.icon.html.includes('#ef4444'), 'El marcador consolidado debe heredar la mayor prioridad (crítico)');
  assert(consolidated.popupHtml.includes('Ubicación compartida'), 'El popup consolidado debe indicar ubicación compartida');
  assert.equal((consolidated.popupHtml.match(/Antena Centro/g) || []).length, 1, 'Antena Centro no debe duplicarse en el popup');
  assert.equal((consolidated.popupHtml.match(/Antena Respaldo/g) || []).length, 1, 'Antena Respaldo debe aparecer una vez en el popup');
  assert.equal((consolidated.popupHtml.match(/R10 - Pueblo Centro/g) || []).length, 1, 'R10 - Pueblo Centro no debe duplicarse en el popup');

  // Solo 1 polilínea (eq-1 -> nd-2); se omite la polilínea coincidente (eq-1 -> nd-1) y duplicados
  assert.equal(polylines.length, 1, `Solo debe dibujarse 1 enlace no coincidente, se dibujaron ${polylines.length}`);

  // Verificar restricción de rol atencion_clientes dentro del popup consolidado
  currentRole = 'atencion_clientes';
  polylines.length = 0;
  context.updateMapMarkers({ fit: false });
  const consolidatedAtt = markers.find(m => m.options.icon.className.includes('map-cluster-mixed'));
  assert(consolidatedAtt, 'Debe seguir consolidando en rol atencion_clientes');
  assert(!consolidatedAtt.popupHtml.includes("openMapEntityDetails('equipment'"), 'atencion_clientes no debe ver botón detalles de antena');
  assert(consolidatedAtt.popupHtml.includes("openMapEntityDetails('node','nd-1')"), 'atencion_clientes sí debe ver botón detalles de pueblo');
}

function testSecondaryAntennaLinkMapConsolidation() {
  const { L, markers, polylines } = createMockLeaflet();
  const modal = { classList: { contains: cls => cls === 'open' } };
  const mapEl = {};
  const context = {
    console,
    setTimeout: () => 0,
    window: {},
    document: {
      getElementById: id => {
        if (id === 'ant-node-link-map') return mapEl;
        if (id === 'ant-node-link-mo') return modal;
        return null;
      }
    },
    L,
    state: {
      equipment: [
        { id: 'eq-a', name: 'Antena Base', lat: 17.50000, lng: -99.50000 }
      ],
      nodes: [
        // Coincidente con la antena (~5m)
        { id: 'n-same', nodeCode: 'R1', town: 'Centro', zone: 'centro', lat: 17.50004, lng: -99.50003 },
        // Duplicado por ID
        { id: 'n-same', nodeCode: 'R1', town: 'Centro', zone: 'centro', lat: 17.50004, lng: -99.50003 },
        // Dos pueblos distintos en la misma ubicación remota
        { id: 'n-r1', nodeCode: 'R2', town: 'Barrio Alto', zone: 'centro', lat: 17.55000, lng: -99.55000 },
        { id: 'n-r2', nodeCode: 'R3', town: 'Barrio Bajo', zone: 'centro', lat: 17.55005, lng: -99.55002 }
      ]
    },
    safeFloat: v => {
      const n = Number(v);
      return Number.isFinite(n) ? n : NaN;
    },
    getZoneLabel: id => String(id || ''),
    getNodeLabel: n => [n?.nodeCode, n?.town].filter(Boolean).join(' - '),
    getEquipmentLinkedNodes: () => context.state.nodes
  };

  vm.createContext(context);
  const antenasSource = fs.readFileSync('public/assets/js/antenas.js', 'utf8');
  vm.runInContext(antenasSource, context, { filename: 'public/assets/js/antenas.js' });

  vm.runInContext("linkingAntennaId = 'eq-a'; renderAntennaNodeLinkMap();", context);

  // 2 marcadores consolidados: [eq-a + n-same] y [n-r1 + n-r2]
  assert.equal(markers.length, 2, `Mapa secundario debe mostrar 2 marcadores consolidados y mostró ${markers.length}`);
  // 1 sola polilínea hacia la ubicación remota compartida
  assert.equal(polylines.length, 1, `Mapa secundario debe dibujar 1 sola polilínea y dibujó ${polylines.length}`);
  const antennaGroupMarker = markers.find(m => m.popupHtml.includes('Antena Base'));
  assert(antennaGroupMarker, 'Debe existir marcador consolidado de la antena');
  assert(antennaGroupMarker.popupHtml.includes('R1 - Centro'), 'Popup de antena debe listar el pueblo coincidente');
  assert.equal((antennaGroupMarker.popupHtml.match(/R1 - Centro/g) || []).length, 1, 'No debe duplicar R1 - Centro');
  const remoteGroupMarker = markers.find(m => m.popupHtml.includes('R2 - Barrio Alto'));
  assert(remoteGroupMarker, 'Debe existir marcador consolidado de pueblos remotos');
  assert(remoteGroupMarker.popupHtml.includes('R3 - Barrio Bajo'), 'Debe listar ambos pueblos en la misma ubicación remota');
}

function testCompactSingleStripHeader() {
  const html = fs.readFileSync('public/mapa.html', 'utf8');
  const compactCss = fs.readFileSync('public/assets/css/map-toolbar-compact.css', 'utf8');
  const respCss = fs.readFileSync('public/assets/css/map-responsive.css', 'utf8');

  assert(!html.includes('map-main-hero'), 'mapa.html ya no debe renderizar el hero voluminoso separado');
  assert(html.includes('class="map-toolbar map-unified-bar"'), 'mapa.html debe usar la franja superior unificada');
  for (const id of ['map-stat-equipment', 'map-stat-nodes', 'map-stat-visible', 'map-stat-critical', 'map-view-filter', 'map-zone-filter', 'map-search', 'map-show-labels']) {
    assert(html.includes(`id="${id}"`), `Falta control o indicador #${id} en mapa.html`);
  }
  assert(compactCss.includes('.map-toolbar.map-unified-bar'), 'map-toolbar-compact.css debe estilizar .map-unified-bar');
  assert(compactCss.includes('height:34px!important'), 'Los controles del mapa deben ser compactos (34px)');
  assert(compactCss.includes('.map-consolidated-popup'), 'map-toolbar-compact.css debe estilizar el popup consolidado');
  assert(respCss.includes('grid-template-rows:minmax(0,1fr)!important'), 'map-responsive.css debe dar toda la altura del shell a la tarjeta del mapa');
}

testMainMapDeduplicationAndConsolidation();
testSecondaryAntennaLinkMapConsolidation();
testCompactSingleStripHeader();
console.log('PASS: deduplicacion de marcadores, consolidacion de ubicaciones coincidentes y franja compacta del mapa.');
