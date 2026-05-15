const $ = (id) => document.getElementById(id);
let items = [];
let presupuestoN = Number(localStorage.getItem("nabrasa_seq")) || 1;
let presupuestoGuardadoActual = null;

function fmtUsd(n) { return `USD ${NabrasaCalc.round2(n).toLocaleString("es-UY")}`; }
function fmtUyu(n) { return `$ ${Math.round(n).toLocaleString("es-UY")}`; }
function numeroActual() { return presupuestoGuardadoActual?.numero || `NB-${String(presupuestoN).padStart(4, "0")}`; }
function todayUY() { return new Date().toLocaleDateString("es-UY"); }
function nowIso() { return new Date().toISOString(); }

function getHistorialLocal() { return JSON.parse(localStorage.getItem("nabrasa_historial") || "[]"); }
function setHistorialLocal(data) { localStorage.setItem("nabrasa_historial", JSON.stringify(data)); }
function getAppsScriptUrl() { return window.NABRASA_CONFIG.appsScriptUrl || ""; }

function setDollarPillStatus(texto) {
  const pill = $("dolarTexto");
  if (pill) pill.title = texto || "";
}

async function actualizarDolarOnlineDelDia() {
  if (!window.NabrasaCalc || NabrasaCalc.tieneDolarManualHoy()) {
    setDollarPillStatus("Dólar modificado manualmente para el día de hoy.");
    return;
  }

  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Montevideo" });
  const autoFecha = localStorage.getItem("nabrasa_dolar_auto_fecha");
  const autoValor = Number(localStorage.getItem("nabrasa_dolar_auto_valor"));
  if (autoFecha === hoy && autoValor > 0) {
    setDollarPillStatus("Dólar online del día ya cargado.");
    return;
  }

  try {
    const res = await fetch(window.NABRASA_CONFIG.dolarApiUrl, { cache: "no-store" });
    if (!res.ok) throw new Error("No se pudo consultar la cotización online");
    const data = await res.json();
    const valor = Number(data.venta || data.promedio || data.valor || data.compra);
    if (!valor || valor <= 0) throw new Error("La API no devolvió un valor válido");
    NabrasaCalc.setDolarOnline(valor);
    localStorage.setItem("nabrasa_dolar_online_actualizado", data.fechaActualizacion || new Date().toISOString());
    setDollarPillStatus(`Dólar online cargado automáticamente. Última actualización: ${data.fechaActualizacion || "hoy"}.`);
  } catch (error) {
    console.warn("No se pudo actualizar el dólar online", error);
    setDollarPillStatus("No se pudo consultar el dólar online. Se usa el último valor guardado.");
  }
}

function invalidarGuardadoActual() {
  presupuestoGuardadoActual = null;
}

function avanzarNumeroPresupuesto() {
  presupuestoN += 1;
  localStorage.setItem("nabrasa_seq", presupuestoN);
}

