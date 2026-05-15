const $ = (id) => document.getElementById(id);
let seleccionadoId = null;

const estados = [
  "Presupuestado",
  "A confirmar",
  "Aprobado",
  "Ingresado a taller",
  "En producción",
  "Terminado",
  "Entregado",
  "Rechazado",
  "Cancelado"
];

const fechasPorEstado = {
  "Aprobado": "fechaAprobado",
  "Ingresado a taller": "fechaIngreso",
  "Terminado": "fechaTerminado",
  "Entregado": "fechaEntregado",
  "Rechazado": "fechaRechazado"
};

function fmtUsd(n) { return `USD ${Number(n || 0).toLocaleString("es-UY")}`; }
function todayUY() { return new Date().toLocaleDateString("es-UY"); }
function nowIso() { return new Date().toISOString(); }
function getHistorialLocal() { return JSON.parse(localStorage.getItem("nabrasa_historial") || "[]"); }
function setHistorialLocal(data) { localStorage.setItem("nabrasa_historial", JSON.stringify(data)); }
function getAppsScriptUrl() { return window.NABRASA_CONFIG.appsScriptUrl || ""; }

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

function fechaClave(r) {
  if (r.estado === "Entregado") return r.fechaEntregado || r.fecha || "";
  if (r.estado === "Terminado") return r.fechaTerminado || r.fecha || "";
  if (r.estado === "Ingresado a taller") return r.fechaIngreso || r.fecha || "";
  if (r.estado === "Aprobado") return r.fechaAprobado || r.fecha || "";
  if (r.estado === "Rechazado") return r.fechaRechazado || r.fecha || "";
  return r.fecha || "";
}


function telefonoWhatsapp(telefono) {
  let digits = String(telefono || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("598")) return digits;
  if (digits.startsWith("0")) return `598${digits.slice(1)}`;
  if (digits.length === 8 || digits.length === 9) return `598${digits}`;
  return digits;
}

function textoWhatsappRegistro(r) {
  const items = (r.items || [])
    .map(i => `• ${i.descripcion || "Producto"}${i.medidas && i.medidas !== "-" ? ` ${i.medidas}` : ""} - ${fmtUsd(i.totalUsd || 0)}`)
    .join("\n");
  return [
    `Presupuesto ${r.numero || ""} - Nabrasa`,
    `Cliente: ${r.cliente || "Sin cliente"}`,
    `Total: ${fmtUsd(r.totalUsd || 0)} / $ ${(r.totalUyu || 0).toLocaleString("es-UY")}`,
    items ? "" : null,
    items || null,
    "",
    "Quedamos a disposición."
  ].filter(v => v !== null).join("\n");
}

function enviarWhatsappRegistro(id) {
  const registro = getHistorialLocal().find(r => r.id === id);
  if (!registro) return alert("No encontré ese presupuesto en el historial local.");
  const phone = telefonoWhatsapp(registro.telefono);
  const text = encodeURIComponent(textoWhatsappRegistro(registro));
  const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
  window.open(url, "_blank");
}

async function descargarPdfRegistro(id = seleccionadoId) {
  const registro = getHistorialLocal().find(r => r.id === id);
  if (!registro) return alert("Seleccioná un presupuesto para descargar el PDF.");
  await descargarPresupuestoRegistroPDF(registro);
}

function filtrar(historial) {
  const texto = ($("filtroTexto").value || "").toLowerCase().trim();
  const estado = $("filtroEstado").value;
  return historial.filter(r => {
    const matchEstado = !estado || r.estado === estado;
    const base = `${r.numero} ${r.cliente} ${r.telefono} ${r.ciudad}`.toLowerCase();
    const matchTexto = !texto || base.includes(texto);
    return matchEstado && matchTexto;
  });
}

