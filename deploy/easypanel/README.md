# Deploy SOBRAPSI fora do EasyPanel (com Traefik do EasyPanel)

Use este guia quando o EasyPanel já atingiu o limite de serviços, mas você quer reutilizar o Traefik existente para HTTPS em `sobrapsi.org.br`.

## Arquitetura

- `sobrapsi-app` e `sobrapsi-db` sobem via `docker compose` manual
- O app entra na rede externa `easypanel` (Traefik)
- O Postgres fica só na rede privada `sobrapsi-internal`
- Nenhuma porta 80/443/3000 é publicada no host pelo compose de produção

## Pré-requisitos na VPS

1. Rede Docker `easypanel` existente (já confirmada no seu servidor)
2. Git e Docker instalados
3. DNS de `sobrapsi.org.br` e `www.sobrapsi.org.br` — **não** precisa apontar
   antes do deploy. Só é exigido no passo 4 (emissão do certificado HTTPS).

## Ordem sem DNS

É possível subir tudo antes de apontar o DNS. Apenas **não** copie o arquivo do
Traefik (passo 4) enquanto o domínio não resolver para a VPS — senão o Let's
Encrypt tenta emitir o certificado, falha em loop e pode bater no rate limit.

## 1. Confirmar entrypoints do Traefik

Antes do primeiro deploy, confira os nomes usados pelo EasyPanel:

```bash
ls -la /etc/easypanel/traefik/config/
grep -R "entryPoints\|certResolver" /etc/easypanel/traefik/config/ | head -20
```

Valores esperados (ajuste `docker-compose.prod.yml` se forem diferentes):

- entrypoint HTTPS: `websecure`
- cert resolver: `letsencrypt`

## 2. Clonar e configurar

```bash
sudo mkdir -p /opt/sobrapsi
sudo chown "$USER:$USER" /opt/sobrapsi
git clone https://github.com/vjmpinheiro/Sobrapsi.git /opt/sobrapsi
cd /opt/sobrapsi

cp .env.production.example .env
```

Gere segredos:

```bash
openssl rand -hex 32   # SESSION_SECRET
openssl rand -hex 32   # ENCRYPTION_KEY
openssl rand -hex 32   # CRON_SECRET
```

Edite `.env` e defina pelo menos:

- `POSTGRES_PASSWORD`
- `SESSION_SECRET`
- `ADMIN_SEED_PASSWORD` (senha inicial do staff `admin@sobrapsi.org.br`, usada no seed)
- `ENCRYPTION_KEY` (obrigatória — sem ela o app recusa gravar/ler CPF/RG)
- `CRON_SECRET`
- `MP_WEBHOOK_SECRET` (assinatura do webhook do Mercado Pago)
- `NEXT_PUBLIC_APP_URL=https://sobrapsi.org.br`
- credenciais do Mercado Pago e SMTP da Hostinger

## 3. Subir aplicação (build + banco + migrations)

```bash
bash deploy/scripts/deploy-docker.sh
```

O script sobe o Postgres, aplica as migrations via serviço efêmero `migrate`
(estágio `builder`, que tem o CLI do Prisma) e sobe o `app`.

Seed inicial (opcional, só na primeira vez):

```bash
docker compose -f docker-compose.prod.yml run --rm \
  --entrypoint "npx tsx prisma/seed.ts" migrate
```

Teste interno, sem depender de DNS:

```bash
docker run --rm --network easypanel curlimages/curl -s http://sobrapsi-app:3000 | head -20
```

## 4. Configurar roteamento no Traefik (só após o DNS apontar)

No seu servidor, o Traefik roda como **serviço Swarm** (`easypanel-traefik.1...`).
Nesse cenário, o método confiável é o **File Provider**, não as labels Docker.

Primeiro confirme a propagação do DNS:

```bash
dig +short sobrapsi.org.br
```

Só então copie o roteamento:

```bash
sudo cp deploy/easypanel/traefik-sobrapsi.yml /etc/easypanel/traefik/config/sobrapsi.yml
```

Valores já confirmados na sua VPS:

- entrypoint HTTPS: `websecure`
- cert resolver: `letsencrypt`

O Traefik recarrega arquivos em `/etc/easypanel/traefik/config/` automaticamente
e o Let's Encrypt emite o certificado no primeiro acesso ao domínio.

Se o domínio não responder, confira se o app está na rede `easypanel`:

```bash
docker inspect sobrapsi-app --format '{{json .NetworkSettings.Networks}}'
docker network connect easypanel sobrapsi-app   # só se faltar a rede
```

## 5. Cron de anuidade

Exemplo de crontab na VPS:

```cron
0 6 * * * curl -fsS -H "Authorization: Bearer SEU_CRON_SECRET" https://sobrapsi.org.br/api/cron/membership
```

## 6. Backup

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U sobrapsi sobrapsi > backup-$(date +%F).sql

tar -czf uploads-$(date +%F).tar.gz -C /var/lib/docker/volumes sobrapsi_uploads
```

## Atualizações

```bash
cd /opt/sobrapsi
git pull
bash deploy/scripts/deploy-docker.sh
```

## O que NÃO usar neste cenário

- `deploy/nginx/sobrapsi.conf` — conflita com 80/443 do Traefik
- `deploy/ecosystem.config.cjs` / PM2 — substituído pelo container Docker
- `deploy/scripts/setup-vps.sh` — instala Nginx e PM2 desnecessários aqui
