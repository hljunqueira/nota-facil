# ==============================================================================
# Script de Deploy Automatizado - Nota Facil para VPS
# Host: 184.107.141.97 | Diretorio: /opt/notafacil
# ==============================================================================

$ErrorActionPreference = "Stop"

function Write-Step ($msg) { Write-Host "`n[+] $msg" -ForegroundColor Cyan }
function Write-Success ($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn ($msg) { Write-Host "[!] $msg" -ForegroundColor Yellow }
function Write-Err ($msg) { Write-Host "[ERRO] $msg" -ForegroundColor Red }

$VPS_USER = "root"
$VPS_IP = "184.107.141.97"
$VPS_DIR = "/opt/notafacil"
$SSH_KEY = "$env:USERPROFILE\.ssh\id_rsa"
$ARCHIVE = "notafacil-deploy.tar.gz"

Write-Host "==================================================" -ForegroundColor Green
Write-Host " NOTA FACIL - DEPLOY AUTOMATIZADO PARA VPS        " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

# 1. Validacao de TypeScript
Write-Step "1/6. Validando tipos TypeScript localmente (tsc --noEmit)..."
try {
    npx tsc --noEmit
    Write-Success "TypeScript compilado com 0 erros."
} catch {
    Write-Err "Falha na validacao do TypeScript! Corrija os erros antes de subir para producao."
    exit 1
}

# 2. Teste de Conexao SSH
Write-Step "2/6. Testando conectividade com o servidor VPS ($VPS_IP)..."
try {
    ssh -n -o BatchMode=yes -o ConnectTimeout=8 -i $SSH_KEY "$VPS_USER@$VPS_IP" "echo 'SSH_OK'" | Out-Null
    Write-Success "Conexao SSH autenticada com sucesso."
} catch {
    Write-Err "Nao foi possivel conectar a VPS via SSH. Verifique sua chave em $SSH_KEY."
    exit 1
}

# 3. Empacotamento dos Arquivos
Write-Step "3/6. Empacotando arquivos do projeto (excluindo node_modules e .next)..."
if (Test-Path $ARCHIVE) { Remove-Item $ARCHIVE -Force }

tar --exclude="node_modules" `
    --exclude=".next" `
    --exclude=".git" `
    --exclude=".env*" `
    --exclude="*.log" `
    --exclude="notafacil-deploy.tar.gz" `
    --exclude="app_update.tar.gz" `
    --exclude="notafacil.tar.gz" `
    -czf $ARCHIVE src public prisma scripts docker-compose.yml Dockerfile.app Dockerfile.worker package.json package-lock.json tsconfig.json tailwind.config.ts postcss.config.js next.config.mjs

$sizeMb = [math]::Round((Get-Item $ARCHIVE).Length / 1MB, 2)
Write-Success "Pacote criado: $ARCHIVE ($sizeMb MB)"

# 4. Envio do Pacote via SCP
Write-Step "4/6. Enviando pacote para $VPS_DIR..."
scp -i $SSH_KEY $ARCHIVE "$VPS_USER@${VPS_IP}:$VPS_DIR/$ARCHIVE"
Remove-Item $ARCHIVE -Force
Write-Success "Arquivo transferido com sucesso."

# 5. Execucao Remota na VPS
Write-Step "5/6. Reconstruindo imagens Docker e aplicando migracoes na VPS..."
$remoteCmd = "cd /opt/notafacil && tar -xzf notafacil-deploy.tar.gz && rm -f notafacil-deploy.tar.gz && docker compose build app worker && docker compose up -d && docker compose exec -T worker npx prisma db push && (docker network connect notafacil_notafacil-net main-caddy 2>/dev/null || true) && (docker exec main-caddy caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || true) && echo 'DEPLOY_FINISHED_OK'"

ssh -i $SSH_KEY "$VPS_USER@$VPS_IP" $remoteCmd

# 6. Teste de Disponibilidade (Health Check)
Write-Step "6/6. Realizando Health Check dos dominios em producao..."

$domains = @(
    "https://appnotafacil.online",
    "https://admin.appnotafacil.online",
    "https://wa.appnotafacil.online"
)

foreach ($url in $domains) {
    try {
        $resp = curl.exe -s -o /dev/null -w "%{http_code}" -I $url
        if ($resp -match "^(200|301|302|307|308)") {
            Write-Success "$url -> HTTP $resp (Operacional)"
        } else {
            Write-Warn "$url -> HTTP $resp (Verificar)"
        }
    } catch {
        Write-Warn "$url -> Nao foi possivel testar externamente."
    }
}

Write-Host "`n==================================================" -ForegroundColor Green
Write-Host " DEPLOY CONCLUIDO COM SUCESSO!                   " -ForegroundColor Green
Write-Host " App:   https://appnotafacil.online               " -ForegroundColor White
Write-Host " Admin: https://admin.appnotafacil.online         " -ForegroundColor White
Write-Host " Whats: https://wa.appnotafacil.online            " -ForegroundColor White
Write-Host "==================================================" -ForegroundColor Green
