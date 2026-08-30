---
tags: [adr, infra, deploy, azure, tls, seguridad]
status: aceptada
updated: 2026-08-30
---

# ADR-INFRA-20260830 — Deploy en Azure: TLS termina en Caddy, la base se alcanza por firewall + túnel SSH

## Contexto
El commit `abee9d8` trajo un pase de preparación para deploy en Azure —`DB_SSLMODE`,
el bloque HTTPS de `production.py`, la sección de `.env.example`— **sin ADR, sin RUN y
sin guía** ([[INFRA-20260830-deploy-azure-sin-registro]]). La decisión de topología
vivía en un comentario de código (`production.py:17-20`) y la pieza que la implementa
—el borde TLS— no existía en el repo.

El owner pidió el 2026-08-30 ejecutar la guía de despliegue y descubrió lo mismo: **no
había guía**. Su pregunta concreta era de red: cómo hacer que la base acepte a la VM, y
cómo entrar él con DBeaver desde un MacBook **sin IP estática**.

## Decisión

### 1. TLS termina en **Caddy**, que habla HTTP a nginx en la red privada
Se ratifica lo que el comentario de `production.py:17-20` ya declaraba, y se implementa:
`docker/caddy/Caddyfile` + `docker/caddy/Dockerfile` + un servicio `caddy` en
`docker-compose.prod.yml` detrás del **perfil `edge`**.

**Por qué Caddy y no nginx como borde:** `docker/nginx/prod.conf:14-17` tiene un
`map $http_x_forwarded_proto` que **respeta** el header entrante — que es lo correcto
detrás de un borde, y un agujero si nginx queda expuesto: cualquiera manda
`X-Forwarded-Proto: https` sobre texto plano y `request.is_secure()` devuelve `True`.
Caddy, en cambio, **descarta** los `X-Forwarded-*` del cliente y pone los suyos. La doc
de Django exige explícitamente ese comportamiento del proxy antes de usar
`SECURE_PROXY_SSL_HEADER`.

**Por qué detrás de un perfil:** el mismo `up prod` se usa para correr en la LAN por
HTTP. Un Caddy sin perfil arrancaría también ahí, intentaría sacar certificado para un
dominio que no resuelve y quemaría el límite de 5 validaciones fallidas por hora de
Let's Encrypt.

### 2. La base la alcanza la VM por **una** regla de firewall; el owner entra por **túnel SSH**
Son dos problemas distintos y no se resuelven igual:

- **VM → base:** una regla de firewall con la IP de **salida** de la VM. Una sola.
- **MacBook → base:** **túnel SSH a través de la VM**, con la pestaña SSH de DBeaver.

El Mac **nunca toca el firewall de la base**. Quien se conecta a Postgres es la VM, que
ya tiene su regla; el owner llega a la VM con su llave SSH. El problema de la IP
dinámica **no se administra: desaparece**. Y la contraseña de la base pasa a ser el
segundo factor, detrás de la llave SSH, en vez de ser el único.

## Alternativas descartadas, con el número que las descarta

| opción | por qué no |
|---|---|
| **Script que actualiza la regla de firewall con la IP actual** | Hasta 5 min de propagación, acumula IPs viejas que el ISP reasigna a terceros, solo IPv4, y deja el 5432 escuchando a internet con un solo factor. Es la tentación obvia y la peor. |
| **Azure Bastion** | Su tunneling apunta a **VMs**, no al 5432 de un servicio PaaS; el SKU gratuito ni siquiera trae cliente nativo. Standard ~USD 211/mes. |
| **VPN point-to-site** | El SKU Basic (USD 26,28/mes) **no sirve desde macOS**: sin IKEv2, y SSTP es solo Windows. El primer SKU usable es VpnGw1: **USD 138,70/mes** 24/7. |
| **Tailscale / WireGuard** | Plan B razonable si entra más gente al equipo. Hoy es una pieza más para resolver algo que el SSH ya resuelve. |
| **Microsoft Entra ID con identidad administrada** | Se ve elegante y sale caro en código: el token **es** la contraseña y vence (1 h usuario / 24 h identidad administrada), pero `base.py:67` guarda `PASSWORD` como string estático y `CONN_MAX_AGE` está en 0. Habría que refrescar la credencial en caliente. |

## Consecuencias

**Buenas**
- El borde queda con una sola pieza, con certificado automático y renovación sola.
- El firewall de la base queda con **una** regla, o con **cero** si es private access.
- Costo adicional: **USD 0**.

**Lo que hay que aceptar**
- Depender de que la VM esté viva para entrar a la base con DBeaver. Es aceptable: si la
  VM está caída, el POS tampoco funciona.
- Por el túnel hay que usar `sslmode=require`, no `verify-full`: el certificado dice
  `*.postgres.database.azure.com` y el cliente cree hablar con `localhost`.

## Lo irreversible que hay que mirar ANTES
**El modo de red de un Flexible Server no se puede cambiar después de creado**
(*"We currently don't support moving in and out of a virtual network"*). Un servidor
creado en **public access** hoy sí acepta **Private Endpoint** (Private Link, GA) — la
propia doc de Microsoft lo llama *"a recommended alternative"* a la integración con
VNet. Lo inverso no existe: un servidor con VNet integration nunca tendrá endpoint
público ni private endpoints.

Por eso el paso 0 del runbook es averiguar en qué modo quedó, y no es negociable.

## Orden de encendido — no es un detalle, es la decisión
```
DNS + NSG  →  Caddy en staging  →  Caddy real  →  SECURE_SSL=1  →  HSTS 0→300→86400→31536000
```
Prender `SECURE_SSL=1` antes de que exista el certificado **no da un error legible**: da
un 301 permanente que el navegador **cachea**, un bucle de redirect y un login de admin
que rebota porque las cookies `Secure` no vuelven sobre HTTP. Tres síntomas, una causa.

## Entregado
- `docs/azure-deploy.md` — el runbook (13 pasos + tabla de 10 trampas).
- `docker/caddy/Caddyfile` · `docker/caddy/Dockerfile` — el borde.
- Servicio `caddy` con `profiles: ["edge"]` en `docker-compose.prod.yml` + sus volúmenes.
- `.env.example` — `DOMAIN`, `ACME_EMAIL`, la nota de `BIND_HOST` y la de `ALLOWED_HOSTS`.
- `CLAUDE.md` raíz — puntero a la guía y a la topología del borde.

## ⚠️ Lo que NO se pudo verificar
- **Nada se ejecutó contra la suscripción del owner**: `az` no está instalado en este
  entorno y no hay credenciales. Todos los comandos salen de la doc oficial.
- **La imagen de Caddy no se pudo construir**: el daemon de Docker estaba apagado. El
  YAML del compose **sí** se validó (`yaml.safe_load` → 4 servicios, 2 volúmenes).
- No se sabe en qué modo de red quedó la base del owner, ni el tier, ni si tildó
  geo-redundancia (irreversible).

## Enlaces
[[INFRA-20260830-deploy-azure-sin-registro]] · [[ADR-INFRA-20260826-docker-nginx-mismo-origen]] ·
[[BACKEND-20260811-falta-https-enforcement-produccion]] · [[INFRA-20260826-dockerizacion-stack]] ·
[[2026-08-30-planner-paso0-resync]]
