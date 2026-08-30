# Despliegue en Azure — runbook de ElVuelto

Guía para poner ElVuelto en producción sobre una **VM de Azure** con **Azure Database
for PostgreSQL – Flexible Server**, dominio propio y HTTPS.

Complementa [`docker.md`](docker.md), que explica el stack en sí (nginx, mismo origen,
`manage-docker.sh`). Acá está lo que cambia cuando el stack sale de la LAN.

> **Escrito el 2026-08-30** contra `HEAD abee9d8`. Los datos de Azure se verificaron
> contra `learn.microsoft.com` ese día; los de precios, contra la Retail Prices API.
> Lo que **no** se pudo verificar está marcado como tal — no se inventó nada.

---

## 0. El paso que hay que dar antes que todos: en qué modo quedó tu base

**El modo de red de un Flexible Server no se puede cambiar después de creado.** La doc
de límites lo dice textual: *"We currently don't support moving in and out of a virtual
network"*. No hay comando que lo mueva; la única salida es crear otro servidor y migrar
con `pg_dump`/`pg_restore`.

Así que lo primero es averiguar qué tenés:

```bash
az postgres flexible-server show \
  --resource-group <rg> \
  --name <server> \
  --query "{publico:network.publicNetworkAccess, subnet:network.delegatedSubnetResourceId}" \
  -o jsonc
```

| resultado | qué significa |
|---|---|
| `subnet: null` | **Public access.** Se controla con reglas de firewall por IP. Admite además agregarle un Private Endpoint más adelante. Es el caso común y el más flexible. |
| `subnet: "/subscriptions/…"` | **Private access (VNet integration).** No tiene endpoint público, no acepta reglas de firewall y **no admite private endpoints**. Solo se llega desde adentro de la VNet. |

Lo que sí cambió respecto de lo que dice medio internet: hoy **un servidor creado en
public access acepta Private Endpoint** (Private Link, GA), y la propia doc de Microsoft
lo llama *"a recommended alternative"* a la integración con VNet. Lo que sigue sin
poderse es lo inverso.

> **Si quedó en private access / VNet:** no hay drama para la VM (si está en la misma
> VNet, se conecta directo y no hace falta ninguna regla de firewall), y tu DBeaver
> también funciona — porque el túnel SSH del paso 3 resuelve el nombre **desde la VM**.
> Saltate el paso 2.

---

## 1. La respuesta corta a tu pregunta

Tenés dos problemas distintos y **no se resuelven con la misma herramienta**:

**a) Que la base acepte a la VM** → una regla de firewall con la **IP de salida de la
VM**. Una sola regla, una sola IP. (Paso 2.)

**b) Que vos entres con DBeaver desde el MacBook que cambia de IP** → **un túnel SSH a
través de la VM.** No una regla de firewall. (Paso 3.)

La clave: con el túnel, **tu Mac nunca toca el firewall de la base**. El que se conecta
a Postgres es la VM, que ya tiene su regla. Vos te conectás a la VM por SSH con tu llave
—que es lo que ya tenés— y da igual desde qué WiFi. El problema de la IP dinámica no se
administra: desaparece.

Y la contraseña fuerte de la base pasa a ser el **segundo** factor, detrás de tu llave
SSH, en vez de ser el único.

### Lo que descarté, y por qué

| opción | veredicto |
|---|---|
| **Script que actualiza la regla de firewall con tu IP actual** | Es la tentación obvia. **No.** Tarda hasta 5 minutos en propagar, va dejando abiertas IPs viejas que el ISP le reasigna a desconocidos, es solo IPv4, y deja el 5432 de la base de ventas escuchando a internet con un solo factor. |
| **Azure Bastion** | **No sirve para esto.** Su tunneling apunta a VMs, no al 5432 de un servicio PaaS; y el SKU gratuito ni siquiera trae cliente nativo. Standard: ~USD 211/mes. |
| **VPN point-to-site** | El SKU Basic (USD 26,28/mes) **no sirve desde macOS**: no soporta IKEv2 y SSTP es solo Windows. El primer SKU usable es VpnGw1, **USD 138,70/mes** prendido 24/7. Desproporcionado. |
| **Tailscale / WireGuard en la VM** | Plan B razonable si algún día entra más gente al equipo (Personal es gratis hasta 6 usuarios, con la VM de subnet router). Hoy es una pieza más que mantener para resolver algo que el SSH ya resuelve. |
| **Túnel SSH por la VM** | ✅ **USD 0**, la VM ya está pagada, funciona igual en public y en private access, DBeaver lo trae nativo con botón de test. |

