---
tags: [tarea, infra, deploy, dns, produccion]
status: 🔴
prioridad: alta
updated: 2026-09-13
---

# INFRA-20260913-dominio-apunta-tambien-al-parking — `elvuelto.online` resuelve a dos servidores, y uno no es el nuestro

> [!danger] La mitad de las visitas por `http://` caen en la página de parking del registrador
> El dominio tiene **dos registros A** en round-robin. Uno es la VM de Azure con la app. El otro es el
> servidor de estacionamiento de DonDominio, que nunca se quitó cuando se apuntó el dominio al deploy.

## La evidencia (verificada el 2026-09-13)
```
$ dig +short elvuelto.online A        # seis consultas seguidas, el orden rota
31.214.178.55  20.36.129.173
20.36.129.173  31.214.178.55
31.214.178.55  20.36.129.173   ...
```

| IP | quién es | :80 | :443 |
|---|---|---|---|
| `20.36.129.173` | la VM de Azure — **la app** | `308 → https://elvuelto.online/`, `Server: Caddy` | HTTP/2 **200**, `via: 1.1 Caddy`, `server: nginx/1.31.4` |
| `31.214.178.55` | PTR → **`parkingsrv0.dondominio.com`** | `302 → http://www.elvuelto.online/`, `Server: Apache`, setea `PHPSESSID` | **conexión rechazada** (no escucha) |

`www.elvuelto.online` resuelve a **las mismas dos IPs**, así que el 302 del parking puede volver a caer
en el parking.

> [!danger] Y `www` está **100% roto**, que cierra el círculo
> ```
> $ curl -sSI https://www.elvuelto.online/
> curl: (35) LibreSSL/3.3.6: error:1404B438:SSL routines:ST_CONNECT:tlsv1 alert internal error
> ```
> Caddy **no tiene sitio ni certificado para `www`** (el `Caddyfile` solo declara el apex), así que el
> handshake TLS falla. Junte las dos piezas y queda un lazo cerrado de rotura:
> el cliente teclea `elvuelto.online` → 50% cae en el parking → `302` a **`www`** → por https el
> handshake **falla** y por http vuelve al parking. Quien caiga de ese lado **no llega nunca**.

## Los tres efectos, de menor a mayor
1. **HTTPS sigue funcionando, pero con un tropiezo.** Como el parking **rechaza** el 443, el navegador
   reintenta contra la otra IP y entra. Verificado: 8 GET seguidos a `https://elvuelto.online/`
   terminaron los 8 en `20.36.129.173` con 200. El costo es un intento fallido de conexión ~50% de las
   veces — se siente como "a veces abre lento".
2. **Por `http://` —que es lo que teclea una persona— se cae la moneda.** ~50% de las veces la petición
   llega al Apache del parking, que responde `302` a `www.` y nunca toca la app. El cajero o el cliente
   que escribe `elvuelto.online` en la barra no llega al POS.
3. **El que asusta: la renovación del certificado.** El cert actual es Let's Encrypt
   `CN=elvuelto.online`, emitido **2026-08-30 18:59 GMT**, vence **2026-11-28 18:59 GMT**. Caddy va a
   intentar renovarlo alrededor del **2026-10-29** (30 días antes). El desafío ACME —HTTP-01 al `:80` o
   TLS-ALPN-01 al `:443`— lo valida Let's Encrypt desde **varios puntos de red**, y cada uno resuelve el
   dominio por su cuenta: los que saquen la IP del parking se encuentran un `302` de Apache (en `:80`) o
   una conexión rechazada (en `:443`). Con validación multi-perspectiva, **basta que fallen algunas
   perspectivas para que la renovación no pase**.
   > [!question] Esto es una deducción del mecanismo, no un hecho observado
   > La emisión del 08-30 **sí** funcionó. No sé si ese día el registro del parking ya estaba puesto o
   > lo re-agregó el registrador después. Lo verificable hoy es el mecanismo y las dos IPs; el
   > resultado de octubre es un riesgo, no una certeza. Se comprueba mirando los logs de Caddy
   > (`docker logs` del servicio `caddy`, o `journalctl -u caddy` si corre en el host) después del
   > primer intento de renovación.

## Qué hay que hacer
1. **Borrar el registro A `31.214.178.55`** en el panel DNS de DonDominio (y desactivar el parking si
   el panel lo ofrece aparte). Debe quedar **un solo A** → `20.36.129.173`.
2. **Decidir qué hace `www`**: o un `CNAME` a `elvuelto.online`, o un A a la misma IP de Azure. Hoy
   hereda las dos y el redirect del parking apunta justo ahí.
3. Confirmar después: `dig +short elvuelto.online A` devuelve **una** línea, y
   `curl -sI http://elvuelto.online` da `308` de Caddy **siempre**, no una vez sí y otra no.
4. Si el `Caddyfile` no maneja `www`, agregarlo para que no quede un host sin cert.

## Criterio de aceptación
`dig +short elvuelto.online A` y `dig +short www.elvuelto.online A` devuelven **solo** la IP de la VM, y
diez `curl -sI http://elvuelto.online` seguidos dan diez `308 → https` de Caddy.

## Enlaces
[[INFRA-20260913-el-deploy-a-azure-ya-corrio]] · [[ADR-INFRA-20260830-deploy-azure-tls-en-el-borde]] ·
[[INFRA-20260830-deploy-azure-sin-registro]] · [[2026-09-13-planner-paso0-resync]]
