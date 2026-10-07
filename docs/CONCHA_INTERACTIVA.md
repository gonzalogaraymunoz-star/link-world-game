# Organismo interactivo LINK

Vista conceptual incorporada en `components/ConchaWorld.js`. Referencias de movimiento: los tres videos de Flow aportados el 7 de octubre de 2026. Referencia de arquitectura: LINK WORLD.docx aportado en la misma conversación.

## Interacción

- Organismo se abre como vista inicial. Mapa conserva la geografía física.
- Una célula entra desde el listado lateral al centro de sus seis etapas.
- Al seleccionar una etapa aparece una mesa con el mismo contexto de negocio.
- Volver contrae la mesa. La vista se conserva al visitar la ficha y regresar.
- Menú izquierdo y panel contextual se pliegan; zoom, día/noche, pausa y movimiento reducido son locales.

## Datos

No introduce tablas, credenciales, permisos ni consultas nuevas. Recibe las lecturas autorizadas de GameShell. La capa pública muestra células públicas y estructura. Los objetivos, misiones, artefactos y evidencias requieren la membresía existente.

El estado de etapa y la evidencia se filtran conjuntamente por `business_id` y `model_id`. Compartir un modelo no comparte evidencia. Las líneas de relaciones sólo representan modelos compartidos con enlaces activos. Los radios restantes representan estructura, no tráfico comercial. El movimiento es navegación, nunca comprobación de un pago o entrega.

## Alcance

Las mesas presentan los registros que esta app ya lee. No sustituyen las aplicaciones operativas de cada área ni crean un nuevo motor de casos o handoffs. Capacidades superiores abren contexto; algunas requieren futuros contratos de datos para una mesa propia completa. Mitosis y Meiosis no se ejecutan desde esta versión.

## Validación

`node --test lib/concha.test.mjs` comprueba aislamiento de estado y evidencia entre células/modelos, enlaces cancelados, relaciones propuestas y avance sin prueba. `npm run build` genera el export estático para Cloudflare Pages.

La publicación se prepara en una rama de prueba; producción requiere autorización explícita después del bloqueo de revisión automática del despliegue.