---

## 2. Que la base acepte a la VM *(saltear si quedó en private access)*

### 2.1 Averiguar la IP que la base realmente ve

Ojo: **no siempre es la IP pública de la NIC.** Si hay NAT Gateway o Load Balancer, la
IP de salida es otra. La forma segura es preguntárselo a la VM:

```bash
# desde adentro de la VM
curl -s https://ifconfig.me; echo
```

Y confirmá que la IP pública sea **estática**, no dinámica — si es dinámica, un
`stop/deallocate` la cambia y la app deja de conectar sin que nadie haya tocado nada:

```bash
az network public-ip show -g <rg> -n <nombre-ip> \
  --query '{ip:ipAddress, sku:sku.name, alloc:publicIPAllocationMethod}' -o table
```

### 2.2 La regla

```bash
az postgres flexible-server firewall-rule create \
  --resource-group <rg> \
  --name <server> \
  --rule-name permitir-vm-elvuelto \
  --start-ip-address <IP-SALIDA-VM> \
  --end-ip-address   <IP-SALIDA-VM>
```

### 2.3 Lo que NO hay que tildar, nunca

> ⚠️ **"Allow public access from any Azure service within Azure to this server"**
> (equivale a la regla `0.0.0.0`–`0.0.0.0`).
>
> No significa "mis recursos de Azure". La advertencia oficial dice que incluye
> *"connections from the subscriptions of other customers"*: **cualquier inquilino de
> Azure**, no solo vos. Si está prendida, sacala.

```bash
# auditar qué reglas hay hoy
az postgres flexible-server firewall-rule list -g <rg> -n <server> -o table
```

---

## 3. DBeaver desde el Mac, por túnel SSH

### 3.1 Confirmar que la VM permite forwarding

```bash
# en la VM
sudo sshd -T | grep -i allowtcpforwarding      # tiene que decir: allowtcpforwarding yes
sudo grep -E '^(PasswordAuthentication|PermitRootLogin)' /etc/ssh/sshd_config
```

Si `PasswordAuthentication` está en `yes`, **pasalo a `no` y reiniciá `sshd`**. Con el
22 abierto a internet, el password se come ataques de fuerza bruta todo el día. Vos ya
usás llave, así que no perdés nada.

### 3.2 Probar el túnel a mano, antes de tocar DBeaver

```bash
# desde el MacBook
ssh -i ~/.ssh/<tu-llave> -N \
  -L 15432:<server>.postgres.database.azure.com:5432 \
  <usuario>@<IP-PUBLICA-VM>
```

Y en otra terminal:

```bash
psql "host=127.0.0.1 port=15432 dbname=elvuelto user=<usuario-db> sslmode=require"
```

Dejalo fijo en `~/.ssh/config` para no repetir el comando:

```
Host elvuelto-vm
  HostName <IP-PUBLICA-VM>
  User <usuario>
  IdentityFile ~/.ssh/<tu-llave>
  LocalForward 15432 <server>.postgres.database.azure.com:5432
  ServerAliveInterval 30
  ServerAliveCountMax 3
  ExitOnForwardFailure yes
```

Después alcanza con `ssh -N elvuelto-vm`.

### 3.3 En DBeaver

Pestaña **Main**:

| campo | valor |
|---|---|
| Host | `<server>.postgres.database.azure.com` |
| Port | `5432` |
| Database | `elvuelto` |

