# GM Sistema - Oficina Mecanica

Sistema local para gestao de oficina mecanica com:
- Backend: Node.js + TypeScript + Express + Prisma + SQLite
- Frontend: React + Vite + TypeScript
- Desktop: Electron (aplicativo instalado local)
- Modulos iniciais: autenticacao, clientes, veiculos e ordens de servico

## Estrutura

- `apps/backend`: API REST
- `apps/frontend`: interface web

## Pre-requisitos

- Node.js 20+
- npm 10+

## Configuracao

1. Instale dependencias no raiz do projeto:

```bash
npm install
```

2. Configure variaveis de ambiente do backend:

```bash
copy apps\\backend\\.env.example apps\\backend\\.env
```

3. Gere o cliente Prisma e crie o banco SQLite:

```bash
npm run prisma:generate
npm run prisma:migrate
```

4. Popular com dados de exemplo:

```bash
npm run prisma:seed
```

## Executar em desenvolvimento

```bash
npm run dev
```

## Executar como app desktop (sem navegador)

```bash
npm run dev:desktop
```

Esse comando abre o sistema em janela nativa (Electron) e mantem backend + frontend locais.

## Gerar instalador Windows (.exe)

```bash
npm run dist:win
```

O instalador sera gerado na pasta `release`.

Endpoints principais no backend (`http://localhost:3001`):
- `POST /auth/register`
- `POST /auth/login`
- `GET/POST /clients`
- `GET/POST /vehicles`
- `GET /vehicles/history/:plate` (retorna historico completo do veiculo por placa)
- `GET/POST /work-orders`

Frontend em `http://localhost:5173`.

Formato de login (`POST /auth/login`):

```json
{
	"username": "admin",
	"password": "123456"
}
```

Credenciais de exemplo:
- Usuario: `admin`
- Usuario: `GM`
- Senha: `123456`

Placas para teste de historico:
- `ABC1234`
- `BRA2E19`

## Observacoes

- As rotas de clientes, veiculos e ordens exigem token JWT no header `Authorization: Bearer <token>`.
- O frontend inicial possui tela simples para login e leitura de dados.

## Backup semanal (Windows)

Backup manual do banco SQLite:

```bash
npm run backup:weekly
```

Instalar rotina automatica semanal (domingo as 22:00):

```bash
npm run backup:install-weekly
```

Detalhes da rotina:
- Origem do banco: `apps/backend/prisma/dev.db`
- Destino dos backups: `backups/<timestamp>/`
- Arquivos copiados: `dev.db`, `dev.db-wal`, `dev.db-shm` (se existirem)
- Retencao automatica: 12 semanas

## Releases e versionamento

O repositorio possui workflow de release automatica por tag em `.github/workflows/release.yml`.

Para publicar uma nova versao:

```bash
git tag -a v0.1.1 -m "Release v0.1.1"
git push origin v0.1.1
```

Ao enviar a tag `v*`, o GitHub Actions cria a release automaticamente com changelog gerado.
O processo tambem compila e anexa o instalador Windows (`.exe`) e o arquivo `.blockmap` na release.

## Protecao da branch main

Para proteger a branch `main` no GitHub:

1. Acesse `Settings > Branches > Add rule`.
2. Em `Branch name pattern`, informe `main`.
3. Marque `Require a pull request before merging`.
4. Marque `Require status checks to pass before merging` e selecione o check `build` (workflow CI).
5. (Opcional) Marque `Require conversation resolution before merging`.
6. Salve a regra.
