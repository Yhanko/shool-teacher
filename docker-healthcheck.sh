#!/bin/sh

# ==============================================================================
# Healthcheck Script - Yhanko Educa Portal do Professor (Frontend)
# Suporta portas dinâmicas ($PORT) e compatibilidade com Coolify e Docker
# ==============================================================================

check_url() {
    TARGET="$1"
    if command -v curl >/dev/null 2>&1; then
        curl -f -s "$TARGET" >/dev/null 2>&1
        return $?
    elif command -v wget >/dev/null 2>&1; then
        wget -q -O /dev/null "$TARGET" >/dev/null 2>&1
        return $?
    fi
    return 1
}

# Porta configurada ou fallback padrão 8080
PORT_CHECK="${PORT:-8080}"

# 1. Testa a porta configurada no ambiente (/healthz ou /)
if check_url "http://127.0.0.1:${PORT_CHECK}/healthz" || check_url "http://127.0.0.1:${PORT_CHECK}/"; then
    exit 0
fi

# 2. Fallbacks de segurança para portas comuns (3000 e 8080) caso PORT divirja no runtime
if [ "$PORT_CHECK" != "3000" ] && (check_url "http://127.0.0.1:3000/healthz" || check_url "http://127.0.0.1:3000/"); then
    exit 0
fi

if [ "$PORT_CHECK" != "8080" ] && (check_url "http://127.0.0.1:8080/healthz" || check_url "http://127.0.0.1:8080/"); then
    exit 0
fi

exit 1