Pestaña **SSH** (tildar *Use SSH Tunnel*):

| campo | valor |
|---|---|
| Host/IP | IP pública de la VM |
| Port | `22` |
| User name | tu usuario de la VM |
| Authentication method | `Public Key` |
| Private key | `~/.ssh/<tu-llave>` |

Botón **Test tunnel configuration** antes de guardar.

> **Trampa 1 — dónde va cada host.** Con la pestaña SSH de DBeaver, en *Main* va el
> **FQDN de Azure**, no `localhost`: DBeaver arma el túnel y resuelve el destino en el
> extremo remoto. Si en cambio levantás el túnel a mano con `ssh -L`, entonces sí va
> `localhost` / `15432` en *Main* y la pestaña SSH queda deshabilitada. Mezclar las dos
> variantes es el error más común.

> **Trampa 2 — el SSL por el túnel.** Azure exige TLS y recomienda `verify-full`, pero
> a través del túnel el certificado dice `*.postgres.database.azure.com` mientras el
> cliente cree hablar con `localhost` → la verificación de hostname **falla**. Por el
> túnel usá **`sslmode=require`**. (Esto es solo para tu DBeaver; la app en la VM se
> conecta directo y no tiene ese problema.)

---

## 4. Los usuarios de la base

El usuario que te dio Azure al crear el servidor es el **admin**: tiene `CREATEDB` y
`CREATEROLE`. La app en runtime **no ejecuta un solo DDL** — las 18 migraciones no
tienen ni un `RunSQL` ni un `CreateExtension` — así que no necesita ese poder.

```sql
-- conectado como el admin del servidor
CREATE ROLE elvuelto_app LOGIN PASSWORD '<otra contraseña larga>';
GRANT CONNECT ON DATABASE elvuelto TO elvuelto_app;
\c elvuelto
GRANT USAGE ON SCHEMA public TO elvuelto_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO elvuelto_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO elvuelto_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO elvuelto_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO elvuelto_app;
```

Las **migraciones** se corren con el admin (crean tablas); la **app** corre con
`elvuelto_app`.

---

## 5. Apuntar el dominio (DonDominio)

1. Entrá al panel → **Dominios** → tu dominio → pestaña **Zona DNS**.
2. **Borrá el registro `ANAME`** de la raíz. DonDominio lo trae por defecto y es lo que
   impide poner un `A` en su lugar.
3. **Creá un registro `A`**: nombre vacío (o `@`, según cómo lo muestre el panel) →
   valor: la **IP pública de la VM**.
4. El `www`: DonDominio trae un `CNAME` apuntando a la raíz. Si lo dejás así, `www`
   sigue a la raíz solo. Si preferís, poné otro `A` con el mismo IP.
5. Guardá y esperá la propagación.

Antes de seguir, **verificá los tres chequeos que evitan el 90% de los fallos de
Let's Encrypt**:

```bash
dig +short A    pos.midominio.co    # tiene que dar la IP de la VM
dig +short AAAA pos.midominio.co    # tiene que estar VACÍO si no hay IPv6 real
dig +short CAA  midominio.co        # vacío, o que incluya letsencrypt.org
```

> Un `AAAA` apuntando a una IPv6 que la VM no tiene **rompe la emisión del
> certificado**: Let's Encrypt intenta IPv6 primero y falla, aunque el `A` esté
> perfecto. Y un `CAA` que no incluya `letsencrypt.org` la bloquea con un error que ni
> siquiera menciona el DNS.

---

## 6. El NSG de la VM

Abrí **solo** 80, 443 y 22. **No** abras 5173 ni 8000.

```bash
RG=<rg>; NSG=<nombre-nsg>

az network nsg rule create -g $RG --nsg-name $NSG -n allow-http-80 \
  --priority 100 --direction Inbound --access Allow --protocol Tcp \
  --source-address-prefixes Internet --destination-port-ranges 80

az network nsg rule create -g $RG --nsg-name $NSG -n allow-https-443 \
  --priority 110 --direction Inbound --access Allow --protocol Tcp \
  --source-address-prefixes Internet --destination-port-ranges 443

# auditar que no quedó nada de más
az network nsg rule list -g $RG --nsg-name $NSG -o table
```

