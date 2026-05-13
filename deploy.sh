#!/bin/bash
# ============================================================
# 🚀 ImPlotter Studio — Script de Deploy Automático (1 Clique)
# ============================================================
# Execute este script na sua VPS Hostinger com:
#   chmod +x deploy.sh && ./deploy.sh

set -e

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║    🚀 ImPlotter Studio — Deploy de Produção         ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# --- Passo 1: Verifica se o Docker está instalado ---
if ! command -v docker &> /dev/null; then
    echo "⏳ Docker não encontrado. Instalando automaticamente..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "✅ Docker instalado com sucesso!"
else
    echo "✅ Docker já está instalado."
fi

# --- Passo 2: Verifica se o Docker Compose está instalado ---
if ! command -v docker compose &> /dev/null; then
    echo "⏳ Instalando Docker Compose..."
    apt-get install -y docker-compose-plugin
    echo "✅ Docker Compose instalado!"
else
    echo "✅ Docker Compose já está instalado."
fi

# --- Passo 3: Verifica se o arquivo .env existe ---
if [ ! -f ".env" ]; then
    echo ""
    echo "⚠️  ATENÇÃO: Arquivo .env não encontrado!"
    echo "   Por favor, crie o arquivo .env com as suas credenciais antes de continuar."
    echo ""
    echo "   Conteúdo mínimo necessário do .env:"
    echo "   ┌─────────────────────────────────────────────────"
    echo "   │ VITE_SUPABASE_URL=https://xxx.supabase.co"
    echo "   │ VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbG..."
    echo "   │ SUPABASE_SERVICE_ROLE_KEY=eyJhbG..."
    echo "   │ GEMINI_API_KEY=AIzaSy..."
    echo "   │ VITE_API_URL=https://SEU-DOMINIO.com.br"
    echo "   └─────────────────────────────────────────────────"
    exit 1
fi

# --- Passo 4: Para os containers antigos se existirem ---
echo ""
echo "⏹️  Parando versão anterior do sistema (se houver)..."
docker compose down --remove-orphans 2>/dev/null || true

# --- Passo 5: Compila e sobe os containers ---
echo ""
echo "🏗️  Compilando Frontend + Backend (pode levar 2-3 minutos)..."
docker compose up --build -d

# --- Passo 6: Verifica se tudo subiu corretamente ---
echo ""
echo "🔍 Verificando status dos containers..."
sleep 5
docker compose ps

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   ✅  DEPLOY CONCLUÍDO COM SUCESSO!                         ║"
echo "║                                                              ║"
echo "║   🌐 Painel:   http://IP_DA_SUA_VPS                        ║"
echo "║   🔌 API:      http://IP_DA_SUA_VPS/api                    ║"
echo "║                                                              ║"
echo "║   Para ver os logs em tempo real:                           ║"
echo "║   docker compose logs -f                                    ║"
echo "║                                                              ║"
echo "║   Para reiniciar o sistema:                                 ║"
echo "║   docker compose restart                                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
