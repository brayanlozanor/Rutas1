const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const js = fs.readFileSync('public/assets/js/ordenes.js', 'utf8');
const css = fs.readFileSync('public/assets/css/orders-design-v2.css', 'utf8');

// 1. Verify fixed bottom dock structure & CSS
assert.ok(js.includes('class="order-chat-scroll-body"'), 'Chat modal must wrap scrollable area in .order-chat-scroll-body');
assert.ok(js.includes('class="order-chat-fixed-bottom"'), 'Chat modal must place composer and footer actions inside .order-chat-fixed-bottom');
assert.ok(css.includes('.order-tech-report-card.is-network-chat-card > .order-chat-fixed-bottom'), 'CSS must pin .order-chat-fixed-bottom at bottom');
assert.ok(css.includes('.order-turn-divider-row.is-my_action') && css.includes('.order-turn-divider-row.is-other_area'), 'CSS must style turn dividers');

// 2. Verify sorting & turn grouping for both Atención and Soporte
let role = 'atencion_clientes';
const ctx = {
  getOrderDetailKind: o => o.detailKind || 'physical',
  userHasRole: (...roles) => roles.includes(role),
  isNetworkSupportToAttention: o => Boolean(o.toAttention),
  getOrderAssignedAreaRole: o => o.assignedArea || '',
  getOrderPendingUserAction: o => {
    if (o.status === 'completada') return { requiresMyAction: false, waitingOther: false };
    if (o.status === 'resuelto_soporte') {
      const myTurn = o.toAttention ? role === 'soporte' : role === 'atencion_clientes';
      return { requiresMyAction: myTurn, waitingOther: !myTurn };
    }
    return { requiresMyAction: false, waitingOther: false };
  }
};
vm.createContext(ctx);
const start = js.indexOf('function getNetworkOrderTurnGroup(');
const end = js.indexOf('function getOrderPriorityRank(');
vm.runInContext(js.slice(start, end), ctx);

const orders = [
  { id: 'done-1', detailKind: 'network', status: 'completada' },
  { id: 'for-sop-pending', detailKind: 'network', status: 'pendiente', toAttention: false },
  { id: 'for-ate-confirm', detailKind: 'network', status: 'resuelto_soporte', toAttention: false },
  { id: 'for-ate-active', detailKind: 'network', status: 'pendiente', toAttention: true }
];

// As Atención: confirm & active-for-ate MUST be my_action (top), for-sop-pending MUST be other_area (middle), done MUST be last
role = 'atencion_clientes';
const sortedAte = orders.slice().sort((a, b) => ctx.getOrderLifecycleRank(a) - ctx.getOrderLifecycleRank(b));
assert.strictEqual(sortedAte[0].id, 'for-ate-confirm', 'Atención confirmation must be #1 at very top');
assert.strictEqual(sortedAte[1].id, 'for-ate-active', 'Atención active task must be #2 in my_action');
assert.strictEqual(sortedAte[2].id, 'for-sop-pending', 'Support pending task must be below divider in other_area');
assert.strictEqual(sortedAte[3].id, 'done-1', 'Completed must be last');
assert.strictEqual(ctx.getNetworkOrderTurnGroup(sortedAte[0]).group, 'my_action');
assert.strictEqual(ctx.getNetworkOrderTurnGroup(sortedAte[1]).group, 'my_action');
assert.strictEqual(ctx.getNetworkOrderTurnGroup(sortedAte[2]).group, 'other_area');
assert.strictEqual(ctx.getNetworkOrderTurnGroup(sortedAte[3]).group, 'done');

// As Soporte: for-sop-pending MUST be my_action (top), while for-ate-confirm & for-ate-active MUST be other_area
role = 'soporte';
const sortedSop = orders.slice().sort((a, b) => ctx.getOrderLifecycleRank(a) - ctx.getOrderLifecycleRank(b));
assert.strictEqual(sortedSop[0].id, 'for-sop-pending', 'Soporte active task must be #1 at top');
assert.strictEqual(ctx.getNetworkOrderTurnGroup(sortedSop[0]).group, 'my_action');
assert.strictEqual(ctx.getNetworkOrderTurnGroup(sortedSop[1]).group, 'other_area');
assert.strictEqual(ctx.getNetworkOrderTurnGroup(sortedSop[2]).group, 'other_area');
assert.strictEqual(ctx.getNetworkOrderTurnGroup(sortedSop[3]).group, 'done');

console.log('✓ NETWORK TURN DIVIDER SORTING & FIXED CHAT BOTTOM VERIFIED 100%!');
