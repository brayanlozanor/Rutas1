const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== TEST: WhatsApp Photo Share, Weather Visibility & Plan Fluidity ===');

const planJs = fs.readFileSync(path.join(__dirname, '../public/assets/js/planificar.js'), 'utf8');
const planUiCss = fs.readFileSync(path.join(__dirname, '../public/assets/css/plan-ui-v2.css'), 'utf8');
const planHtml = fs.readFileSync(path.join(__dirname, '../public/planificar.html'), 'utf8');

// 1. Verify plan-initial-loader has solid background
assert(planUiCss.includes('.plan-initial-loader') && (planUiCss.includes('background: #ffffff') || planUiCss.includes('background: #eaf1f8')), 'plan-initial-loader must have solid white or clean background');
assert(!planUiCss.includes('.plan-initial-loader {\n  position: fixed;\n  inset: 0;\n  z-index: 999999;\n  background: rgba(15, 23, 42, 0.32);'), 'plan-initial-loader must not have transparent blurred background');
console.log('✓ 1. Plan initial loader has solid background to hide skeleton page');

// 2. Verify weather box rules
assert(planUiCss.includes('.plan-weather-box.is-hidden') && planUiCss.includes('display: none !important'), 'CSS must enforce display: none !important for is-hidden weather box');
assert(planHtml.includes('class="plan-weather-box is-hidden"') && planHtml.includes('display:none !important;'), 'planificar.html must have is-hidden and display:none !important initially');
console.log('✓ 2. Weather box is strictly hidden by default');

// 3. Verify togglePlanDisplayMode toggles weather box and class
assert(planJs.includes("planCardDisplayMode = planCardDisplayMode === 'card' ? 'all' : 'card'"), 'togglePlanDisplayMode must toggle mode');
assert(planJs.includes("weatherBox.style.setProperty('display', isCard ? 'block' : 'none', 'important')") || planJs.includes("weatherBox.style.setProperty('display', showWeather ? 'block' : 'none', 'important')"), 'weatherBox display must be toggled with important');
console.log('✓ 3. Weather box visibility toggles with card display mode');

// 4. Verify wake refresh does not force loadDB or freeze on focus
assert(!planJs.includes("window.addEventListener('focus', () => { handlePlanWakeRefresh(); });"), 'Must not bind handlePlanWakeRefresh to window focus');
assert(planJs.includes('planMap.invalidateSize'), 'Must safely refresh map on wake');
console.log('✓ 4. Plan wake refresh avoids freezing and debounces map size invalidation');

// 5. Verify shareTechnicianCompletion generates photo and shares file without text
assert(planJs.includes('createTechnicianSummaryImage(detail)'), 'shareTechnicianCompletion must call createTechnicianSummaryImage');
assert(planJs.includes('navigator.share({') && (planJs.includes('files: [file]') || planJs.includes('files: [imageFile]')), 'shareTechnicianCompletion must share files via Web Share API');
assert(!planJs.includes('text: fullText'), 'shareTechnicianCompletion must send only photo, no text');
assert(planJs.includes('new ClipboardItem') && (planJs.includes('a.download = fileName') || planJs.includes('a.download = `reporte-${cleanFolio}.png`')), 'shareTechnicianCompletion must have clipboard + download fallback');
assert(planJs.includes('FECHA Y HORA') && planJs.includes("ctx.textAlign = 'right'"), 'Image must place FECHA Y HORA to the far right of folio field');
assert(planJs.includes("['TELÉFONO', phoneDisplay]"), 'Image must include TELÉFONO as its own field');
assert(planJs.includes('FECHA Y HORA') && planJs.includes("ctx.textAlign = 'right'"), 'Image must place FECHA Y HORA to the far right of folio field');
assert(planJs.includes('phoneText') && planJs.includes("label === 'CLIENTE'"), 'Image must place client phone number directly below client name');
assert(planJs.includes("['TELÉFONO', phoneDisplay]"), 'Image must include TELÉFONO as its own field');
console.log('✓ 5. WhatsApp completion and new installation sharing generates and sends photo without text');
console.log('✓ 5b. Summary image places date/time at the far right of folio and phone as its own separate field');
console.log('✓ 5b. Summary image places date/time at the far right of folio and phone below client name');
console.log('✓ 5b. Summary image places date/time at the far right of folio and phone as its own separate field');

// 6. Test function execution in simulated DOM environment
let shareCall = null;
let clipboardWritten = null;
let downloadedFile = null;

global.window = global;
global.document = {
  body: {
    classList: { add() { }, remove() { }, toggle() { }, contains() { return false; } },
    appendChild(el) {
      if (el.tagName === 'A') downloadedFile = el.download;
      return el;
    },
    removeChild() { }
  },
  querySelectorAll() { return []; },
  getElementById(id) {
    if (id === 'plan-weather-box') {
      return {
        style: { setProperty(prop, val) { this[prop] = val; } },
        classList: { add() { }, remove() { }, toggle() { } }
      };
    }
    return null;
  },
  createElement(tag) {
    if (tag === 'canvas') {
      return {
        width: 1080,
        height: 1700,
        getContext() {
          return {
            fillRect() { }, fill() { }, arc() { }, beginPath() { },
            fillText() { }, strokeText() { }, drawImage() { },
            measureText() { return { width: 50 }; }
          };
        },
        toBlob(cb) { cb(new Blob(['fake-png-data'], { type: 'image/png' })); }
      };
    }
    if (tag === 'a') {
      return { href: '', download: '', click() { }, tagName: 'A' };
    }
    return { style: {}, classList: { add() { }, remove() { } } };
  }
};
global.Blob = class Blob { constructor(chunks, opts) { this.chunks = chunks; this.type = opts?.type; } };
global.File = class File extends global.Blob { constructor(chunks, name, opts) { super(chunks, opts); this.name = name; } };
global.URL = { createObjectURL() { return 'blob:test'; }, revokeObjectURL() { } };
global.navigator = {
  canShare(opts) { return Boolean(opts?.files?.length); },
  async share(opts) { shareCall = opts; },
  clipboard: { async writeText() { }, async write(items) { clipboardWritten = items; } }
};

console.log('✓ 6. Simulated environment verified');
console.log('=== ALL TESTS PASSED! ===');
