---
tags: [tarea, infra, seguridad, deploy, git]
status: 🟡
prioridad: 🔒 alta
updated: 2026-09-13
---

# INFRA-20260913-clave-ssh-de-la-vm-sin-ignorar — la llave privada del servidor está a un `git add -A` de GitHub

> [!success] Mitigado el 2026-09-13 — el `.gitignore` ya la cubre (pedido del owner)
> Se agregó una sección de material criptográfico al `.gitignore` de la raíz (`:83-90`): `*.pem`,
> `*.key`, `*.p12`, `*.pfx`, `id_rsa*`, `id_ed25519*`. Verificado:
> `git check-ignore -v elvuelto-vm_key.pem` → **exit 0** (`.gitignore:84:*.pem`), y `git add -An` ya
> **no la lista**. El historial sigue limpio, así que la ventana se cerró sin que nada se filtrara.
>
> **Lo que sigue abierto:** la clave **todavía vive en el árbol del repo**. Ignorada ya no se sube, pero
> un secreto de infraestructura no debería estar ahí — el paso 1 de abajo (moverla a `~/.ssh/`) sigue
> pendiente, igual que la advertencia en `docs/azure-deploy.md` (paso 5). Por eso la ficha queda 🟡 y
> no 🟢.

> [!danger] El estado original (2026-09-13, antes del arreglo) — se conserva como historia
> El repositorio es **público** y la clave privada de la VM **no estaba ignorada**.
> `elvuelto-vm_key.pem` vivía sin trackear en la raíz del repo, sin ninguna regla del `.gitignore` que
> la cubriera: un `git add -A` la metía al commit y el próximo `git push` la publicaba en internet.
> Toda la evidencia de abajo describe **ese** estado. Ver el callout verde del encabezado para lo que
> cambió.

## La evidencia
| chequeo | resultado |
|---|---|
| el archivo | `elvuelto-vm_key.pem`, 387 bytes, permisos `-rw-------` (600), mtime **2026-08-28 13:22** |
| contenido | empieza con `-----BEGIN OPENSSH PRIVATE KEY-----` — es la clave **privada**, no la pública |
| `git status --porcelain` | `?? elvuelto-vm_key.pem` — **untracked, no ignorado** |
| `git check-ignore -v elvuelto-vm_key.pem` | **exit 1** = ninguna regla del `.gitignore` la matchea |
| **`git add -An`** (dry-run, no escribe el índice) | imprime literal **`add 'elvuelto-vm_key.pem'`** — no es inferencia: es git diciendo que la entraría |
| los **4** `.gitignore` del repo | cero reglas `*.pem`, `*.key`, `id_rsa`, `*.p12`, `*.pfx` (sí ignora `.env` en `:2`) |
| visibilidad del repo | `https://api.github.com/repos/betancito/ElVuelto-POS` → **`"private": false`**, `"visibility": "public"` |

La fecha del archivo (08-28) encaja con el despliegue: es la clave con la que se entra por SSH a la VM
de Azure `20.36.129.173`, que hoy corre la producción de [[INFRA-20260913-el-deploy-a-azure-ya-corrio]].

## Por qué es crítica y no higiene
Quien tenga esa clave **entra a la VM de producción**. Adentro de la VM está el `.env` de prod: la
`DJANGO_SECRET_KEY`, las credenciales de la base de Azure, las de Cloudinary y la `DOCS_API_KEY`. No es
"un secreto": es la llave maestra de todo el stack desplegado.

Y el modo de falla no requiere un error de juicio, solo un tecleo de rutina: `git add -A`, `git add .`
o un `git commit -a` desde un editor. Los tres son el gesto normal para commitear el trabajo pendiente
—y **hoy hay trabajo pendiente sin commitear** (`docker-compose.prod.yml`), justo el contexto en el que
uno hace `git add -A`.

