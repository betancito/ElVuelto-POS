---
tags: [tarea, frontend, build, infra, trampa]
status: 🔴
prioridad: media
updated: 2026-08-30
---

# FRONT-20260830-vite-config-js-pisa-al-ts — el `vite.config.js` commiteado GANA sobre el `.ts`

> [!warning] El diagnóstico viejo se quedó corto: no es basura inerte
> [[2026-08-27-planner-cierre-run-caja]] lo anotó como *"basura de build"* que se colaría al commit.
> Se coló (`git log --oneline -- el_vuelto_frontend/vite.config.js` → una sola línea: `abee9d8`), pero
> el problema no es que ocupe espacio: es que **vite lo carga primero**.

## El mecanismo, verificado en el vite instalado (5.4.21)
`node_modules/vite/dist/node/constants.js:33-40` define
`DEFAULT_CONFIG_FILES = ["vite.config.js", "vite.config.mjs", "vite.config.ts", …]` — el **`.js` va
primero**. Desde este commit, cualquier edición futura a `vite.config.ts` es **invisible** para
`npm run dev` y para `docker-compose.dev.yml` (que bind-montea `./el_vuelto_frontend`, `:33`) hasta que
alguien vuelva a correr `npm run build`.

**Hoy está armado pero no disparado:** los dos archivos coinciden (`vite.config.ts` mtime 08-26 19:59,
`vite.config.js` 08-27 00:50). Se dispara el día que alguien toque el `.ts` y pruebe con `dev`.

## De dónde sale el archivo
`el_vuelto_frontend/package.json:8` — `"build": "tsc && vite build"` (sin `--noEmit`) y
`tsconfig.node.json` con `"composite": true`, `"include": ["vite.config.ts"]` y **sin** `noEmit` ni
`outDir`. Por eso `tsc` escribe `vite.config.js`, `vite.config.d.ts` y `tsconfig.node.tsbuildinfo` al
lado de la fuente. El `.gitignore` raíz tapa **dos de los tres**: `:25 *.tsbuildinfo` y
`:26 vite.config.d.ts`. Falta exactamente una línea. (El cerebro citaba `.gitignore:23` — ancla corrida.)

De yapa: `tsconfig.node.json` no fija `target`, por eso el `.js` sale downlevelado (`var`, `void 0`)
aunque `tsconfig.json:3` pide ES2020.

## Qué stage está expuesto
- ✅ **build de la imagen**: `docker/frontend/Dockerfile:42-45` hace `COPY . .` y después
  `npm run build`, que corre `tsc` primero — el `.js` se regenera antes de que vite lo lea.
- 🔴 **dev**: `docker/frontend/Dockerfile:36` (`npm run dev`) usa el archivo bind-monteado del host tal
  como está en git.

## Arreglo (una línea + un borrado)
Agregar `el_vuelto_frontend/vite.config.js` al `.gitignore` raíz (junto a `:26`) y sacarlo del índice
con `git rm --cached`. Alternativa de fondo: poner `"noEmit": true` en `tsconfig.node.json`.
**Es código de la app**, o sea fuera de los permisos del Planner puro ([[INIT-AGENTS]]).

## Anclas
- `el_vuelto_frontend/vite.config.js:1` (trackeado desde `abee9d8`; `git check-ignore` sin match)
- `.gitignore:25,26`
- `el_vuelto_frontend/package.json:8` · `el_vuelto_frontend/tsconfig.node.json`
- `el_vuelto_frontend/node_modules/vite/dist/node/constants.js:33-40`
- `docker/frontend/Dockerfile:36,42-45` · `docker-compose.dev.yml:33`

## Enlaces
[[INFRA-20260826-dockerizacion-stack]] · [[2026-08-27-planner-cierre-run-caja]] ·
[[2026-08-30-planner-paso0-resync]]