function renderTabla() {
  const historial = getHistorialLocal();
  const data = filtrar(historial);
  const tbody = $("historialTabla");
  const mobile = $("historialMobile");

  tbody.innerHTML = data.length ? "" : '<tr><td colspan="8">Sin registros para mostrar.</td></tr>';
  if (mobile) mobile.innerHTML = data.length ? "" : '<div class="mobile-empty">Sin registros para mostrar.</div>';

  data.forEach((r) => {
    const tr = document.createElement("tr");
    tr.className = r.id === seleccionadoId ? "selected-row" : "";
    tr.innerHTML = `
      <td data-label="Nº">${r.numero}</td>
      <td data-label="Cliente">${r.cliente || "Sin cliente"}</td>
      <td data-label="Contacto">${r.telefono || "-"}</td>
      <td data-label="Ciudad">${r.ciudad || "-"}</td>
      <td data-label="Total">${fmtUsd(r.totalUsd)}</td>
      <td data-label="Estado"><span class="status-pill">${r.estado || "Presupuestado"}</span></td>
      <td data-label="Fecha">${fechaClave(r)}</td>
      <td data-label="Acción">
        <div class="row-actions">
          <button class="btn secondary mini" data-id="${r.id}">Editar</button>
          <button class="btn secondary mini icon-action" data-wpp-id="${r.id}" title="Enviar por WhatsApp">WhatsApp</button>
        </div>
      </td>`;
    tbody.appendChild(tr);

    if (mobile) {
      const card = document.createElement("article");
      card.className = `mobile-record ${r.id === seleccionadoId ? "is-open" : ""}`;
      card.innerHTML = `
        <button class="mobile-record-head" type="button" data-toggle-id="${r.id}">
          <span>
            <strong>${r.numero}</strong>
            <small>${r.cliente || "Sin cliente"}</small>
          </span>
          <span class="mobile-record-meta">
            <b>${fmtUsd(r.totalUsd)}</b>
            <i>${r.id === seleccionadoId ? "−" : "+"}</i>
          </span>
        </button>
        <div class="mobile-record-body">
          <div><span>Contacto</span><strong>${r.telefono || "-"}</strong></div>
          <div><span>Ciudad</span><strong>${r.ciudad || "-"}</strong></div>
          <div><span>Estado</span><strong>${r.estado || "Presupuestado"}</strong></div>
          <div><span>Fecha clave</span><strong>${fechaClave(r) || "-"}</strong></div>
          <div class="mobile-record-actions">
            <button class="btn secondary mobile-edit" data-id="${r.id}">Editar seguimiento</button>
            <button class="btn secondary mobile-wpp" data-wpp-id="${r.id}">WhatsApp</button>
          </div>
        </div>
      `;
      mobile.appendChild(card);
    }
  });

  tbody.querySelectorAll("button[data-id]").forEach(btn => btn.addEventListener("click", () => seleccionar(btn.dataset.id)));
  tbody.querySelectorAll("button[data-wpp-id]").forEach(btn => btn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    enviarWhatsappRegistro(btn.dataset.wppId);
  }));
  if (mobile) {
    mobile.querySelectorAll("[data-toggle-id]").forEach(btn => btn.addEventListener("click", () => {
      const id = btn.dataset.toggleId;
      seleccionadoId = seleccionadoId === id ? null : id;
      renderTabla();
      renderDetalle();
    }));
    mobile.querySelectorAll("button[data-id]").forEach(btn => btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      seleccionar(btn.dataset.id);
      const panel = $("detallePanel");
      if (panel && window.matchMedia("(max-width: 760px)").matches) panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
    mobile.querySelectorAll("button[data-wpp-id]").forEach(btn => btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      enviarWhatsappRegistro(btn.dataset.wppId);
    }));
  }
}

function seleccionar(id) {
  seleccionadoId = id;
  renderTabla();
  renderDetalle();
}

function renderDetalle() {
  const registro = getHistorialLocal().find(r => r.id === seleccionadoId);
  const cont = $("detalleContenido");
  if (!registro) {
    $("detalleTitulo").textContent = "Seleccioná un presupuesto";
    cont.className = "detail-empty";
    cont.textContent = "Elegí una fila para editar datos, cambiar estado o revisar productos.";
    return;
  }

  $("detalleTitulo").textContent = `${registro.numero} · ${registro.cliente || "Sin cliente"}`;
  cont.className = "detail-content";
  cont.innerHTML = `
    <div class="detail-summary">
      <strong>${fmtUsd(registro.totalUsd)}</strong>
      <span>$ ${(registro.totalUyu || 0).toLocaleString("es-UY")}</span>
    </div>

    <div class="grid two compact-fields">
      <label>Cliente<input id="dCliente" value="${registro.cliente || ""}"></label>
      <label>Contacto<input id="dTelefono" value="${registro.telefono || ""}"></label>
      <label>Ciudad<input id="dCiudad" value="${registro.ciudad || ""}"></label>
      <label>Dirección<input id="dDireccion" value="${registro.direccion || ""}"></label>
      <label>Estado
        <select id="dEstado">${estados.map(e => `<option ${e === registro.estado ? "selected" : ""}>${e}</option>`).join("")}</select>
      </label>
      <label>Seña<input id="dSena" value="${registro.sena || ""}" placeholder="Ej: 100"></label>
      <label>Moneda pago
        <select id="dMonedaPago">
          <option ${registro.monedaPago === "USD" ? "selected" : ""}>USD</option>
          <option ${registro.monedaPago === "UYU" ? "selected" : ""}>UYU</option>
        </select>
      </label>
      <label>Pago total<input id="dPagoTotal" value="${registro.pagoTotal || ""}" placeholder="Opcional"></label>
    </div>

    <div class="date-grid">
      <span>Aprobado: <strong>${registro.fechaAprobado || "-"}</strong></span>
      <span>Ingreso taller: <strong>${registro.fechaIngreso || "-"}</strong></span>
      <span>Terminado: <strong>${registro.fechaTerminado || "-"}</strong></span>
      <span>Entregado: <strong>${registro.fechaEntregado || "-"}</strong></span>
    </div>

    <label>Observaciones
      <textarea id="dObservaciones" rows="3" placeholder="Notas internas, coordinación, instalación, etc.">${registro.observaciones || ""}</textarea>
    </label>

    <h3>Productos</h3>
    <div class="items-list">
      ${(registro.items || []).map(i => `<div><strong>${i.descripcion}</strong><span>${i.medidas} · ${i.cantidad} un. · ${fmtUsd(i.totalUsd)}</span></div>`).join("") || "Sin productos"}
    </div>

    <div class="actions-row wrap detail-actions">
      <button class="btn primary" id="btnGuardarDetalle">Guardar cambios</button>
      <button class="btn secondary" id="btnDescargarPdfDetalle">Descargar PDF</button>
      <button class="btn danger ghost" id="btnEliminarRegistro">Eliminar local</button>
    </div>
  `;
  $("btnGuardarDetalle").addEventListener("click", guardarDetalle);
  $("btnDescargarPdfDetalle").addEventListener("click", () => descargarPdfRegistro(registro.id));
  $("btnEliminarRegistro").addEventListener("click", eliminarRegistro);
}

