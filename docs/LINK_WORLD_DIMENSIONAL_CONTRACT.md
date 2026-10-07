# LINK WORLD GAME · contrato dimensional V1

Este proyecto es la **superficie territorial** de LINK WORLD, no una segunda base de datos ni un segundo ERP. Fuente: documento maestro «LINK WORLD».

## Escalas y navegación

1. **LINK**: organismo completo y señales que requieren atención.
2. **Célula / negocio**: contexto de `business_id` explícito.
3. **Concha**: MAR → Venta → Cierre → Boarding → Operaciones → Postventa.
4. **Mesa / artefacto / evidencia**: detalle y acción sobre la misma entidad canónica.

Cada salto debe conservar la ruta de navegación (`dimensionPath`), permitir Volver y evitar vistas recargadas. La tarjeta de negocio es una **puerta dimensional**, no un dashboard permanente.

## Fuente y permisos

- Supabase LINK CONTROL CENTRAL es el estado vivo autorizado. GitHub conserva código; Cloudflare y Vercel publican interfaces.
- Sin sesión autorizada, mostrar vacío/bloqueado; no poblar con datos ficticios.
- Lecturas y escrituras respetan RLS y membresía `link_world_is_member`.
- Reutilizar tablas `link_world_businesses`, `link_game_actions`, `link_game_evidence`, `link_game_state_snapshots`, `agent_missions` existentes. No duplicarlas.
- IDs canónicos: `business_id`, `mission_id`, `person_id`, `artifact_id`, `evidence_id`; el nombre visible no es clave de unión.

## Dos entradas, una misma verdad

- LINK → FIN = finanzas de todas las células.
- LINK → Negocios → [célula] → FIN = la misma fuente, filtrada por `business_id`.
- Nunca reconstituir otra FIN en el cliente.

## Evidencia y autonomía

Una acción declarada por un agente no equivale a evidencia verificada.
Mantener `observed → under_review → verified/rejected/revoked`.
Director coordina; Pulso observa; la mesa especializada ejecuta.
Acciones externas, financieras, irreversibles y sensibles requieren autorización pertinente.

## Dos mapas distintos

- Google Maps muestra ubicación física real, recuperada de datos persistentes.
- Modelos, artefactos, células y misiones se presentan en un **mapa conceptual** separado.
- No inventar coordenadas ni usar Maps como adorno.

## Despliegue aislado

- Rama `cloudflare-pages`: exportación estática de Next.js a `out/`, solo para Cloudflare Pages.
- Rama `main`: runtime existente de Vercel, sin modificar su configuración de despliegue.
- Variables públicas: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
- No copiar la variable cifrada de Maps desde Vercel sin su valor legible. Restringir la clave de navegador a cada dominio autorizado.
- Probar publicación, sesión RLS, carga progresiva de negocios y Maps antes de declarar la integración completa.

## Siguiente mejora de interfaz

Portal territorial → seleccionar célula → vista completa de negocio → Concha por etapas → mesa → evidencia. Primero implementar el contexto y el retorno; después el zoom visual y las animaciones discretas.