#!/bin/sh
set -e

# ==============================================================================
# Entrypoint Script - Yhanko Educa (Portal do Professor - Frontend)
# Gerenciamento de variáveis de ambiente em runtime, portas dinâmicas e logs
# ==============================================================================

# 1. Configuração de Porta Dinâmica (Compatibilidade com Railway, Render, Cloud Run, Coolify, etc.)
SERVER_PORT="${PORT:-8080}"
export PORT="${SERVER_PORT}"
if [ "$SERVER_PORT" != "8080" ]; then
    echo "[Entrypoint] Configurando porta do Nginx para $SERVER_PORT..."
    sed -i -E "s|listen [0-9]+;|listen $SERVER_PORT;|g" /etc/nginx/conf.d/default.conf
fi

# 2. Injeção Dinâmica de Variáveis de Ambiente em Runtime
# Permite que uma mesma imagem Docker rode em múltiplos ambientes (Staging/Prod) apenas mudando a variável VITE_API_URL
MARKER_FILE="/usr/share/nginx/html/.built_api_url"
BUILT_URL=""

if [ -f "$MARKER_FILE" ]; then
    BUILT_URL=$(cat "$MARKER_FILE" 2>/dev/null || true)
fi

if [ -z "$BUILT_URL" ]; then
    BUILT_URL="https://school-api-production-a1c6.up.railway.app"
fi

RUNTIME_URL="${VITE_API_URL:-${API_URL:-$BUILT_URL}}"

if [ -n "$RUNTIME_URL" ] && [ "$RUNTIME_URL" != "$BUILT_URL" ]; then
    echo "[Entrypoint] Atualizando API URL de '$BUILT_URL' para '$RUNTIME_URL' nos bundles compilados..."
    find /usr/share/nginx/html -type f \( -name "*.js" -o -name "*.html" \) -exec sed -i "s|$BUILT_URL|$RUNTIME_URL|g" {} +
    echo "$RUNTIME_URL" > "$MARKER_FILE"
fi

# 3. Banner Informativo de Inicialização
echo "=========================================================="
echo "  👨‍🏫 Yhanko Educa - Portal do Professor (Frontend)"
echo "=========================================================="
echo "  Porta HTTP:     ${SERVER_PORT}"
echo "  API Conectada:  ${RUNTIME_URL}"
echo "  Usuário:        $(whoami 2>/dev/null || echo 'nginx') [UID $(id -u 2>/dev/null || echo '101')]"
echo "  Nginx:          Iniciando servidor de alta performance..."
echo "=========================================================="

# 4. Executa o comando passado para o container (PID 1)
exec "$@"
