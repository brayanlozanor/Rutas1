const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'js', 'ordenes.js'), 'utf8');
const lines = content.split('\n');

lines.forEach((l, idx) => {
  if (l.includes("currentDetailKind === 'physical'") || 
      l.includes("currentDetailKind === 'network'") || 
      l.includes("applyOrderDetailKindView") || 
      l.includes("selectOrderDetailKind") ||
      l.includes("isPhysicalDetail") ||
      l.includes("isNetworkDetail") ||
      l.includes("renderOrderDetailModal")) {
    console.log(`${idx + 1}: ${l.trim().substring(0, 100)}`);
  }
});
