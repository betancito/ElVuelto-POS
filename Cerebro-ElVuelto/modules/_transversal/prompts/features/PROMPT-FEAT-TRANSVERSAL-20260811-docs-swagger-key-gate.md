---
tags: [prompt, feature, transversal, docs]
status: 🟢 corrido-ok
updated: 2026-08-11
---

# PROMPT-FEAT-TRANSVERSAL-20260811-docs-swagger-key-gate

> [!info] Prompt reconstruido, no entregado antes de correr
> El owner se lo pidió directo al Planner en el chat; no hubo handoff Planner→Dev previo. Reconstruido
> acá post-hoc para que el registro tenga a qué apuntar. Ver [[RUN-20260811-docs-swagger-key-gate]]
> para el reconocimiento completo de la desviación de protocolo.

## Tarea (tal como la pidió el owner)
Habilitar docs tipo Swagger en `/docs#/`. Acceso protegido por una key seteada en `.env`, puesta en un
campo de Swagger (como un JWT), que da acceso a ver y usar los endpoints documentados.

## Qué leer / regla dura aplicable
- `CLAUDE.md` backend: sección "Multi-Tenancy" y "Roles & Permissions" — la key de docs NO debe
  convertirse en una puerta lateral hacia datos de tenant; los endpoints reales deben seguir exigiendo
  JWT real.
- Patrón: falla cerrado (sin key configurada = sin acceso), igual que el resto de guards de tenancy
  del proyecto (`require_tenant`).

## Criterio de aceptación
1. `/docs/`, `/redoc/`, `/api/schema/` responden 403 sin key o con key incorrecta; 200 con la key
   correcta (header `X-Docs-Api-Key` o `?key=`).
2. La key de docs NO otorga acceso a ningún endpoint de negocio real.
3. `DOCS_API_KEY` sin configurar ⇒ nadie entra (fail closed).
4. Verificado contra un server real, no solo lectura de código.

## Resultado
[[ADR-G-20260811-docs-swagger-key-gate]] · [[RUN-20260811-docs-swagger-key-gate]] — ✅ 12/12 + 6/6
casos con ejecución real, revisión adversarial corrida y 3 hallazgos reales arreglados.
