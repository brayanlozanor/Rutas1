const fs = require('fs');
const vm = require('vm');
const { TextDecoder } = require('util');

const source = fs.readFileSync('public/assets/js/common.js', 'utf8');
const match = source.match(/function repairDisplayText[\s\S]*?\n}\n/);
if (!match) throw new Error('Missing repairDisplayText');

const context = { Map, TextDecoder, Uint8Array };
vm.createContext(context);
vm.runInContext(`${match[0]}; this.repair = repairDisplayText;`, context);

const cases = [
  ['SAN JOS\u00c3\u2030 TASAJERAS', 'SAN JOSÉ TASAJERAS'],
  ['-62 dBm \u00ce\u201d 11 dBm', '-62 dBm Δ 11 dBm'],
  ['-62 dBm \u00ee\u201d 11 dBm', '-62 dBm Δ 11 dBm'],
  ['Jos\u00c3\u0192\u00c2\u00a9', 'José'],
  ['José · Δ 11 dBm', 'José · Δ 11 dBm']
];

for (const [input, expected] of cases) {
  const actual = context.repair(input);
  if (actual !== expected) throw new Error(`${JSON.stringify(input)} => ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
}

console.log('UTF-8/Windows-1252 display repair: OK');
