# 👨‍🏫 Yhanko Educa - Portal do Professor (Frontend)

Frontend web para o Portal do Professor do ecossistema educacional **Yhanko Educa**, desenvolvido em React 18, Vite, TypeScript, Tailwind CSS e componentes Radix UI.

---

## 🚀 Arquitetura Docker de Produção

A infraestrutura de container deste projeto foi concebida segundo as melhores práticas da indústria (12-Factor App, CIS Docker Benchmarks):

1. **Multi-Stage Build Otimizado**:
   - `base`: Node.js 22 Alpine (imagem minimalista oficial).
   - `deps`: Instalação idempotente (`npm ci`) com cache BuildKit (`/root/.npm`) e políticas de tolerância de rede.
   - `builder`: Compilação de alta performance via TypeScript e Rollup/Vite.
   - `runner`: `nginxinc/nginx-unprivileged:alpine-slim` sem privilégios de root (UID 101).
2. **Suporte a Variáveis de Ambiente em Runtime**:
   - Resolução do problema comum de SPAs (onde `import.meta.env` é embutido no build): o script `docker-entrypoint.sh` permite alterar `VITE_API_URL` ao iniciar o container sem necessidade de recompilar a imagem Docker!
3. **Porta Dinâmica (`$PORT`)**:
   - Detecção automática de portas em plataformas PaaS (Railway, Render, Google Cloud Run, Heroku).
4. **Performance & Cache Avançado**:
   - Assets do Vite com hash (`/assets/*`) servidos com cache imutável de 1 ano (`max-age=31536000, immutable`).
   - `index.html` com cabeçalho `no-store, no-cache` para atualização instantânea dos clientes após novo deploy.
   - Compressão Gzip (nível 6) para textos, JS, CSS, JSON e SVG.
   - Otimizações no Kernel (`sendfile`, `tcp_nopush`, `tcp_nodelay`).
5. **Segurança Endurecida**:
   - Utilizador não-root (`USER 101`).
   - `server_tokens off` (oculta a versão do Nginx).
   - Cabeçalhos de proteção: `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`.
6. **Observabilidade & Healthcheck**:
   - Rota `/healthz` dedicada para probes do Kubernetes, Docker Swarm e balanceadores de carga.

---

## 🛠️ Variáveis de Ambiente

| Variável | Descrição | Padrão |
| :--- | :--- | :--- |
| `VITE_API_URL` | URL base da API REST do backend | `https://school-api-production-a1c6.up.railway.app` |
| `PORT` | Porta HTTP em que o container escuta | `8080` (container) / `3003` (host) |

---

## 🐳 Executando com Docker

### 1. Usando Docker Compose (Recomendado)

Subir a aplicação:
```bash
docker compose up -d --build
```

Visualizar logs em tempo real:
```bash
docker compose logs -f shool-teacher
```

Parar o serviço:
```bash
docker compose down
```

Aceder localmente: [http://localhost:3003](http://localhost:3003)

---

### 2. Usando Docker CLI

#### Build da Imagem:
```bash
docker build -t yhanko/shool-teacher:latest .
```

Com argumento customizado de API no build (opcional):
```bash
docker build --build-arg VITE_API_URL="https://api.meudominio.com" -t yhanko/shool-teacher:latest .
```

#### Executar o Container (com injeção dinâmica em runtime):
```bash
docker run -d \
  --name shool-teacher-frontend \
  -p 3003:8080 \
  -e VITE_API_URL="https://api.meudominio.com" \
  --restart unless-stopped \
  yhanko/shool-teacher:latest
```

---

## 🌐 Deploy em Produção

### Railway / Render / PaaS
- A imagem ajusta-se automaticamente à variável `$PORT` atribuída pela plataforma.
- Configure apenas a variável de ambiente:
  - `VITE_API_URL=https://sua-api.com`

### Verificação de Saúde (Healthcheck)
- Rota: `GET /healthz`
- Resposta esperada: HTTP 200 `healthy`