> **El firewall del sistema operativo NO te salva.** Docker publica puertos escribiendo
> reglas DNAT en `iptables` que **pasan por encima de `ufw`**. "Lo cerré con ufw" es
> falsa tranquilidad en un host Linux con Docker. En Azure el NSG sí aplica porque está
> afuera de la VM — es el único borde real.

Comprobá desde afuera:

```bash
nc -zv <IP-PUBLICA-VM> 5173 8000     # tienen que fallar
```

---

## 7. Los dos `.env` — y la regla que se paga cara

**Ninguno de los dos viene en el clone.** Y **no son intercambiables**.

```bash
cp .env.example .env
cp el_vuelto_backend/.env.example el_vuelto_backend/.env
```

### La regla madre

`docker-compose.yml` declara **seis** variables bajo `environment:`, y `environment`
le gana a `env_file` **incluso cuando el valor es vacío**. Esas seis **solo funcionan
en el `.env` de la RAÍZ**; ponerlas en `el_vuelto_backend/.env` se ignora en silencio:

```
DB_HOST · DB_PORT · DB_SSLMODE · ALLOWED_HOSTS · CSRF_TRUSTED_ORIGINS · CORS_ALLOWED_ORIGINS
```

> **Por qué importa tanto `CSRF_TRUSTED_ORIGINS`.** El compose declara
> `CSRF_TRUSTED_ORIGINS: ${CSRF_TRUSTED_ORIGINS:-}`. Si no la definís en el `.env` de la
> raíz, llega al contenedor como **cadena vacía**; `python-decouple` la toma porque
> *está presente*, así que el default de `settings/base.py` **nunca dispara** y la lista
> queda en `[]`.
>
> Y el síntoma engaña: **el POS sigue funcionando perfecto** (DRF marca toda `APIView`
> como `csrf_exempt` y el proyecto usa solo JWT). Lo que muere con **403** es el login
> de `/admin/` y el de `/docs/login/` — justo por donde entrarías a crear el primer
> negocio. Es una tarde entera buscando el problema en el lugar equivocado.

### `.env` de la RAÍZ

```bash
# base
DB_HOST=<server>.postgres.database.azure.com
DB_PORT=5432
DB_SSLMODE=require            # el default es `prefer`, que acepta texto plano en silencio

# dominio
ALLOWED_HOSTS=pos.midominio.co
CSRF_TRUSTED_ORIGINS=https://pos.midominio.co
CORS_ALLOWED_ORIGINS=https://pos.midominio.co

# borde TLS
DOMAIN=pos.midominio.co
ACME_EMAIL=vos@midominio.co

# no publicar el stack en la IP pública: Caddy es el único que mira a internet
BIND_HOST=127.0.0.1

# HTTPS de Django — SE PRENDE DESPUÉS, en el paso 10. Por ahora dejalo comentado.
# SECURE_SSL=1
# SECURE_HSTS_SECONDS=0

TAG=prod
GUNICORN_WORKERS=1            # ver la nota de rate limiting más abajo
```

> `ALLOWED_HOSTS` tiene una trampa propia: el compose lo declara como
> `${ALLOWED_HOSTS:-*}`. Si **borrás** la línea, el default no es el de `production.py`
> — es `*`, o sea validación de host **apagada**. Ponelo siempre.

### `el_vuelto_backend/.env`

```bash
DJANGO_SETTINGS_MODULE=elvuelto.settings.production
DJANGO_SECRET_KEY=<uno NUEVO, no el de tu Mac>
DB_NAME=elvuelto
DB_USER=elvuelto_app
DB_PASSWORD=<la del rol de la app>
CLOUDINARY_CLOUD_NAME=…
CLOUDINARY_API_KEY=…
CLOUDINARY_API_SECRET=…
DOCS_API_KEY=<una larga, o dejá /docs/ fuera del NSG>
```

