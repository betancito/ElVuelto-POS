---
tags: [corrida, auth, tenancy, front]
status: 🟢 corrido-ok
module: _transversal
updated: 2026-08-05
---

# RUN 2026-08-05 — Que "desactivar" funcione de punta a punta

**Prompt:** [[PROMPT-FIX-20260805-desactivar-de-punta-a-punta]]
**Tareas:** [[TENANCY-20260802-toggle-active-fantasma]] + el residual de `/auth/refresh/` de [[auditoria-adversarial-20260805]]
**Veredicto:** ✅ PASÓ — **5/5**.

## Diff entregado
`apps/users/{serializers,views}.py` + `src/features/tenants/tenantsApi.ts`. **`apiBase.ts` NO se tocó — y está bien** (ver abajo).

## Verificación (5/5)
`npm run typecheck` limpio · `npm run build` → `✓ built in 4.38s`

| # | Caso | Resultado |
|---|---|---|
| 1 | `POST /auth/refresh/` con el refresh de un usuario **desactivado** | **401** `Esta cuenta está desactivada.` |
| 2 | `POST /auth/refresh/` de un usuario **activo** | **200** ← la regresión crítica: no se cae la sesión de nadie |
| 3 | `grep toggleTenantActive src/` | solo el comentario explicativo; **cero código** |
| 4 | Cajero activo usando el POS | **200** / **201** |
| 5 | 33 refresh seguidos | **429 en el #31** — el throttle de ayer sigue vivo |

## 👏 La decisión de NO tocar el front
El prompt pedía revisar que la rama de auto-logout de `baseQueryWithReauth` se alcanzara. El Dev la revisó y **no la modificó**, porque no hacía falta: el `else { api.dispatch(logout()) }` ya existía (`apiBase.ts:33-35`) — era **inalcanzable** solo porque el refresh nunca fallaba. Con el backend rechazando, `refreshResult.data` queda `undefined` y la rama dispara sola.

Es la respuesta correcta: el bug no estaba en el front, estaba en que el backend le mentía. Tocar `apiBase.ts` habría sido ruido.

## Calidad del cambio de backend
`ActiveUserTokenRefreshSerializer` (`serializers.py:94-121`) llama `super().validate()` **primero**, para que los errores de firma/expiración conserven sus mensajes originales, y recién después carga el `User`. Usa `api_settings.USER_ID_CLAIM`/`USER_ID_FIELD` en vez de hardcodear el nombre del claim.

Y el docstring **acota su propio alcance**, que es lo que más me gusta: dice explícitamente que **esto NO es revocación de tokens** — un access ya emitido sigue válido hasta expirar — y que la revocación real es otra tarea, todavía sin decidir. No se atribuye más de lo que hace.

Costo asumido y documentado: una query extra por refresh. Con access de 8 h, los refresh son raros.

## Sobre la mutation fantasma
Borrada junto con su hook exportado, dejando un comentario que explica que el endpoint no existe y que el toggle real va por `PATCH updateTenant` con `activo`. Eso evita que alguien la "reponga" pensando que faltaba.

## Checklist de trampas
**#3 tags RTK** ✅ al borrar la mutation no quedó ningún `invalidatesTags` huérfano · **#7 errores** ✅ el 401 trae `detail` en español · **#9 migraciones** ✅ no aplica · **#10 doble actualización** ✅ · **#11** ✅ sin git, sin scope creep — respetó que **no** metiera `CHECK_REVOKE_TOKEN`, que es la tarea aparcada.
