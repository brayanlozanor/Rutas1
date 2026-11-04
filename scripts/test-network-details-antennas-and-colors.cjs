const fs = require('fs');
const assert = require('assert');

console.log('Testing Network Details, Typography, Colors, Antennas & Retaken Notifications...');

const commonJs = fs.readFileSync('public/assets/js/common.js', 'utf8');
const ordenesJs = fs.readFileSync('public/assets/js/ordenes.js', 'utf8');
const usuariosJs = fs.readFileSync('public/assets/js/usuarios.js', 'utf8');
const antenasJs = fs.readFileSync('public/assets/js/antenas.js', 'utf8');
const apiJs = fs.readFileSync('public/assets/js/api.js', 'utf8');
const relationalStore = fs.readFileSync('relational-store.js', 'utf8');
const ordenesHtml = fs.readFileSync('public/ordenes.html', 'utf8');
const tecnicosHtml = fs.readFileSync('public/tecnicos.html', 'utf8');
const ordersDesignCss = fs.readFileSync('public/assets/css/orders-design-v2.css', 'utf8');
const ordersRefCss = fs.readFileSync('public/assets/css/orders-reference.css', 'utf8');
const ordersTableCss = fs.readFileSync('public/assets/css/orders-table-simple.css', 'utf8');

// 1. Typography
console.log('1. Checking typography and table readability...');
assert(ordersRefCss.includes('font-size:11.5px!important') || ordersRefCss.includes('font-size: 11.5px!important'), 'Header font size in orders-reference.css must be 11.5px');
assert(ordersRefCss.includes('font-size:12.5px!important') || ordersRefCss.includes('font-size: 12.5px!important'), 'Cell font size in orders-reference.css must be 12.5px');
assert(ordersTableCss.includes('font-size:12.5px!important'), 'Cell font size in orders-table-simple.css must be 12.5px');
assert(ordersDesignCss.includes('.order-place-main'), 'orders-design-v2.css must style place');
assert(ordersDesignCss.includes('.order-detail-text'), 'orders-design-v2.css must style detail');

// 2. Timeline with Distinct Colors in "Ver Detalle Completo"
console.log('2. Checking timeline step classification and colors...');
assert(ordenesJs.includes('renderOrderFollowUpTimeline'), 'ordenes.js must render structured timeline');
assert(ordenesJs.includes('getTimelineStepClass'), 'ordenes.js must classify steps with distinct styles');
assert(ordersDesignCss.includes('.order-follow-up-timeline'), 'orders-design-v2.css must define timeline container');
assert(ordersDesignCss.includes('.step-kind-created'), 'orders-design-v2.css must define step-kind-created');
assert(ordersDesignCss.includes('.step-kind-attending'), 'orders-design-v2.css must define step-kind-attending');
assert(ordersDesignCss.includes('.step-kind-retaken'), 'orders-design-v2.css must define step-kind-retaken');
assert(ordersDesignCss.includes('.step-kind-resolved'), 'orders-design-v2.css must define step-kind-resolved');
assert(ordersDesignCss.includes('.step-kind-returned'), 'orders-design-v2.css must define step-kind-returned');
assert(ordersDesignCss.includes('.step-kind-completed'), 'orders-design-v2.css must define step-kind-completed');
assert(ordersDesignCss.includes('.step-kind-reopened'), 'orders-design-v2.css must define step-kind-reopened');

// 3. User Color Management
console.log('3. Checking user color configuration and pills...');
assert(tecnicosHtml.includes('user-color'), 'tecnicos.html must have color picker input');
assert(usuariosJs.includes('updateUserColorPreview'), 'usuarios.js must update color preview');
assert(usuariosJs.includes('document.getElementById(\'user-color\')'), 'usuarios.js must persist user color');
assert(commonJs.includes('function getUserColor'), 'common.js must have getUserColor helper');
assert(commonJs.includes('function renderUserColorChip'), 'common.js must have renderUserColorChip helper');
assert(relationalStore.includes('syncUserColumns'), 'relational-store.js must sync user color column');
assert(relationalStore.includes('color:row.color'), 'relational-store.js must load user color');

// 4. Antenna-to-Node 1-to-Many Linking
console.log('4. Checking antenna-to-node linking and single-antenna enforcement...');
assert(antenasJs.includes('fetchDataPage(\'nodes\', { limit: 1000 })'), 'antenas.js must fetch full nodes list for linking');
assert(antenasJs.includes('otherAntenna.linkedNodeIds = otherAntenna.linkedNodeIds.filter'), 'antenas.js must unassign node from other antenna');
assert(antenasJs.includes('node.equipmentId = eq.id'), 'antenas.js must set equipmentId on node');
assert(relationalStore.includes('DELETE FROM equipment_nodes WHERE node_id IN'), 'relational-store.js must enforce 1-to-many on database level');
assert(relationalStore.includes('allSystemNodes = await loadNodes'), 'relational-store.js must provide available nodes with equipment');
assert(apiJs.includes('node.equipmentId === equipmentId'), 'api.js must check node.equipmentId for links');

// 5. Retaken Network Report Notifications
console.log('5. Checking retaken notifications for previous assignee...');
assert(ordenesJs.includes('broadcastNetworkOrderChange(order, \'retaken\', { prevAssigneeId, prevAssigneeName });'), 'ordenes.js must send previous assignee metadata on retake');
assert(commonJs.includes('retomó la atención del reporte que tenías asignado'), 'common.js must notify previous assignee specifically');
assert(!commonJs.includes('⏳') && !commonJs.includes('⏰'), 'common.js reminder titles must not contain emojis');
assert(!commonJs.includes('`Detalle concluido a conformidad${client ? \' (\' + client + \')\' : \'\'}.`'), 'common.js must not format (a) for client');

console.log('ALL TESTS PASSED: Network details typography, timeline, user colors, antenna-nodes & retaken notifications OK!');
