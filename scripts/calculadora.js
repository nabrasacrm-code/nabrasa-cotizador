(function () {
  const cfg = window.NABRASA_CONFIG;
  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

  function fechaUY() {
    return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Montevideo" });
  }

  function getDolar() {
    const hoy = fechaUY();
    const manualFecha = localStorage.getItem("nabrasa_dolar_manual_fecha");
    const manualValor = Number(localStorage.getItem("nabrasa_dolar_manual_valor"));
    if (manualFecha === hoy && manualValor > 0) return manualValor;

    const autoFecha = localStorage.getItem("nabrasa_dolar_auto_fecha");
    const autoValor = Number(localStorage.getItem("nabrasa_dolar_auto_valor"));
    if (autoFecha === hoy && autoValor > 0) return autoValor;

    return Number(localStorage.getItem("nabrasa_dolar")) || cfg.dolarDefault;
  }

  function setDolarManual(valor) {
    const n = Number(valor);
    if (!n || n <= 0) return false;
    localStorage.setItem("nabrasa_dolar_manual_fecha", fechaUY());
    localStorage.setItem("nabrasa_dolar_manual_valor", String(n));
    localStorage.setItem("nabrasa_dolar", String(n));
    return true;
  }

  function setDolarOnline(valor) {
    const n = Number(valor);
    if (!n || n <= 0) return false;
    localStorage.setItem("nabrasa_dolar_auto_fecha", fechaUY());
    localStorage.setItem("nabrasa_dolar_auto_valor", String(n));
    localStorage.setItem("nabrasa_dolar", String(n));
    return true;
  }

  function tieneDolarManualHoy() {
    return localStorage.getItem("nabrasa_dolar_manual_fecha") === fechaUY();
  }

  function barrasParrillaSimple({ frente, profundidad, patas, separacion }) {
    const marco = (((frente * 2) + (profundidad * 2) + (patas * 4)) / 100) / 6;
    const densidad = Number(separacion) === 20 ? 3 : 2.5;
    const emparrillado = ((((frente / densidad) + 1) * (profundidad - 1)) / 100) / 6;
    return { marco, emparrillado };
  }

  function barrasParrillaAchuras({ frente, profundidad, patas, separacion }) {
    const marco = (((frente * 2) + (profundidad * 4) + (patas * 4)) / 100) / 6;
    const densidad = Number(separacion) === 20 ? 3 : 2.5;
    const emparrillado = ((((frente / densidad) + 1) * ((profundidad * 2) - 1)) / 100) / 6;
    return { marco, emparrillado };
  }

  function calcularParrilla(tipo, datos) {
    const barras = tipo === "parrillaAchuras" ? barrasParrillaAchuras(datos) : barrasParrillaSimple(datos);
    const marco = getMaterial("marco", datos.materialMarco) || cfg.materialesParrilla.marco.find(x => x.id === "marco_inox_30x30_12");
    const emparrillado = getMaterial("emparrillado", datos.materialEmparrillado) || cfg.materialesParrilla.emparrillado.find(x => x.id === "cano_inox_95_12");
    const costoMateriales = ((barras.marco * marco.costoUsdSinIva) + (barras.emparrillado * emparrillado.costoUsdSinIva)) * 1.22;
    const costoFijoUsd = cfg.materiales.perforacionesLaserUsdSinIva * 1.22;
    const costoBase = costoMateriales + costoFijoUsd;
    const margen = cfg.margenes[tipo];
    const totalUsd = costoBase * (1 + margen);
    return {
      costoBase: round2(costoBase),
      totalUsd: round2(totalUsd),
      totalUyu: Math.round(totalUsd * getDolar()),
      detalle: { ...barras, costoMateriales: round2(costoMateriales), costoFijoUsd: round2(costoFijoUsd), margen }
    };
  }

  function calcularQuemador(tipo, datos) {
    // Fórmula exacta de la planilla original.
    const material = tipo === "quemadorInox" ? cfg.materiales.varillaInox12 : cfg.materiales.varillaHierro12;
    const margen = cfg.margenes[tipo];
    const consumoBarras = (((datos.profundidad * datos.largueros) + (((datos.profundidad / 10) + 1) * (datos.frente + (datos.altura * 2))) + (datos.alturaPatas * 4)) / 100) / 6;
    const costoBase = consumoBarras * material * 1.22;
    const totalUsd = costoBase * (1 + margen);
    return {
      costoBase: round2(costoBase),
      totalUsd: round2(totalUsd),
      totalUyu: Math.round(totalUsd * getDolar()),
      detalle: { consumoBarras: round2(consumoBarras), margen }
    };
  }

  function getMaterial(grupo, id) {
    const lista = cfg.materialesParrilla && cfg.materialesParrilla[grupo] ? cfg.materialesParrilla[grupo] : [];
    return lista.find(x => x.id === id);
  }

  function calcularItem(tipo, datos) {
    if (tipo === "parrillaSimple" || tipo === "parrillaAchuras") return calcularParrilla(tipo, datos);
    if (tipo === "quemadorInox" || tipo === "quemadorHierro") return calcularQuemador(tipo, datos);
    const totalUsd = Number(datos.manualUsd) || 0;
    return { costoBase: totalUsd, totalUsd: round2(totalUsd), totalUyu: Math.round(totalUsd * getDolar()), detalle: {} };
  }

  function nombreProducto(tipo) {
    return {
      parrillaSimple: "Parrilla simple - 100% modular/inoxidable",
      parrillaAchuras: "Parrilla y módulo achuras - 100% modular/inoxidable",
      quemadorInox: "Quemador inoxidable",
      quemadorHierro: "Quemador hierro",
      manual: "Ítem manual"
    }[tipo] || tipo;
  }

  window.NabrasaCalc = { calcularItem, getDolar, setDolarManual, setDolarOnline, tieneDolarManualHoy, nombreProducto, round2 };
})();