Generá una `SECRET_KEY` nueva:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

> **No reuses la de desarrollo.** `simplejwt` firma los tokens con `SECRET_KEY`: quien
> la tenga puede fabricar un JWT con el `tenant_id` y el `rol` que quiera, y
> `TenantMiddleware` lee el `tenant_id` directo del token. Es suplantación de cualquier
> negocio, incluido SUPERADMIN, sin tocar la base. Y rotarla después mata todas las
> sesiones vivas de golpe — hacelo fuera del horario de caja.

Permisos del archivo:

```bash
chmod 600 .env el_vuelto_backend/.env
```

---

## 8. Primer arranque, todavía sin TLS

`up prod` **no buildea, no migra y no crea superusuario**. El orden real es:

```bash
TAG=$(git rev-parse --short HEAD) ./scripts/manage-docker.sh build prod
./scripts/manage-docker.sh up prod
./scripts/manage-docker.sh migrate prod
./scripts/manage-docker.sh createsuperuser prod
```

> **Las migraciones necesitan el usuario admin**, porque crean tablas; `elvuelto_app`
> solo tiene DML. Como `DB_USER` sale de `el_vuelto_backend/.env`, la forma simple es:
> poné ahí el **admin** para correr `migrate`, y **después** cambialo a `elvuelto_app` y
> recreá el backend. Repetí lo mismo en cada deploy que traiga migraciones nuevas —
> `docker-compose.prod.yml` fija `RUN_MIGRATIONS: "0"` a propósito, para que un restart
> nunca migre la base de producción por sorpresa.

```bash
# antes de cada deploy: confirmar que no quedaron migraciones sin correr
./scripts/manage-docker.sh migrate prod backend --check
```

> El script toma los argumentos como `<cmd> <env> [servicio] [extra]`, por eso va
> `migrate prod backend --check` y no `migrate prod --check`: en la segunda forma
> `--check` se interpreta como el **nombre del servicio**.

Comprobá que vive antes de seguir:

```bash
curl -sS http://127.0.0.1:5173/healthz           # 'ok'
```

---

## 9. TLS con Caddy — ensayo primero

El repo trae `docker/caddy/` (Caddyfile + Dockerfile) y un servicio `caddy` en
`docker-compose.prod.yml` detrás del perfil `edge`, así que **`up prod` normal lo
ignora** — el mismo `up prod` se usa en la LAN por HTTP, y un Caddy suelto ahí quemaría
el límite de validaciones fallidas de Let's Encrypt.

**Ensayo (certificado de mentira, todo el baile real):** descomentá la línea `acme_ca`
del `docker/caddy/Caddyfile`, y:

```bash
COMPOSE_PROFILES=edge ./scripts/manage-docker.sh build prod
COMPOSE_PROFILES=edge ./scripts/manage-docker.sh up prod
COMPOSE_PROFILES=edge ./scripts/manage-docker.sh logs prod caddy    # Ctrl+C para salir
```

El navegador se va a quejar del certificado: **es lo esperado**. Lo que importa es ver
`certificate obtained` en el log.

**Real:** volvé a comentar `acme_ca`, rebuildeá, y verificá:

```bash
curl -sSI https://pos.midominio.co/healthz       # 200, SIN --insecure
curl -sSI http://pos.midominio.co/healthz        # 308 → https, lo pone Caddy solo
```

Validar el Caddyfile sin levantar nada:

```bash
docker build -t elvuelto-caddy:check ./docker/caddy
docker run --rm -e DOMAIN=pos.midominio.co -e ACME_EMAIL=vos@midominio.co \
  elvuelto-caddy:check caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
```

---

## 10. Recién ahora se prende `SECURE_SSL`

> **El orden no es negociable, y al revés no da un error legible.** Prender
> `SECURE_SSL=1` antes de que el certificado exista produce **tres síntomas distintos
> con una sola causa**: un 301 permanente que el navegador **cachea**, un bucle de
> redirect, y un login de admin que rebota porque las cookies `Secure` no vuelven sobre
> HTTP. Primero el TLS, después Django.

