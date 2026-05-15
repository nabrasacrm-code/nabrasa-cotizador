function nombreArchivoPresupuesto(numero, cliente) {
  const clean = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const n = clean(numero) || "presupuesto";
  const c = clean(cliente) || "sin-cliente";
  return `${n}-${c}.pdf`;
}

async function descargarPresupuestoPDF(numero, cliente) {
  const area = document.getElementById("pdfArea");
  const canvas = await html2canvas(area, { scale: 2, backgroundColor: "#ffffff" });
  const imgData = canvas.toDataURL("image/png");
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const imgWidth = pageWidth - 12;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  pdf.addImage(imgData, "PNG", 6, 6, imgWidth, imgHeight);
  pdf.save(nombreArchivoPresupuesto(numero || "presupuesto-nabrasa", cliente || "sin-cliente"));
}


function pdfFmtUsd(n) {
  const value = Number(n || 0);
  return `USD ${value.toLocaleString("es-UY", { maximumFractionDigits: 2 })}`;
}

function pdfFmtUyu(n) {
  return `$ ${Math.round(Number(n || 0)).toLocaleString("es-UY")}`;
}

function escapePdfHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function crearPdfDesdeRegistro(registro) {
  const wrap = document.createElement("div");
  wrap.style.position = "fixed";
  wrap.style.left = "-10000px";
  wrap.style.top = "0";
  wrap.style.width = "1120px";
  wrap.style.background = "#ffffff";
  wrap.style.padding = "0";
  wrap.style.zIndex = "-1";

  const items = Array.isArray(registro.items) ? registro.items : [];
  const rows = items.length
    ? items.map(i => `
      <tr>
        <td>${escapePdfHtml(i.descripcion || "")}</td>
        <td>${escapePdfHtml(i.medidas || "-")}</td>
        <td>${escapePdfHtml(i.cantidad || 1)}</td>
        <td>${pdfFmtUsd(i.subtotalUsd || i.totalUsd || 0)}</td>
        <td>${pdfFmtUsd(i.totalUsd || 0)}</td>
      </tr>`).join("")
    : '<tr class="empty-row"><td colspan="5">Sin productos.</td></tr>';

  wrap.innerHTML = `
    <div class="pdf-sheet pdf-export-sheet">
      <div class="pdf-header">
        <div class="pdf-logo">NABRASA</div>
        <div class="pdf-number">
          <span>Presupuesto Nº</span>
          <strong>${escapePdfHtml(registro.numero || "NB-0000")}</strong>
        </div>
      </div>
      <div class="pdf-strip">Estimado cliente: todos los precios son IVA incluido.</div>
      <div class="pdf-contact">092 532 584 · nabrasauy@gmail.com</div>

      <div class="pdf-client-grid">
        <span>Fecha de solicitud:</span><strong>${escapePdfHtml(registro.fecha || "--/--/----")}</strong>
        <span>Nombre cliente:</span><strong>${escapePdfHtml(registro.cliente || "Sin cliente")}</strong>
        <span>Contacto cliente:</span><strong>${escapePdfHtml(registro.telefono || "Sin contacto")}</strong>
        <span>Ciudad:</span><strong>${escapePdfHtml(registro.ciudad || "Sin ciudad")}</strong>
      </div>

      <table class="quote-table">
        <thead>
          <tr>
            <th>Descripción</th>
            <th>Medidas</th>
            <th>Cant.</th>
            <th>Sub total</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="pdf-footer-grid">
        <div class="payment-box">Podés pagar con tarjeta de crédito sin recargo todos los productos.</div>
        <div class="totals-box">
          <div><span>Total USD</span><strong>${pdfFmtUsd(registro.totalUsd || 0)}</strong></div>
          <div><span>Total $</span><strong>${pdfFmtUyu(registro.totalUyu || 0)}</strong></div>
        </div>
      </div>
      <p class="legal">Costos de instalación no incluida — En $: Montevideo 3000 · Canelones 3800 · Maldonado 4200</p>
    </div>`;

  return wrap;
}

async function generarPdfRegistroBlob(registro) {
  if (!registro) return null;
  if (!window.jspdf || !window.html2canvas) {
    alert("No se pudo cargar el generador de PDF. Revisá la conexión a internet o las librerías del proyecto.");
    return null;
  }

  const temporal = crearPdfDesdeRegistro(registro);
  document.body.appendChild(temporal);

  try {
    const area = temporal.querySelector(".pdf-sheet");
    const canvas = await html2canvas(area, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgWidth = pageWidth - 12;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 6, 6, imgWidth, imgHeight);
    return pdf.output("blob");
  } finally {
    temporal.remove();
  }
}

async function descargarPresupuestoRegistroPDF(registro) {
  const blob = await generarPdfRegistroBlob(registro);
  if (!blob) return;
  const filename = nombreArchivoPresupuesto(registro.numero || "presupuesto-nabrasa", registro.cliente || "sin-cliente");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
