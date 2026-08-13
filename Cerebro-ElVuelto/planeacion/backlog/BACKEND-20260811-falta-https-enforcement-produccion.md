---
tags: [tarea, backend, seguridad, config]
status: 🔴
prioridad: media
updated: 2026-08-11
---

# BACKEND-20260811-falta-https-enforcement-produccion — sin `SECURE_SSL_REDIRECT`/cookies seguras en prod

**Tipo:** robustez/seguridad · **Encontrado en:** review adversarial de
[[ADR-G-20260811-docs-swagger-key-gate]] (lente config-drift, workflow) · verificado con `grep` real:
`SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_PROXY_SSL_HEADER` — cero
resultados en todo `elvuelto/settings/`.

## El problema
`settings/production.py` (`DEBUG=False`) no fija ninguno de los settings de Django que fuerzan HTTPS o
marcan cookies como seguras — quedan en los defaults inseguros de Django. Si el borde del deploy
(load balancer, proxy) no termina y fuerza TLS de forma independiente, cualquier credencial de la app
— JWTs de `Authorization`, cookies de sesión/CSRF, y ahora también `DOCS_API_KEY` cuando viaja como
`?key=` — puede capturarse en texto plano en tránsito. No es específico de la feature de docs: es un
gap de toda la app, que la nueva feature simplemente hace un poco más visible (el key delivery por
query param asume que la conexión ya es segura).

## Por qué no se arregló junto con la feature de docs
Preexistente, alcance de toda la app — no algo que la feature de docs introdujo. Requiere saber cómo
está armado el borde real del deploy (¿dónde termina TLS?) antes de fijar `SECURE_PROXY_SSL_HEADER`
correctamente — pregunta para el owner sobre la infraestructura de producción real, no derivable del
código.

## Criterio de aceptación
`settings/production.py` fija `SECURE_SSL_REDIRECT=True`, `SESSION_COOKIE_SECURE=True`,
`CSRF_COOKIE_SECURE=True`, y `SECURE_PROXY_SSL_HEADER` coherente con el proxy real que termina TLS.

## Notas para el Dev (para cuando se tome, no ahora)
- `SECURE_PROXY_SSL_HEADER` mal configurado (o configurado sin que el proxy real lo esté enviando)
  puede causar un loop de redirect — no es un cambio "siempre seguro" sin confirmar primero la
  topología real del deploy con el owner.
