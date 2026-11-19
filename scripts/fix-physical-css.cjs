const fs = require('fs');
const path = require('path');

function cleanCSSFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  // Remove `body.orders-page[data-detail-kind="physical"] .order-reopen-action,`
  const target1 = 'body.orders-page[data-detail-kind="physical"] .order-reopen-action,\r\n';
  const target2 = 'body.orders-page[data-detail-kind="physical"] .order-reopen-action,\n';
  if (content.includes(target1)) {
    content = content.replace(target1, '');
    console.log(`✓ Removed .order-reopen-action hide from ${path.basename(filePath)} (CRLF)`);
  } else if (content.includes(target2)) {
    content = content.replace(target2, '');
    console.log(`✓ Removed .order-reopen-action hide from ${path.basename(filePath)} (LF)`);
  } else {
    console.log(`No .order-reopen-action found in ${path.basename(filePath)}`);
  }

  // Ensure style for .order-complete-action exists
  if (!content.includes('.orders-page .order-actions .order-complete-action')) {
    const completeCss = `
.orders-page .order-actions .order-complete-action {
  border-color: #a7f3d0 !important;
  background: #ecfdf5 !important;
  color: #059669 !important;
}

.orders-page .order-actions .order-complete-action:hover {
  background: #d1fae5 !important;
  color: #047857 !important;
}
`;
    content += completeCss;
    console.log(`✓ Added .order-complete-action style to ${path.basename(filePath)}`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

cleanCSSFile(path.join(__dirname, '..', 'public', 'assets', 'css', 'detail-view-toggle.css'));
cleanCSSFile(path.join(__dirname, '..', 'public', 'assets', 'css', 'orders-design-v2.css'));
console.log('CSS files updated successfully.');
