---
tags: [tarea, backend, docs, seguridad, feature]
status: 🟢
prioridad: feature
updated: 2026-08-11
---

# BACKEND-20260811-docs-swagger-api-key — Docs Swagger/Redoc gateadas por API key

**Tipo:** feature (nueva), pedida directo por el owner · **Decisión:**
[[ADR-G-20260811-docs-swagger-key-gate]] · **Corrida:** [[RUN-20260811-docs-swagger-key-gate]]

## Qué se pidió
Exponer `/docs#/` tipo Swagger para ver y probar los endpoints, con acceso protegido por una key
seteada en `.env`, puesta en un campo de Swagger.

## Qué se entregó
`drf-spectacular` + `drf-spectacular-sidecar` (self-hosted, sin CDN) en `/docs/`, `/redoc/`,
`/api/schema/`. Gate por `DOCS_API_KEY`: **navegador → formulario de login en `/docs/login/`** (deja
una cookie de sesión, la key nunca viaja en una URL); **programático (curl/CI) → header**
`X-Docs-Api-Key`. Falla cerrado si la key no está configurada. La key de docs no otorga acceso a ningún
endpoint de negocio real — esos siguen con JWT real vía el botón "Authorize" (`jwtAuth`,
auto-registrado desde `simplejwt`).

## Estado
🟢 cerrado. 12/12 + 6/6 casos verificados con servidor real. Revisión adversarial corrida
(workflow, 3 lentes + síntesis): 3 hallazgos reales arreglados y re-verificados, 1 documentado como
trade-off aceptado, 2 pasados a backlog nuevo por ser preexistentes y fuera de alcance:
[[BACKEND-20260811-manage-py-settings-fallback-inseguro]] ·
[[BACKEND-20260811-falta-https-enforcement-produccion]].
