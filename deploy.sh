#!/usr/bin/env bash
# ==============================================================================
# Script de Deploy Automatizado - Nota Fácil para VPS
# Host: 184.107.141.97 | Diretório: /opt/notafacil
# ==============================================================================

set -e

VPS_USER="root"
VPS_IP="184.107.141.97"
VPS_DIR="/opt/notafacil"
SSH_KEY="$HOME/.ssh/id_rsa"
ARCHIVE="notafacil-deploy.tar.gz"

echo "=================================================="
echo " 🚀 NOTA FÁCIL — DEPLOY AUTOMATIZADO PARA VPS"
echo "=================================================="

echo "[1/6] Validando tipos TypeScript..."
npx tsc --noEmit
echo "[✓] TypeScript OK."

echo "[2/6] Testando conexao SSH com $VPS_IP..."
ssh -n -o BatchMode=yes -o ConnectTimeout=8 -i "$SSH_KEY" "$VPS_USER@$VPS_IP" "echo 'SSH_OK'" > /dev/null
echo "[✓] SSH OK."

echo "[3/6] Criando pacote do projeto..."
rm -f "$ARCHIVE"
tar --exclude="node_modules" \
    --exclude=".next" \
    --exclude=".git" \
    --exclude=".env*" \
    --exclude="*.log" \
    --exclude="*.tar.gz" \
    -czf "$ARCHIVE" src public prisma scripts docker-compose.yml Dockerfile.app Dockerfile.worker package.json package-lock.json tsconfig.json tailwind.config.ts postcss.config.js next.config.mjs

echo "[✓] Pacote criado."

echo "[4/6] Enviando para VPS..."
scp -i "$SSH_KEY" "$ARCHIVE" "$VPS_USER@$VPS_IP:$VPS_DIR/$ARCHIVE"
rm -f "$ARCHIVE"
echo "[✓] Transferência concluída."

echo "[5/6] Executando build e deploy na VPS..."
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_IP" bash -s << 'EOF'
set -e
cd /opt/notafacil
tar -xzf notafacil-deploy.tar.gz
rm -f notafacil-deploy.tar.gz

echo "--> Reconstruindo containers..."
docker compose build app worker
docker compose up -d

echo "--> Sincronizando banco de dados via Prisma..."
docker compose exec -T worker npx prisma db push

echo "--> Recarregando Caddy..."
docker network connect notafacil_notafacil-net main-caddy 2>/dev/null || true
docker exec main-caddy caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || true
EOF

echo "[6/6] Health check..."
curl -s -I https://appnotafacil.online | head -n 1
curl -s -I https://admin.appnotafacil.online | head -n 1
curl -s -I https://wa.appnotafacil.online | head -n 1

echo "=================================================="
echo " 🎉 DEPLOY CONCLUÍDO COM SUCESSO!"
echo "=================================================="
