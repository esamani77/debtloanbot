# DebtMate — Backend

REST API + Telegram bot. TypeScript, Express, Telegraf, Prisma, PostgreSQL.

## Docker

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with Compose v2

### Setup

Copy the example env file and fill in your secrets:

```bash
cp .env.example .env
```

At minimum set `BOT_TOKEN`. The database URLs are overridden automatically by Docker Compose to point at the local PostgreSQL container.

### Commands

```bash
cd debt

# First run — builds image, starts postgres, runs migrations, starts API
docker compose up --build

# Subsequent runs (no code changes)
docker compose up

# Stop and remove containers (keeps postgres volume)
docker compose down

# Wipe DB too
docker compose down -v
```

### Ports

| Service    | Host port | Container port |
|------------|-----------|----------------|
| API        | 3000      | 3000           |
| PostgreSQL | 54320     | 5432           |

Connect to the local database from your machine at `localhost:54320`.

## Local Development (without Docker)

```bash
pnpm install
pnpm dev        # ts-node-dev with long polling
```

See [CLAUDE.md](CLAUDE.md) for all available commands and architecture details.