En el `.env` de la raíz, descomentá:

```bash
SECURE_SSL=1
SECURE_HSTS_SECONDS=0
```

Y recreá el backend:

```bash
COMPOSE_PROFILES=edge docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  up -d --force-recreate backend

# `manage-docker.sh shell` abre el shell de PYTHON de Django, no el del sistema, y
# `bash prod` es interactivo (no acepta un comando como argumento: el 3er argumento
# del script es el nombre del servicio). Para un one-liner, compose directo:
DC="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

$DC exec backend python manage.py check --deploy
$DC exec backend sh -c "python manage.py diffsettings | grep -E 'SECURE_|COOKIE_SECURE|ALLOWED_HOSTS|CSRF_TRUSTED'"
```

**Probá el login de `/admin/` antes de cantar victoria.** Es lo único que revela si
`CSRF_TRUSTED_ORIGINS` quedó bien; la API funciona igual aunque esté mal.

---

## 11. HSTS, un peldaño por vez

`SECURE_HSTS_SECONDS` arranca en `0` a propósito: una vez que un navegador cachea un
HSTS alto, **no hay forma de deshacerlo del lado del servidor**. La secuencia:

```
0  →  300 (cinco minutos)  →  86400 (un día)  →  31536000 (un año)
```

Subí un peldaño solo después de confirmar que el dominio sirve bien por HTTPS.

---

## 12. El `.exe` del cajero

**La URL está horneada adentro del binario.** `build.py` la escribe en
`app/config.json` y el wrapper la lee de ahí; el fallback por variable de entorno solo
se usa si ese archivo es ilegible, cosa que en un `.exe` generado no pasa.

El `.exe` que ya existe apunta a `http://192.168.1.75:5173`. El día que la URL sea el
dominio, ese binario abre "No se pudo conectar" y **la caja queda parada**.

**Generá el `.exe` después del dominio, no antes:**

```bash
python3 el_vuelto_desktop/build.py --env prod --url https://pos.midominio.co \
  --slug bambipan --name BambiPan --yes
```

> **Escribí el esquema completo.** El normalizador de `build.py` decide por heurística:
> un dominio pelado recibe `https://`, pero **cualquier cosa con `:` recibe `http://`**.
> O sea que `--url pos.midominio.co:8443` se convierte en `http://…` en silencio, y el
> `.exe` manda los JWT en texto plano.

**Salida de emergencia** (útil si un `.exe` ya entregado queda apuntando a la URL
vieja): el paquete no usa `--asar`, así que `resources\app\config.json` es un archivo de
texto editable con el Bloc de notas en el PC del cajero. Cambiar `baseUrl`, guardar y
relanzar alcanza — sin reinstalar. La guarda de mismo origen se acomoda sola.

---

## 13. Backups — lo de dos minutos que hay que hacer hoy

Flexible Server hace backups automáticos, pero:

> **"If you delete a server, all backups that belong to the server are also deleted and
> can't be recovered."** No hay deshacer.

```bash
# EL CANDADO. Es lo primero que haría, antes que cualquier otra cosa de esta guía.
az lock create --name no-borrar-db --lock-type CanNotDelete \
  --resource-group <rg> --resource-name <server> \
  --resource-type Microsoft.DBforPostgreSQL/flexibleServers

# retención al máximo (el default de 7 días es corto)
az postgres flexible-server update -g <rg> -n <server> --backup-retention 35
```

Y un dump lógico **fuera de Azure**, periódico, por el túnel SSH:

```bash
pg_dump "host=127.0.0.1 port=15432 dbname=elvuelto user=<admin> sslmode=require" \
  -Fc -f elvuelto-$(date +%F).dump
```

