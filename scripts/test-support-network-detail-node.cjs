const assert = require('node:assert/strict');
const fs = require('node:fs');

const ordenesJs = fs.readFileSync('public/assets/js/ordenes.js', 'utf8');

console.log('Testing Support Network Detail Pueblo Field & Persistence...');

// 1. In applyRoleFormVisibility under targetIsAttention: nodeGrid and nodeFi must be displayed and required
assert.match(ordenesJs, /if \(targetIsAttention\) \{[\s\S]*?if \(nodeGrid\) \{[\s\S]*?nodeGrid\.style\.display = '';/);
assert.match(ordenesJs, /if \(targetIsAttention\) \{[\s\S]*?if \(nodeFi\) \{[\s\S]*?nodeFi\.style\.display = '';/);
assert.match(ordenesJs, /if \(targetIsAttention\) \{[\s\S]*?nLabel\.innerHTML = 'Pueblo vinculado <b class="req-star">\* Obligatorio<\/b>'/);

// 2. In saveWO: validation for targetIsAttention must require pueblo
assert.match(ordenesJs, /\} else if \(targetIsAttention\) \{[\s\S]*?if \(!typedNode\) return showWOFieldError\('wo-node'/);
assert.match(ordenesJs, /\} else if \(targetIsAttention\) \{[\s\S]*?if \(!node\) return showWOFieldError\('wo-node'/);

// 3. In saveWO payload: nodeId, nodeCode, nodeName, town must be preserved from the node, not wiped
assert.match(ordenesJs, /nodeId: node\?\.id \|\| '',/);
assert.match(ordenesJs, /town: node\?\.town \|\| typedNode \|\| '',/);
assert.match(ordenesJs, /nodeName: node \? getNodeLabel\(node\) : typedNode,/);

console.log('ALL TESTS PASSED: Support Network Detail Pueblo Field & Persistence OK!');
