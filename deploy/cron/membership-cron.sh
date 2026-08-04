#!/usr/bin/env bash
# Dispara o cron de status de anuidade + lembretes de vencimento da SOBRAPSI.
# Lê o CRON_SECRET do .env (não hardcodeia o segredo no crontab).
#
# Agendamento sugerido (crontab -e): diariamente às 06:00
#   0 6 * * * /opt/sobrapsi/deploy/cron/membership-cron.sh
set -euo pipefail

ENV_FILE="/opt/sobrapsi/.env"
LOG_FILE="/var/log/sobrapsi-cron.log"
URL="${SOBRAPSI_CRON_URL:-https://sobrapsi.org.br/api/cron/membership}"

# Extrai CRON_SECRET do .env (lida com aspas duplas ou simples).
CRON_SECRET="$(grep -E '^CRON_SECRET=' "$ENV_FILE" | sed -E 's/^CRON_SECRET="?([^"]*)"?[[:space:]]*$/\1/' | tail -n1)"
if [ -z "$CRON_SECRET" ]; then
  echo "$(date -Is) [sobrapsi-cron] CRON_SECRET não encontrado em $ENV_FILE" >> "$LOG_FILE"
  exit 1
fi

mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true

echo "$(date -Is) [sobrapsi-cron] disparando -> $URL" >> "$LOG_FILE"
if curl -fsS --max-time 60 -X POST -H "Authorization: Bearer ${CRON_SECRET}" "$URL" >> "$LOG_FILE" 2>&1; then
  echo "" >> "$LOG_FILE"
  echo "$(date -Is) [sobrapsi-cron] OK" >> "$LOG_FILE"
else
  echo "" >> "$LOG_FILE"
  echo "$(date -Is) [sobrapsi-cron] FALHA (curl exit=$?)" >> "$LOG_FILE"
  exit 1
fi