> Tres detalles: (1) el tier **Burstable no soporta backups on-demand**, y un negocio
> chico casi seguro está ahí — verificá con `az postgres flexible-server show --query
> sku`. (2) `pg_dump` tiene que ser de versión **>= la del servidor**; un cliente viejo
> se niega a correr, y eso se descubre el día que necesitás el dump. (3) La
> **geo-redundancia solo se configura al crear el servidor** — si no la tildaste, la
> única vía es recrearlo. Mejor saberlo ahora.

---

## Trampas, resumidas

| # | trampa | dónde se paga |
|---|---|---|
| 1 | El modo de red del Flexible Server es **irreversible** | Descubrirlo tarde = recrear el servidor y migrar |
| 2 | "Allow public access from any Azure service" incluye **otras suscripciones** | Base de ventas expuesta a cualquier inquilino de Azure |
| 3 | `CSRF_TRUSTED_ORIGINS` vacía → `[]`, y **el POS sigue andando** | 403 solo en `/admin/`; se busca el problema donde no está |
| 4 | Las 6 variables de `environment:` **solo** funcionan en el `.env` de la raíz | Se setean en el otro y se ignoran en silencio |
| 5 | `BIND_HOST=0.0.0.0` + 5173/8000 abiertos → cualquiera manda `X-Forwarded-Proto: https` | Django cree que la request fue segura, sin cifrado real |
| 6 | `ufw` no cierra un puerto publicado por Docker | Falsa tranquilidad; el NSG es el único borde |
| 7 | `SECURE_SSL=1` antes del certificado | 301 cacheado en el navegador, sin error legible |
| 8 | `sslmode=verify-full` **por el túnel** SSH | Falla la verificación de hostname; por el túnel va `require` |
| 9 | La URL del `.exe` está horneada | Caja parada el día del cambio de dominio |
| 10 | Borrar el servidor **borra los backups** | Sin recuperación posible |

---

## Rate limiting: una nota que no es de Azure pero muerde en producción

DRF cuenta el throttling de login en la caché. Con `LocMemCache` (el default cuando no
hay `REDIS_URL`) **cada worker de gunicorn lleva su propio contador**, así que los
límites quedan multiplicados por la cantidad de workers. Contra un PIN de 4 dígitos eso
es la diferencia entre ~16 horas y ~5 horas de fuerza bruta.

Camino corto y gratis para un solo local: **`GUNICORN_WORKERS=1`**.
Camino correcto: agregar `redis` a `requirements.txt` (está fuera a propósito), levantar
un Redis y setear `REDIS_URL`. Son dos pasos, no uno: setear la variable sin instalar el
paquete rompe el arranque.

Aparte: el login del **Django admin** no tiene throttling ninguno, y `is_staff` es
exclusivo de SUPERADMIN. Vale la pena no dejar `/admin/` en la superficie pública.

---

## Lo que esta guía NO pudo verificar

Honestidad sobre los límites de lo escrito acá:

- **No se ejecutó nada contra tu suscripción.** `az` no está instalado en la máquina
  donde se escribió esto, y no hay credenciales. Todos los comandos están derivados de
  la doc oficial, no de una corrida real.
- **No sé en qué modo de red quedó tu base**, ni el tier, ni la versión de Postgres, ni
  si tildaste geo-redundancia. El paso 0 existe justamente por eso.
- **No sé qué permite hoy tu NSG**, así que no puedo decirte si el 8000 ya está en
  internet.
- **El Caddyfile y el servicio de compose no se pudieron construir**: el daemon de
  Docker estaba apagado. El YAML sí se validó; la imagen hay que buildearla en la VM.
- **El precio de Azure Key Vault no se confirmó**: la página oficial muestra
  marcadores de posición. Por eso no aparece recomendado acá.

---

## Enlaces

- [`docker.md`](docker.md) — el stack en sí, y por qué el mismo origen manda.
- `docker/nginx/proxy_common.conf` — la trampa del `Host $http_host`, que es la que
  hace que todo POST muera en 403 si se cambia por `$host`.
- `el_vuelto_backend/elvuelto/settings/production.py:11-43` — el bloque HTTPS.
