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
