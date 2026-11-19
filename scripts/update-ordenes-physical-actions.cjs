const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'assets', 'js', 'ordenes.js');
let content = fs.readFileSync(filePath, 'utf8');

const target = "<button class=\"btn order-view-report\" title=\"Ver registro físico\" aria-label=\"Ver registro físico\" onclick=\"openOrderTechnicianReport('${w.id}')\">${orderActionIcon('view')}</button>";
const fullPhysicalBlockStart = content.indexOf(target);
console.log('Found target at index:', fullPhysicalBlockStart);

const endSearch = "`}</td>"; // or end of cell
const afterTarget = content.slice(fullPhysicalBlockStart, fullPhysicalBlockStart + 800);
console.log('After target snippet:\n', afterTarget);

// Let's replace from `order-view-report` up to before `\n                    `}`
const blockToReplace = afterTarget.slice(0, afterTarget.indexOf('`}\r\n                  </div>'));
console.log('Exact block to replace:\n', JSON.stringify(blockToReplace));

const replacement = `<button class="btn order-view-report" title="Ver registro físico" aria-label="Ver registro físico" onclick="openOrderTechnicianReport('\${w.id}')">\${orderActionIcon('view')}</button>
                      \${canEditOrder(w) ? \`
                        <button class="btn order-edit-action" title="Editar información del registro físico" aria-label="Editar información del registro físico" onclick="openWO('\${w.id}')">\${orderActionIcon('edit')}</button>
                      \` : \`
                        <button class="btn order-edit-action order-edit-disabled" disabled style="opacity:0.35;cursor:not-allowed;" title="Solo quien creó el detalle puede editarlo" aria-label="Solo quien creó el detalle puede editarlo">\${orderActionIcon('edit')}</button>
                      \`}
                      \${rowReported ? (canReopen ? \`
                        <button class="btn order-reopen-action" title="Reabrir detalle para nueva atención" aria-label="Reabrir detalle para nueva atención" onclick="event.stopPropagation();reopenCompletedWO('\${w.id}')">\${orderActionIcon('reopen')}</button>
                      \` : \`
                        <button class="btn order-reopen-action order-reopen-disabled" disabled style="opacity:0.35;cursor:not-allowed;" title="No tienes permiso para reabrir este detalle" aria-label="No tienes permiso para reabrir este detalle">\${orderActionIcon('reopen')}</button>
                      \`) : \`
                        <button class="btn order-complete-action" style="border-color:#a7f3d0!important;background:#ecfdf5!important;color:#059669!important;" title="Completar registro físico" aria-label="Completar registro físico" onclick="event.stopPropagation();markWODone('\${w.id}')">\${orderActionIcon('complete')}</button>
                      \`}
                      <button class="btn order-delete-action" title="\${userHasRole('administrador', 'admin') ? 'Eliminar registro definitivamente' : 'Solicitar eliminación del detalle'}" aria-label="\${userHasRole('administrador', 'admin') ? 'Eliminar registro definitivamente' : 'Solicitar eliminación del detalle'}" onclick="deleteWO('\${w.id}')">\${orderActionIcon('delete')}</button>
                    `;

content = content.replace(blockToReplace, replacement.replace(/\n/g, '\r\n'));
fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Successfully updated ordenes.js physical buttons!');