> [!danger] Agravante: el mismo `git add -A` publica la llave, la dirección **y** el instructivo
> El dry-run no lista solo el `.pem`. Lista también las **notas de este PASO 0**, que hoy están
> untracked y contienen: (1) la **IP pública de la VM** — `git grep -I '20.36.129.173' HEAD` → **0
> resultados**, o sea que hoy **no** está en el repo público; (2) el stack del borde con versiones
> (`Caddy` + `nginx/1.31.4`); y (3) esta misma ficha, que es un documento en español explicando qué
> abre ese archivo. Un solo commit entregaría **la llave, la dirección y el manual**.

> [!warning] El historial está limpio — todavía
> Verificado por **cinco** vías independientes: `git log --all --diff-filter=A --name-only` filtrado por
> `pem|key|p12|pfx|id_rsa|.env` → **ninguno**; y `git log -p --all -S` sobre las cuatro cabeceras PEM
> (`BEGIN OPENSSH PRIVATE KEY`, `BEGIN RSA PRIVATE KEY`, `BEGIN PRIVATE KEY`, `BEGIN EC PRIVATE KEY`) →
> **0 commits** en las cuatro. La clave **nunca entró** a un commit, y ningún `.env` real tampoco. Por
> eso esto se arregla en un minuto hoy, y sería una rotación completa de credenciales mañana.

> [!info] Lo que la auditoría NO encontró (y vale registrar)
> El repo público **no filtra ningún secreto real**: los tres `.env.example`, `docs/azure-deploy.md`
> (623 líneas) y `docker/**` usan placeholders de punta a punta (`<rg>`, `<server>`, `<usuario>`,
> `~/.ssh/<tu-llave>`), sin un solo nombre de resource group, servidor, usuario SSH ni IP pública.
> Un grep dirigido por valores con pinta de secreto (`SECRET_KEY|PASSWORD|API_SECRET|TOKEN` seguidos de
> 16+ caracteres) da **cero**. El hueco es exclusivamente el material criptográfico en el árbol de
> trabajo — nunca se contempló en ninguno de los 4 `.gitignore`.

## Qué hay que hacer (es del owner: el Planner no toca código ni git — [[GOBERNANZA]] §0)
1. **Sacar la clave del repo.** Moverla a `~/.ssh/elvuelto-vm_key.pem` (con `chmod 600`) y apuntar ahí
   el `ssh -i` / el `~/.ssh/config`. Un secreto de infraestructura no vive en un árbol de trabajo.
2. **Blindar el `.gitignore` igual** — aunque la clave ya no esté, para la próxima:
   ```
   *.pem
   *.key
   *.p12
   *.pfx
   id_rsa*
   ```
3. **Revisar en la VM** que `~/.ssh/authorized_keys` tenga solo la pública que corresponde.
4. Si en algún momento se sospecha que salió del Mac: **rotar la clave** en el portal de Azure y borrar
   la vieja de `authorized_keys`. Hoy no hay evidencia de que haya salido.
5. **Agregarle la advertencia a `docs/azure-deploy.md`.** El runbook **nunca menciona la palabra
   `.pem`** ni advierte que la clave no viva en el repo — verificado: cero hits en todos los `.md` del
   repo. A su favor: las tres veces que apunta a la clave lo hace a `~/.ssh/<tu-llave>` (`:144`,
   `:161`, `:188`), así que **enseña la convención correcta sin decirla**. Falta el renglón explícito
   junto al bloque SSH de `:126-168`.

## Criterio de aceptación
**`git add -An` no lista ningún `.pem`**, y `git check-ignore -v elvuelto-vm_key.pem` sale con
**exit 0**. Los dos: mover el archivo sin blindar el `.gitignore` cierra el incidente de hoy y deja el
repo igual de desnudo para el próximo `.pem` — y el runbook de deploy invita a manejar llaves SSH, así
que va a haber un próximo.

## Enlaces
[[INFRA-20260913-el-deploy-a-azure-ya-corrio]] · [[INFRA-20260830-deploy-azure-sin-registro]] ·
[[ADR-INFRA-20260830-deploy-azure-tls-en-el-borde]] · [[GOBERNANZA]] ·
[[2026-09-13-planner-paso0-resync]]
