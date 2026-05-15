const SHEETS = {
  presupuestos: 'Presupuestos',
  detalle: 'Detalle_Presupuesto',
  historial: 'Historial_Estados'
};

function doGet(e) {
  setupSheets_();
  const action = e.parameter.action || 'health';
  let response;

  if (action === 'listPresupuestos') {
    response = { ok: true, records: listPresupuestos_() };
  } else {
    response = { ok: true, message: 'Nabrasa Apps Script activo' };
  }

  // Permite traer datos desde una web estática usando JSONP, evitando bloqueos CORS.
  if (e.parameter.callback) {
    return ContentService
      .createTextOutput(`${e.parameter.callback}(${JSON.stringify(response)})`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return jsonResponse(response);
}

function doPost(e) {
  try {
    setupSheets_();
    const action = e.parameter.action;
    const payload = JSON.parse(e.parameter.payload || '{}');

    if (action === 'setup') {
      return jsonResponse({ ok: true, message: 'Estructura creada/verificada' });
    }

    if (action === 'createPresupuesto') {
      createPresupuesto_(payload);
      return jsonResponse({ ok: true, message: 'Presupuesto guardado' });
    }

    if (action === 'updatePresupuesto') {
      updatePresupuesto_(payload);
      return jsonResponse({ ok: true, message: 'Presupuesto actualizado' });
    }

    return jsonResponse({ ok: false, message: 'Acción no reconocida' });
  } catch (err) {
    return jsonResponse({ ok: false, message: err.message });
  }
}

function setupSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet_(ss, SHEETS.presupuestos, [
    'id','numero','fecha','fechaCreacionIso','cliente','telefono','ciudad','direccion','totalUsd','totalUyu','dolar','estado',
    'fechaAprobado','fechaIngreso','fechaTerminado','fechaEntregado','fechaRechazado','sena','monedaPago','pagoTotal','observaciones','json'
  ]);
  ensureSheet_(ss, SHEETS.detalle, [
    'presupuestoId','numero','descripcion','medidas','cantidad','subtotalUsd','totalUsd','totalUyu','json'
  ]);
  ensureSheet_(ss, SHEETS.historial, [
    'presupuestoId','numero','estado','fecha','iso'
  ]);
}

function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) sh.appendRow(headers);
  const current = sh.getRange(1,1,1,headers.length).getValues()[0];
  if (current.join('|') !== headers.join('|')) sh.getRange(1,1,1,headers.length).setValues([headers]);
  sh.setFrozenRows(1);
}

function createPresupuesto_(r) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEETS.presupuestos);
  const existingRow = findRowById_(sh, r.id);
  const row = presupuestoRow_(r);
  if (existingRow) sh.getRange(existingRow, 1, 1, row.length).setValues([row]);
  else sh.appendRow(row);

  replaceDetalle_(r);
  appendEstado_(r, r.estado || 'Presupuestado');
}

function updatePresupuesto_(r) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEETS.presupuestos);
  const rowNum = findRowById_(sh, r.id);
  const row = presupuestoRow_(r);
  if (rowNum) sh.getRange(rowNum, 1, 1, row.length).setValues([row]);
  else sh.appendRow(row);
  replaceDetalle_(r);

  const hist = r.historialEstados || [];
  if (hist.length) appendEstado_(r, hist[hist.length - 1].estado, hist[hist.length - 1].fecha, hist[hist.length - 1].iso);
}

function presupuestoRow_(r) {
  return [
    r.id || '', r.numero || '', r.fecha || '', r.fechaCreacionIso || '', r.cliente || '', r.telefono || '', r.ciudad || '', r.direccion || '',
    r.totalUsd || 0, r.totalUyu || 0, r.dolar || 0, r.estado || 'Presupuestado',
    r.fechaAprobado || '', r.fechaIngreso || '', r.fechaTerminado || '', r.fechaEntregado || '', r.fechaRechazado || '',
    r.sena || '', r.monedaPago || '', r.pagoTotal || '', r.observaciones || '', JSON.stringify(r)
  ];
}

function replaceDetalle_(r) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEETS.detalle);
  const data = sh.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === r.id) sh.deleteRow(i + 1);
  }
  (r.items || []).forEach(item => {
    sh.appendRow([
      r.id || '', r.numero || '', item.descripcion || '', item.medidas || '', item.cantidad || 1,
      item.subtotalUsd || 0, item.totalUsd || 0, item.totalUyu || 0, JSON.stringify(item)
    ]);
  });
}

function appendEstado_(r, estado, fecha, iso) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEETS.historial);
  sh.appendRow([r.id || '', r.numero || '', estado || '', fecha || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy'), iso || new Date().toISOString()]);
}

function findRowById_(sh, id) {
  if (!id || sh.getLastRow() < 2) return null;
  const values = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().flat();
  const idx = values.findIndex(v => v === id);
  return idx === -1 ? null : idx + 2;
}

function listPresupuestos_() {
  setupSheets_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEETS.presupuestos);
  if (sh.getLastRow() < 2) return [];
  const values = sh.getRange(2, 22, sh.getLastRow() - 1, 1).getValues().flat();
  return values.filter(Boolean).map(v => JSON.parse(v)).reverse();
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
