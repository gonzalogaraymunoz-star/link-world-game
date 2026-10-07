# LINK World: diseño y navegación contextual

Referencias: tres animaciones de Flow, LINK WORLD.docx y DESIGN LINK(2).md aportados por el usuario el 7 de octubre de 2026. Se adapta el repositorio y proyecto Cloudflare existentes link-world-game; no se crea otro sistema empresarial.

## Resultado de interfaz

- Diseño Architectural Ledger: superficie #fbf9f9, negro, acento #7c5546, Inter y Space Grotesk servidas localmente. Secciones separadas por tonos y espacio; las líneas del diagrama representan relaciones.
- Menú dimensional izquierdo agrupado: territorio, Concha, capacidades, gobierno, reproducción y sistema. Panel derecho común de contexto, atención, evidencia, recorrido, células e historial; el mapa incorpora lugar, acciones y desarrollo en ese mismo panel.
- Selección explícita entre Todo LINK y una célula. Cambiar de dimensión conserva business_id/model_id; la URL permite refrescar, compartir y usar atrás/adelante. La Concha permanece montada para conservar zoom/pausa; se conserva el scroll del centro por dimensión y célula durante la sesión.
- Las seis etapas abren mesas centrales con estado, misiones, evidencia y handoffs. Capacidades y gobierno tienen destinos distintos.

## Fuentes y contrato

LINK CONTROL CENTRAL: zgbnjlrxzvzpigmwidsp, proyecto autorizado ya existente. Se comprobaron columnas y RLS de las fuentes nuevas. Sin cambios de esquema, permisos ni transacciones.

Lecturas nuevas, sólo después de la membresía existente y al abrir la dimensión: link_persons (asociación primaria), link_dot_artifacts, link_genesis_instances, link_genesis_components, agent_stage_handoffs. Sistema nervioso resuelve el namespace system/link-nervous-system y su metadata.canonical_contract_key; lee únicamente esa memoria vigente no archivada. No fija la versión nerviosa en el código.

FIN, RRSS, misiones, modelos, conexiones, eventos, cron y memoria reutilizan las lecturas existentes. Conexiones, mesas y cron sólo se filtran por negocio cuando sus metadatos declaran la asociación. Los conteos de Hipocampo/Cortex se identifican como transversales.

Etapas, evidencias y avance de una célula se filtran por su business_id, además del modelo. La ficha tampoco recibe evidencias ajenas de un modelo compartido. Un estado completed no certifica una etapa sin evidencia verificada. Se retiraron estados financieros genéricos completed/confirmed y afirmaciones en owned_facts como prueba automática de activación: se exige pago registrado en FIN o evidencia económica verificada de la célula.

Se leyó el puntero exacto de LINK WORLD en el registro (2.9.0 activa), el paquete local (3.0.0) y el contrato nervioso seleccionado dinámicamente (1.7). La discrepancia de versiones de habilidad se conserva como límite; esta tarea no activa ni reconcilia doctrina, skills o autonomía. La interfaz reutiliza lecturas existentes y las jurisdicciones coincidentes; no instala ejecutores del paquete local.

## Límites operativos

Génesis consulta instancias; reproducción consulta componentes/políticas. Mitosis/Meiosis no crean ni certifican células desde esta versión. No heredan pagos, ventas, clientes, conversación, PII o evidencia operacional.

LINK SHOW prepara y copia un contexto para continuar la conversación: no simula un chat de agente conectado. Memoria presenta inventario y acceso al sistema propietario, sin inventar búsqueda contextual. Director presenta excepciones entre las misiones cargadas; no sustituye un ejecutor de coordinación. Administración enlaza al sistema propietario, sin ampliar privilegios.

Errores de lectura se presentan explícitamente; las consultas tienen límites de registros. No hay prueba de recorrido autenticado en el navegador sin una sesión de miembro disponible. El mapa conserva su dependencia Google existente; su autorización se verifica por separado.

## Orden de construcción y validación

Objetivo: adaptar estética y navegación de la app existente. Dueño del cambio: código/Factory; dueño de registros: CONTROL CENTRAL y sistemas operativos respectivos. Autorización: solicitud del usuario en esta sesión. Ejecutor: edición del repositorio, commit/PR y vista previa del proyecto Cloudflare existente. Resultado esperado: acceder a dimensiones reales manteniendo el contexto, con lectura pública/privada separada. Evidencias: commit, pruebas de aislamiento/rutas, build estático y revisión del navegador. Producción y sesión autenticada se verifican por separado.

node --test lib/*.test.mjs y npm run build.

Reversión por commit versionado; no se requiere revertir base de datos porque no se modifica.