async function guardarDetalle() {
  const historial = getHistorialLocal();
  const idx = historial.findIndex(r => r.id === seleccionadoId);
  if (idx === -1) return;
  const r = historial[idx];
  const estadoAnterior = r.estado;
  const estadoNuevo = $("dEstado").value;

  r.cliente = $("dCliente").value;
  r.telefono = $("dTelefono").value;
  r.ciudad = $("dCiudad").value;
  r.direccion = $("dDireccion").value;
  r.estado = estadoNuevo;
  r.sena = $("dSena").value;
  r.monedaPago = $("dMonedaPago").value;
  r.pagoTotal = $("dPagoTotal").value;
  r.observaciones = $("dObservaciones").value;

  if (estadoNuevo !== estadoAnterior) {
    const campoFecha = fechasPorEstado[estadoNuevo];
    if (campoFecha && !r[campoFecha]) r[campoFecha] = todayUY();
    r.historialEstados = r.historialEstados || [];
    r.historialEstados.push({ estado: estadoNuevo, fecha: todayUY(), iso: nowIso() });
  }

  historial[idx] = r;
  setHistorialLocal(historial);
  await enviarUpdateAGoogleSheet(r);
  renderTabla();
  renderDetalle();
  alert("Cambios guardados.");
}

function eliminarRegistro() {
  if (!confirm("¿Eliminar este registro del historial local?")) return;
  const historial = getHistorialLocal().filter(r => r.id !== seleccionadoId);
  setHistorialLocal(historial);
  seleccionadoId = null;
  renderTabla();
  renderDetalle();
}

async function enviarUpdateAGoogleSheet(registro) {
  const url = getAppsScriptUrl();
  if (!url) return { skipped: true };
  try {
    const body = new URLSearchParams();
    body.set("action", "updatePresupuesto");
    body.set("payload", JSON.stringify(registro));
    await fetch(url, { method: "POST", body, mode: "no-cors" });
    return { ok: true, opaque: true };
  } catch (e) {
    console.warn("No se pudo actualizar Google Sheets", e);
    return { ok: false };
  }
}

function fetchJsonp(url) {
  return new Promise((resolve, reject) => {
    const callback = `nabrasaJsonp_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const sep = url.includes("?") ? "&" : "?";
    const script = document.createElement("script");
    window[callback] = (data) => {
      delete window[callback];
      script.remove();
      resolve(data);
    };
    script.onerror = () => {
      delete window[callback];
      script.remove();
      reject(new Error("Error cargando JSONP"));
    };
    script.src = `${url}${sep}callback=${callback}`;
    document.body.appendChild(script);
  });
}

async function syncDesdeGoogleSheet(mostrarAlerta = true) {
  const url = getAppsScriptUrl();
  if (!url) return alert("No hay URL de Apps Script configurada en el sistema.");
  try {
    const data = await fetchJsonp(`${url}?action=listPresupuestos`);
    if (!data.ok || !Array.isArray(data.records)) throw new Error("Respuesta inválida");
    setHistorialLocal(data.records);
    seleccionadoId = null;
    renderTabla();
    renderDetalle();
    if (mostrarAlerta) alert("Datos actualizados desde Google Sheets.");
  } catch (e) {
    console.warn(e);
    if (mostrarAlerta) alert("No se pudo traer la información de Google Sheets. Revisá permisos y despliegue del Apps Script.");
  }
}

function exportarJson() {
  const data = localStorage.getItem("nabrasa_historial") || "[]";
  const blob = new Blob([data], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "historial-nabrasa.json";
  a.click();
}


window.addEventListener("DOMContentLoaded", () => {
  aplicarTema(localStorage.getItem("nabrasa_theme") || "dark");
  $("btnTheme").addEventListener("click", alternarTema);
  const navToggle = $("btnNavToggle");
  const topActions = $("topActions");
  if (navToggle && topActions) navToggle.addEventListener("click", () => {
    const open = topActions.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  $("btnSync").addEventListener("click", () => syncDesdeGoogleSheet(true));
  $("filtroTexto").addEventListener("input", renderTabla);
  $("filtroEstado").addEventListener("change", renderTabla);
  renderTabla();
  renderDetalle();
  syncDesdeGoogleSheet(false);
});
