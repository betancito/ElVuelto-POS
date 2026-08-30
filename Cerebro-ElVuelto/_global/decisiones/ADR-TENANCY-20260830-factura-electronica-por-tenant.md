---
tags: [adr, tenancy, sales, recibo, negocio]
status: aceptada
updated: 2026-08-30
---

# ADR-TENANCY-20260830 — La factura electrónica es un toggle por negocio, y es opt-in

## Contexto
El recibo térmico venía imprimiendo el bloque *"¿Requiere factura electrónica?"* con el correo y el
teléfono del negocio **en el 100% de los recibos**. No era una decisión: era una condición implícita
mal leída — `generateReceipt.ts:113` decía `tenant.email || tenant.supportPhone`, y como
`Tenant.correo` es `EmailField(unique=True)` **obligatorio** (`apps/tenants/models.py:18`), esa
condición nunca podía ser falsa.

O sea que el sistema le prometía factura electrónica a los clientes de negocios que no facturan
electrónicamente. Es una obligación ante la DIAN, no un adorno del recibo.

## Decisión

### 1. Un campo booleano en `Tenant`, editable solo por el super admin
`factura_electronica = BooleanField(default=False)` (`apps/tenants/models.py:20`), migración
`0005_tenant_factura_electronica`. Encendido ⇒ el recibo imprime la pregunta + el correo + el
teléfono. Apagado ⇒ ninguno de los tres.

### 2. **Opt-in**, no opt-out — decisión explícita del owner
> [!decision] `default=False`, sabiendo lo que cuesta
> Se le presentaron las dos opciones con su consecuencia medida. El owner eligió **apagado**.
> **Consecuencia aceptada:** al desplegar, **todos los negocios existentes dejan de imprimir el
> bloque** hasta que el super admin los prenda uno por uno. Hoy eso es exactamente un negocio:
> **BambiPan** (`factura_electronica = False` tras aplicar la migración, verificado contra la BD).
>
> El argumento a favor: declarar que se emite factura electrónica es una afirmación legal. Heredarla
> por default significa afirmarla en nombre de negocios que nunca lo dijeron. La alternativa
> (`default=True`) no cambiaba nada el día del deploy, pero perpetuaba la promesa falsa.

### 3. Escritura **solo** del super admin
Queda dentro del CRUD de `Tenant`, que ya es `IsSuperAdmin`. Un ADMIN de tenant **no** puede prender
su propia factura electrónica — hoy tampoco puede editar el nombre, el NIT ni el correo de su
negocio, y este campo tiene más peso que esos, no menos. Quien sabe si un negocio está habilitado
para facturar es quien lo dio de alta.

### 4. Se quita "El Vuelto POS" del recibo
Pedido del owner en el mismo momento. La última línea del recibo pasa a ser
*"Gracias por su compra"*. Se borró también la regla `.marca`, que quedaba huérfana.
**Alcance deliberado: solo el recibo.** El PDF de credenciales (`downloadCredentials.ts:236,364`) y
el pie de los reportes exportados (`ReportsPage.tsx:856`) **conservan la marca** — son documentos
internos, no papel que recibe el cliente.

## Consecuencias

### El toggle NO se aplica en caliente — y hay que decirlo
El flag viaja por **un solo lugar**: `_user_payload()` (`apps/users/serializers.py:52-58`), o sea la
respuesta del **login**. `/auth/me/` sirve `UserSerializer`, que no tiene ningún campo `tenant_*`, y
`/auth/refresh/` no devuelve `user` — así que `authSlice` nunca lo reescribe.

**Un cajero con la sesión abierta sigue imprimiendo como antes hasta que vuelva a entrar.** El super
admin ve el toast de éxito y el badge de la tabla cambiar, y la caja no cambia. Se mitigó con texto
en el modal (*"se aplica cuando el cajero vuelva a iniciar sesión"*), no con código: arreglarlo de
fondo es meter los campos `tenant_*` en `/auth/me/` y consumirlo al montar el POS — es otra tarea, y
va a [[FRONT-20260830-flag-factura-no-llega-en-caliente]].

### El flag no tiene autoridad de servidor
El recibo se genera **entero en el cliente**, así que la decisión se toma con un booleano que vive en
`sessionStorage`. Un cajero con DevTools puede prenderlo. Se acepta a sabiendas: el recibo no es un
documento fiscal emitido por el sistema, y el mismo cajero puede escribir cualquier cosa en un papel.
Si algún día el recibo tiene valor legal, el flag tiene que ser un claim firmado del JWT.

### Reimprimir usa el flag de HOY, no el de la venta
`SalesHistoryPage` arma el tenant del estado de auth actual. Reimprimir una venta vieja después de
mover el toggle da un papel distinto del original. Ya pasaba igual con el correo y el teléfono.
Congelarlo sería un campo nuevo en `Sale` — no se hizo.

## Verificación
7 casos contra servidor real (`runserver` + `curl`), con el tenant y los usuarios de prueba borrados
al terminar: GET expone el campo · POST lo acepta · PATCH lo guarda y persiste · PATCH parcial **no**
lo nulifica · los **tres** flujos de login lo devuelven (cédula, correo, cajero) · superadmin sin
tenant devuelve `None` sin reventar. Recibo renderizado de verdad en las dos ramas con esbuild.
`tsc --noEmit` exit 0 · `makemigrations --check` exit 0.

**Revisión adversarial (§10.2): corrida, con una falla propia que hay que anotar.** 6 lentes → 25
hallazgos; **los 25 escépticos fallaron por un bug en mi script del workflow** (referencia a `l`
fuera de alcance), así que el workflow reportó `sobreviven: []` — que era **falso**. Los hallazgos se
verificaron a mano en vez de darlos por buenos. De ahí salieron 8 arreglos reales, entre ellos:

| hallazgo | veredicto |
|---|---|
| `.factura` sin `overflow-wrap`: un correo de 39 caracteres **se sale del papel de 70mm** | ✅ real, arreglado. `.row .l` ya tenía la protección con un comentario explicando por qué |
| El hint prometía el número de soporte, que es **opcional** | ✅ real, arreglado |
| `closeCreateModal` reseteaba el switch pero **no** el formulario | ✅ real, arreglado |
| `seed_dev_data` dejaba la rama ENCENDIDA **inalcanzable** en desarrollo | ✅ real, arreglado |
| `useMeQuery` tipado con la forma del login: mi cambio **agravó** una mentira preexistente | ✅ real, arreglado con tipo propio |
| Mis comentarios decían que el tipo permite que la llave falte, y el tipo decía lo contrario | ✅ real, arreglado |
| Al quitar la marca "la cola de papel bajó de 10.8mm a 6.0mm" | 🔴 **refutado**: el `padding-bottom: 6mm` existe para que *el corte no se lleve la última línea*. Antes la última línea era `.marca` con 6mm debajo; ahora es `.gracias` con los mismos 6mm. El margen de seguridad no cambió |

## ⚠️ Pendiente que no es código
**Prender el toggle de BambiPan** cuando el owner confirme que factura electrónicamente. Hasta
entonces sus recibos salen sin el bloque, que es lo que la decisión de arriba implica.
Y **nada se vio en pantalla**: no hay navegador en este entorno.

## Enlaces
[[TENANCY-20260830-factura-electronica-por-tenant]] · [[FRONT-20260830-flag-factura-no-llega-en-caliente]] ·
[[patron-impresion-recibos]] · [[patron-permisos-roles]] · [[ADR-G-20260802-modelo-de-acceso-por-rol]] ·
[[ADR-POS-20260827-caja-para-adulto-mayor-en-1366x768]]
