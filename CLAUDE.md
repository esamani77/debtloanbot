# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev            # ts-node-dev long polling (development)
pnpm build          # prisma generate + tsc
pnpm start          # run dist/index.js (production)
pnpm db:migrate     # prisma migrate dev
pnpm db:push        # push schema without migration
pnpm db:generate    # regenerate Prisma client after schema change
pnpm tsc --noEmit   # type-check only (no test runner configured)
```

## Bot middleware pipeline

`src/bot/index.ts` registers middleware in this exact order — order matters:

1. `session()` — in-memory Telegraf session
2. Language loader — calls `findOrCreateUser`, sets `ctx.session.userLanguage`, syncs Telegram name/username
3. Force-join gate — checks `REQUIRED_CHANNELS`; lets `check_membership` callback through unconditionally
4. `stage.middleware()` — registers all WizardScenes

Scene IDs: `ADD_TRANSACTION`, `BANK_ACCOUNT`, `NICKNAME_SETUP`, `FEEDBACK`, `SPLIT`, `EDIT_TRANSACTION`

## `/start` deep-link dispatch

`bot.start()` in `bot/index.ts` checks `startPayload` prefixes **before** calling `startHandler`:

- `edit_<txId>` → enters `EDIT_TRANSACTION` scene
- `del_<txId>` → shows delete confirmation inline keyboard
- `settle_<txId>` → shows settle confirmation inline keyboard

All three fetch the transaction and verify the viewer is a party before proceeding.

## Balance calculation semantics

`calculateNetBalance(transactions, viewerId)` in `utils/balanceCalc.ts`:

- Positive → viewer is **owed** money
- Negative → viewer **owes** money

The sign logic: a `LOAN` recorded by the viewer adds `+amount` (I lent); a `LOAN` recorded by the counterparty adds `-amount` (they lent to me). `DEBT` is the mirror.

## `requireAuth` contract

`src/middleware/auth.ts` validates `Authorization: tma <initDataRaw>` (HMAC-SHA256, rejects if older than 24 h). On success it populates:

- `res.locals.telegramId` — string
- `res.locals.telegramName` — first + last name
- `res.locals.telegramUsername` — string | undefined

The public share route `GET /api/splits/share/:token` is registered **outside** the `requireAuth` router in `src/index.ts`.

## Split session data model

`SplitSession.participants` and `SplitSession.participantTelegramIds` are parallel `String[]` arrays — not foreign-keyed to `User`. Index `i` in both arrays refers to the same participant. In-progress wizard state lives in `ctx.session.splitDraft` (type `SplitDraft` in `src/models/types.ts`).

## Reminder job

`src/jobs/reminderJob.ts` — schedule is controlled by `REMINDER_CRON` env var (default `0 * * * *`, i.e. every hour). Override with any valid cron expression.

## Environment variables (notable non-obvious ones)

| Var | Notes |
| --- | --- |
| `REQUIRED_CHANNELS` | Comma-separated handles (e.g. `@debtmate,@debtmate_news`). Empty → gate disabled. |
| `REMINDER_CRON` | Cron expression for reminder job. Defaults to `0 * * * *`. |
| `WEBHOOK_URL` | Production only — full base URL; bot registers `<WEBHOOK_URL>/telegraf/<secret>`. |

## OpenAPI / Scalar docs

`/openapi.json` is always served. `/docs` (Scalar UI) is **dev-only** — `@scalar/express-api-reference` is ESM-only and breaks under the `tsc` → CommonJS production build.
