# Nabrasa Cotizador v11

## Conexión con Google Sheets

1. Crear un Google Sheet nuevo. Nombre sugerido: `Nabrasa CRM`.
2. Ir a Extensiones > Apps Script.
3. Borrar el contenido inicial y pegar todo el contenido de `apps-script.gs`.
4. Guardar el proyecto.
5. Ejecutar manualmente la función `setupSheets_` una vez y aceptar permisos.
6. Ir a Implementar > Nueva implementación.
7. Tipo: Aplicación web.
8. Ejecutar como: Yo.
9. Quién tiene acceso: Cualquier usuario.
10. Copiar la URL de la aplicación web.
11. En el cotizador, entrar en Configurar y pegar esa URL.

El sistema guarda presupuestos nuevos y actualizaciones de seguimiento en:
- Presupuestos
- Detalle_Presupuesto
- Historial_Estados

El historial local sigue existiendo como respaldo rápido del navegador.


## Dólar online

El cotizador consulta automáticamente la cotización USD/UYU una vez por día desde `https://uy.dolarapi.com/v1/cotizaciones/usd` y usa el valor de venta.

Si se modifica manualmente desde **Configurar**, el valor queda fijo solo para la fecha actual. Al día siguiente, el sistema vuelve a consultar el valor online por defecto.

Si la API no responde, el sistema usa el último dólar guardado en el navegador o el valor default de `config.js`.


## Cambios v15

- URL de Apps Script fija en `scripts/config.js`.
- Se quitó la edición de Apps Script desde el front.
- Configuración visible solo para modificar el dólar del día.
- Seguimiento carga datos desde Google Sheets al abrir y permite actualizar con el botón **Actualizar datos**.
- Se retiró la exportación JSON de la interfaz.
- Menú superior responsive con botón hamburguesa en móvil.


## v16
- Se quitó WhatsApp del módulo de presupuesto actual.
- En Seguimiento, WhatsApp ahora intenta compartir el PDF del presupuesto usando Web Share API. Si el navegador no permite adjuntar archivos automáticamente, descarga el PDF y abre WhatsApp con el texto para adjuntarlo manualmente.