function aplicarTema(theme) {
  const tema = theme === "light" ? "light" : "dark";
  document.body.dataset.theme = tema;
  localStorage.setItem("nabrasa_theme", tema);
  const btn = $("btnTheme");
  if (btn) { btn.textContent = tema === "light" ? "🌙" : "☀️"; btn.title = tema === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"; }
}

function alternarTema() {
  const actual = document.body.dataset.theme === "light" ? "light" : "dark";
  aplicarTema(actual === "light" ? "dark" : "light");
}

function leerDatosProducto() {
  return {
    tipo: $("productoTipo").value,
    cantidad: Number($("cantidad").value) || 1,
    frente: Number($("frente").value) || 0,
    profundidad: Number($("profundidad").value) || 0,
    patas: Number($("patas").value) || 0,
    separacion: Number($("separacion").value) || 15,
    materialMarco: $("materialMarco") ? $("materialMarco").value : "marco_inox_30x30_12",
    materialEmparrillado: $("materialEmparrillado") ? $("materialEmparrillado").value : "cano_inox_95_12",
    altura: Number($("altura").value) || 0,
    alturaPatas: Number($("alturaPatas").value) || 0,
    largueros: Number($("largueros").value) || 0,
    manualDescripcion: $("manualDescripcion").value,
    manualPrecioModo: $("manualPrecioModo") ? $("manualPrecioModo").value : "auto",
    manualUsd: Number($("manualUsd").value) || 0,
    notas: $("productoNotas").value.trim()
  };
}

function descripcionItem(datos) {
  if (datos.tipo === "manual") {
    const item = window.NABRASA_CONFIG.itemsManuales.find(x => x.id === datos.manualDescripcion);
    if (datos.manualDescripcion === "personalizado" && datos.notas) return datos.notas;
    let base = item ? item.nombre : "Ítem manual";
    if (datos.notas && datos.manualDescripcion !== "personalizado") base += ` - ${datos.notas}`;
    return base;
  }
  let base = NabrasaCalc.nombreProducto(datos.tipo);
  if (datos.notas) base += ` - ${datos.notas}`;
  return base;
}

function medidasItem(datos) {
  if (datos.tipo === "manual") return "-";
  return `${datos.frente}x${datos.profundidad}`;
}

function actualizarCampos() {
  const tipo = $("productoTipo").value;
  const isManual = tipo === "manual";
  const isQuemador = tipo === "quemadorInox" || tipo === "quemadorHierro";
  $("camposCalculados").classList.toggle("hidden", isManual);
  $("camposManual").classList.toggle("hidden", !isManual);
  document.querySelectorAll(".campo-parrilla").forEach(el => el.classList.toggle("hidden", isManual || isQuemador));
  document.querySelectorAll(".campo-quemador").forEach(el => el.classList.toggle("hidden", !isQuemador));
  actualizarPrecioManual();
  actualizarPreview();
}

function actualizarPreview() {
  const datos = leerDatosProducto();
  const calc = NabrasaCalc.calcularItem(datos.tipo, datos);
  const total = calc.totalUsd * datos.cantidad;
  $("previewTotal").textContent = fmtUsd(total);
  $("previewPesos").textContent = fmtUyu(total * NabrasaCalc.getDolar());
  $("dolarTexto").textContent = NabrasaCalc.getDolar().toLocaleString("es-UY", { maximumFractionDigits: 4 });
}

function agregarItem() {
  invalidarGuardadoActual();
  const datos = leerDatosProducto();
  const calc = NabrasaCalc.calcularItem(datos.tipo, datos);
  items.push({
    id: crypto.randomUUID(),
    descripcion: descripcionItem(datos),
    medidas: medidasItem(datos),
    cantidad: datos.cantidad,
    subtotalUsd: calc.totalUsd,
    totalUsd: NabrasaCalc.round2(calc.totalUsd * datos.cantidad),
    totalUyu: Math.round(calc.totalUsd * datos.cantidad * NabrasaCalc.getDolar()),
    datos,
    calc
  });
  render();
}

function quitarItem(id) {
  invalidarGuardadoActual();
  items = items.filter(x => x.id !== id);
  render();
}

function render() {
  $("presupuestoNumero").textContent = numeroActual();
  $("pdfFecha").textContent = todayUY();
  $("pdfCliente").textContent = $("clienteNombre").value || "Sin cliente";
  $("pdfTelefono").textContent = $("clienteTelefono").value || "Sin contacto";
  $("pdfCiudad").textContent = $("clienteCiudad").value || "Sin ciudad";

  const tbody = $("itemsTabla");
  tbody.innerHTML = "";
  if (!items.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Todavía no agregaste productos.</td></tr>';
  } else {
    items.forEach(item => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.descripcion}</td>
        <td>${item.medidas}</td>
        <td>${item.cantidad}</td>
        <td>${fmtUsd(item.subtotalUsd)}</td>
        <td>${fmtUsd(item.totalUsd)}</td>
        <td class="screen-only"><button class="remove-btn" data-id="${item.id}">X</button></td>`;
      tbody.appendChild(tr);
    });
  }
  const totalUsd = items.reduce((a, b) => a + b.totalUsd, 0);
  $("totalUsd").textContent = fmtUsd(totalUsd);
  $("totalUyu").textContent = fmtUyu(totalUsd * NabrasaCalc.getDolar());

  document.querySelectorAll(".remove-btn").forEach(btn => btn.addEventListener("click", () => quitarItem(btn.dataset.id)));
}

function crearRegistroPresupuesto() {
  const totalUsd = items.reduce((a, b) => a + b.totalUsd, 0);
  return {
    id: crypto.randomUUID(),
    numero: numeroActual(),
    fecha: todayUY(),
    fechaCreacionIso: nowIso(),
    cliente: $("clienteNombre").value || "Sin cliente",
    telefono: $("clienteTelefono").value || "",
    ciudad: $("clienteCiudad").value || "",
    direccion: $("clienteDireccion").value || "",
    totalUsd: NabrasaCalc.round2(totalUsd),
    totalUyu: Math.round(totalUsd * NabrasaCalc.getDolar()),
    dolar: NabrasaCalc.getDolar(),
    estado: "Presupuestado",
    fechaAprobado: "",
    fechaIngreso: "",
    fechaTerminado: "",
    fechaEntregado: "",
    fechaRechazado: "",
    sena: "",
    monedaPago: "USD",
    pagoTotal: "",
    observaciones: "",
    items: structuredClone(items),
    historialEstados: [{ estado: "Presupuestado", fecha: todayUY(), iso: nowIso() }]
  };
}

async function enviarRegistroAGoogleSheet(registro) {
  const url = getAppsScriptUrl();
  if (!url) return { ok: false, skipped: true };
  const body = new URLSearchParams();
  body.set("action", "createPresupuesto");
  body.set("payload", JSON.stringify(registro));

  // Apps Script suele bloquear la lectura directa por CORS desde sitios estáticos.
  // Usamos no-cors para guardar de forma estable; si no explota, asumimos enviado.
  await fetch(url, { method: "POST", body, mode: "no-cors" });
  return { ok: true, opaque: true };
}

async function guardarPresupuesto(opciones = {}) {
  const { limpiarDespues = true, mostrarAlerta = true } = opciones;

  if (!items.length) {
    if (mostrarAlerta) alert("Agregá al menos un producto.");
    return null;
  }

  if (presupuestoGuardadoActual) {
    const registroExistente = presupuestoGuardadoActual;
    if (limpiarDespues) {
      presupuestoGuardadoActual = null;
      items = [];
      render();
    }
    if (mostrarAlerta) alert("Este presupuesto ya estaba guardado.");
    return registroExistente;
  }

  const registro = crearRegistroPresupuesto();
  const historial = getHistorialLocal();
  historial.unshift(registro);
  setHistorialLocal(historial);

  let remoto = { skipped: true };
  try {
    remoto = await enviarRegistroAGoogleSheet(registro);
  } catch (error) {
    console.warn("No se pudo guardar en Google Sheets", error);
  }

  presupuestoGuardadoActual = registro;
  avanzarNumeroPresupuesto();

  if (limpiarDespues) {
    presupuestoGuardadoActual = null;
    items = [];
  }
  render();

  const msg = remoto && remoto.ok
    ? "Presupuesto guardado en historial local y enviado a Google Sheets."
    : "Presupuesto guardado en historial local. No se pudo enviar a Google Sheets.";
  if (mostrarAlerta) alert(msg);
  return registro;
}

async function descargarPdfYGuardar() {
  const registro = await guardarPresupuesto({ limpiarDespues: false, mostrarAlerta: false });
  if (!registro) return;
  await descargarPresupuestoPDF(registro.numero);
}

async function enviarWhatsappYGuardar() {
  const registro = await guardarPresupuesto({ limpiarDespues: false, mostrarAlerta: false });
  if (!registro) return;
  enviarWhatsapp(registro.numero);
}

function enviarWhatsapp(numero = numeroActual()) {
  const totalUsd = items.reduce((a, b) => a + b.totalUsd, 0);
  const msg = `Presupuesto ${numero} - Nabrasa%0ACliente: ${$("clienteNombre").value || "Sin cliente"}%0ATotal: ${fmtUsd(totalUsd)} / ${fmtUyu(totalUsd * NabrasaCalc.getDolar())}`;
  window.open(`https://wa.me/?text=${msg}`, "_blank");
}

function guardarConfig() {
  NabrasaCalc.setDolarManual($("cfgDolar").value || window.NABRASA_CONFIG.dolarDefault);
  setDollarPillStatus("Dólar modificado manualmente para el día de hoy. Mañana volverá a actualizarse online.");
  actualizarPreview();
  render();
}

function cargarSelectItemsManuales() {
  const select = $("manualDescripcion");
  select.innerHTML = window.NABRASA_CONFIG.itemsManuales
    .map(item => `<option value="${item.id}">${item.nombre}</option>`)
    .join("");
  actualizarPrecioManual();
}

function actualizarPrecioManual() {
  const select = $("manualDescripcion");
  const precio = $("manualUsd");
  const modo = $("manualPrecioModo");
  if (!select || !precio || !modo) return;
  const item = window.NABRASA_CONFIG.itemsManuales.find(x => x.id === select.value);
  if (modo.value === "auto" && item) precio.value = item.precioUsd;
  precio.readOnly = modo.value === "auto";
}

function cargarSelectMateriales() {
  const cfg = window.NABRASA_CONFIG.materialesParrilla;
  const cargar = (id, lista, defaultId) => {
    const select = $(id);
    select.innerHTML = lista.map(m => `<option value="${m.id}" ${m.id === defaultId ? "selected" : ""}>${m.nombre}</option>`).join("");
  };
  cargar("materialMarco", cfg.marco, "marco_inox_30x30_12");
  cargar("materialEmparrillado", cfg.emparrillado, "cano_inox_95_12");
}

window.addEventListener("DOMContentLoaded", async () => {
  aplicarTema(localStorage.getItem("nabrasa_theme") || "dark");
  await actualizarDolarOnlineDelDia();
  cargarSelectMateriales();
  cargarSelectItemsManuales();
  ["productoTipo", "cantidad", "frente", "profundidad", "patas", "separacion", "materialMarco", "materialEmparrillado", "altura", "alturaPatas", "largueros", "manualUsd", "productoNotas"].forEach(id => $(id).addEventListener("input", actualizarPreview));
  ["manualDescripcion", "manualPrecioModo"].forEach(id => $(id).addEventListener("change", () => { actualizarPrecioManual(); actualizarPreview(); }));
  $("productoTipo").addEventListener("change", actualizarCampos);
  ["clienteNombre", "clienteTelefono", "clienteCiudad", "clienteDireccion"].forEach(id => $(id).addEventListener("input", () => { invalidarGuardadoActual(); render(); }));
  $("btnAgregar").addEventListener("click", agregarItem);
  $("btnVaciar").addEventListener("click", () => { invalidarGuardadoActual(); items = []; render(); });
  $("btnPdf").addEventListener("click", descargarPdfYGuardar);
  $("btnGuardarLocal").addEventListener("click", guardarPresupuesto);
  $("btnTheme").addEventListener("click", alternarTema);
  $("btnConfig").addEventListener("click", () => { $("cfgDolar").value = NabrasaCalc.getDolar(); $("configDialog").showModal(); });
  $("btnGuardarConfig").addEventListener("click", guardarConfig);
  const navToggle = $("btnNavToggle");
  const topActions = $("topActions");
  if (navToggle && topActions) navToggle.addEventListener("click", () => {
    const open = topActions.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  $("btnLimpiarProducto").addEventListener("click", () => { $("productoNotas").value = ""; actualizarPreview(); });
  actualizarCampos();
  render();
});
