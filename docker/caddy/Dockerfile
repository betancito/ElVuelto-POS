# Caddyfile bakeado en la imagen, no bind-mount: docker-compose.prod.yml:5 dice
# "No bind mounts anywhere", y es la misma convención que docker/nginx/Dockerfile.
FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile

# No se valida acá a propósito: el Caddyfile usa {$DOMAIN} y {$ACME_EMAIL}, que
# en tiempo de build no existen — `caddy validate` fallaría con el sitio vacío.
# Se valida con las variables puestas; el comando está en docs/azure-deploy.md.
