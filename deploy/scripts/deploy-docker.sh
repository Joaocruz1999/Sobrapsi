#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"
COMPOSE_FILE="docker-compose.prod.yml"

echo "==> SOBRAPSI deploy Docker em $(pwd)"

if [[ ! -f .env ]]; then
  echo "Erro: arquivo .env não encontrado. Copie .env.production.example para .env"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

echo "==> Subindo PostgreSQL..."
docker compose -f "$COMPOSE_FILE" up -d postgres

echo "==> Aguardando PostgreSQL..."
for _ in $(seq 1 30); do
  if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready \
    -U "${POSTGRES_USER:-sobrapsi}" -d "${POSTGRES_DB:-sobrapsi}" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "==> Aplicando migrations (serviço efêmero)..."
docker compose -f "$COMPOSE_FILE" run --rm migrate

echo "==> Buildando e subindo a aplicação..."
docker compose -f "$COMPOSE_FILE" up -d --build app

echo "==> Deploy concluído."
echo "    Teste interno: docker run --rm --network easypanel curlimages/curl -s http://sobrapsi-app:3000 | head"
echo "    Após apontar o DNS, registre a rota no Traefik:"
echo "      sudo cp deploy/easypanel/traefik-sobrapsi.yml /etc/easypanel/traefik/config/sobrapsi.yml"
