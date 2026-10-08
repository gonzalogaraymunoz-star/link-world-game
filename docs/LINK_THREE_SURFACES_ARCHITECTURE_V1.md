# LINK · ARQUITECTURA DE TRES SUPERFICIES · v1

Estado: contrato canónico de producto para LINK WORLD, LINK WORLD GAME y LINK CONTROL CENTRAL.

## Principio

Las tres superficies comparten una sola realidad y no duplican negocio, etapa, misión, evidencia ni estado.

- Supabase = estado vivo.
- Event Bus / Pulso / agentes = gobierno y ejecución.
- GitHub = código y contrato canónico.
- Cada app interpreta el mismo contexto desde una responsabilidad distinta.

## 1. LINK WORLD · VER Y NAVEGAR

Rol: representación viva y espacial del ecosistema.

Debe:
- mostrar el Mapa Maestro, células, Concha, capas y relaciones;
- permitir elegir un negocio y mantener businessContext;
- mostrar señales mínimas de estado;
- ofrecer modo día / gris / noche;
- enviar trabajo de negocio a GAME;
- enviar gobierno, Pulso, agentes y sistema a CONTROL.

No debe:
- convertirse en dashboard operacional;
- ejecutar Pulso;
- administrar aprobaciones, agentes, colas o infraestructura;
- duplicar formularios de evidencia o misión;
- explicar todo antes de que el usuario lo solicite.

URL principal:
https://link-world-9h0.pages.dev

## 2. LINK WORLD GAME · DESARROLLAR Y ESTABILIZAR

Rol: laboratorio operativo para convertir hobby / célula incompleta en negocio comprobado y luego estable.

Debe:
- trabajar negocio por negocio;
- reproducir las seis etapas canónicas:
  MAR → Venta → Cierre → Boarding → Opera → Postventa;
- mostrar estado real por etapa;
- concentrar misión, siguiente acción, evidencia y gate;
- trabajar artefactos, modelos, evolución y capacidades del negocio;
- enviar aprobaciones, bloqueos sistémicos y ejecución gobernada a CONTROL;
- devolver progreso a WORLD mediante la misma fuente de verdad.

No debe:
- intentar representar todo el ecosistema;
- duplicar el mapa maestro;
- operar agentes, conexiones o infraestructura directamente.

URL principal:
https://link-world-game.pages.dev

## 3. LINK CONTROL CENTRAL · GOBERNAR Y EJECUTAR

Rol: sala de máquinas del organismo.

Debe:
- ejecutar Pulso Vivo;
- gobernar LINK Director y LINKDOTs;
- administrar aprobaciones, colas, eventos, salud y bloqueos;
- administrar conexiones e integraciones;
- resolver ejecución sensible o transversal;
- exponer estado verificable a WORLD y GAME.

No debe:
- ser el mapa maestro;
- repetir la experiencia visual de la Concha;
- convertirse en laboratorio de desarrollo de negocios.

URL:
https://linkcontrolgeneral.vercel.app

## Contexto compartido

Todas las superficies aceptan y preservan, cuando existan:

- business: UUID de link_world_businesses.
- business_global: global_id canónico.
- stage: marketing | ventas | cierre | onboarding | entrega | postventa.
- model: UUID del modelo.
- mission: ID o código de misión.
- focus: dimensión o capacidad puntual.
- origin: world | game | control.

Regla:
la URL transporta contexto; Supabase transporta realidad.

No usar localStorage para transferir estado operacional entre apps.

## Handoffs

WORLD → GAME:
cuando el usuario toca una etapa, el núcleo del negocio o una capacidad de desarrollo.

WORLD → CONTROL:
cuando toca Director, Pulso, Hipocampo, Cortex o Sistema Nervioso.

GAME → WORLD:
para volver a comprender el negocio dentro del organismo.

GAME → CONTROL:
cuando una etapa necesita aprobación, agente, integración, desbloqueo o ejecución gobernada.

CONTROL → WORLD:
para volver a observar el impacto en el organismo.

CONTROL → GAME:
para continuar la estabilización de la etapa que originó la intervención.

## Fuente de verdad por responsabilidad

WORLD lee:
- link_world_businesses
- relaciones/modelos necesarios para representación
- resúmenes de etapa y señales
- estado económico resumido
- resultados de Pulso, nunca su ejecución

GAME lee/escribe, con permisos:
- link_business_agent_journey_v
- link_world_model_stage_state
- link_world_model_evidence
- link_game_actions
- link_game_evidence
- agent_missions relacionadas al negocio
- artefactos/modelos/evolución
- transacciones y evidencia económica cuando correspondan

CONTROL gobierna:
- agent_scope_state
- agent_work_queue
- agent_event_routes
- event_bus
- agent_missions en capa de gobierno
- aprobaciones
- integración/conexión
- ciclos de Pulso / respiración
- salud y regulación

## Regla anti-duplicación

Si un dato existe en Supabase:
- WORLD lo representa.
- GAME lo trabaja.
- CONTROL lo gobierna.

Ninguna app crea una copia paralela para su propia UI.

## Regla de lectura

WORLD muestra poco.
GAME muestra lo necesario para avanzar una etapa.
CONTROL muestra lo necesario para decidir, aprobar o reparar.

## Regla de negocio

Una célula puede existir como hobby o hipótesis.
Se considera negocio comprobado sólo cuando existe evidencia económica y operativa verificable según el contrato económico vigente de LINK.

La Concha no certifica por sí sola: organiza el recorrido que permite producir y verificar esa evidencia.

## Regla de despliegue

- construir por bloques;
- un paquete coherente = un despliegue;
- evitar microdeploys;
- producción sólo cuando la separación de responsabilidades está validada.
