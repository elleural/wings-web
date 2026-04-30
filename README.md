# wings-web

Observability dashboard for the [Hermes autonomous investor](https://github.com/elleural/wings/tree/master/hermes). SvelteKit on Vercel, Neon Postgres backend.

The Hermes host writes positions, orders, fills, fee accruals, P&L snapshots, sub-agent decisions, and skill invocations here. The dashboard reads them.

## Stack

- **SvelteKit 2** + **Svelte 5** (runes mode) — `@sveltejs/adapter-vercel`, functions pinned to `sfo1`
- **Drizzle ORM** + **`@neondatabase/serverless`** — typed schema, migrations, scale-to-zero
- **Tailwind v4** — dark trading-desk aesthetic
- **Zod** — request validation on every write endpoint

## Layout

```
src/
├── app.css                       Tailwind theme tokens (bg, fg, accent, danger…)
├── app.html                      Root template
├── lib/
│   ├── format.ts                 USD / pct / relative-time helpers
│   └── server/
│       ├── auth.ts               x-api-key constant-time check
│       ├── db/
│       │   ├── index.ts          Drizzle client over Neon HTTP driver
│       │   └── schema.ts         8-table schema (accounts, positions, orders, fills,
│       │                          fee_accruals, pnl_snapshots, agent_decisions,
│       │                          skill_invocations) + enums + indexes
│       ├── json.ts               parseBody / ok / created helpers
│       └── validation.ts         Zod schemas mirroring schema.ts
└── routes/
    ├── +layout.svelte            Nav + global CSS
    ├── +page.{svelte,server.ts}  Overview KPIs + recent decisions/fills
    ├── decisions/                Full decision log
    ├── fills/                    Full fill log
    ├── positions/                Open + recently closed positions
    ├── performance/              Equity curve + hourly snapshots table
    └── api/
        ├── health/+server.ts     GET — round-trip ping (latency + DB version)
        └── v1/
            ├── accounts/+server.ts          POST upsert / GET list
            ├── decisions/+server.ts         POST create / GET list
            ├── fills/+server.ts             POST create / GET list
            ├── orders/+server.ts            POST create / GET list
            ├── snapshots/+server.ts         POST upsert (account_id, hour) / GET list
            ├── skill-invocations/+server.ts POST create / GET list
            └── state/+server.ts             GET dashboard snapshot
```

## Local development

```bash
cp .env.example .env.local
# fill DATABASE_URL, DATABASE_URL_UNPOOLED from Vercel dashboard
# generate WINGS_WEB_API_KEY: openssl rand -hex 32

npm install
npm run db:generate         # generate Drizzle migration SQL from schema.ts
npm run db:migrate          # apply migrations to Neon
npm run dev                 # http://localhost:5173
```

## Deployment

Push to `main` on GitHub. Vercel picks up the SvelteKit framework automatically and deploys with the env vars provisioned by the Neon integration. Function region pinned to `sfo1` via `svelte.config.js` adapter options.

Env vars required in Vercel:

- `DATABASE_URL` — pooled (provided by Neon integration)
- `DATABASE_URL_UNPOOLED` — direct (provided by Neon integration; needed for migrations)
- `WINGS_WEB_API_KEY` — shared secret for the Hermes host writer (set manually)

## API contract (write endpoints)

All POST endpoints require `x-api-key: <WINGS_WEB_API_KEY>` (or `Authorization: Bearer <key>`). All bodies are JSON; numerics are passed as strings to preserve PG `NUMERIC` precision.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/accounts` | Upsert account by name (paper or live mode, current equity, HWM, reserve) |
| POST | `/api/v1/orders` | Log a proposed/submitted order |
| POST | `/api/v1/fills` | Log a (paper-simulated or live) fill with full fee breakdown |
| POST | `/api/v1/decisions` | Log a sub-agent decision with input/output/rationale |
| POST | `/api/v1/snapshots` | Upsert hourly P&L snapshot (account_id, hour unique) |
| POST | `/api/v1/skill-invocations` | Log a single skill invocation (latency, success, cost) |
| GET | `/api/v1/state` | Dashboard snapshot: account + open positions + recent decisions/fills + 7-day snapshots |
| GET | `/api/health` | DB round-trip + version check |

See `src/lib/server/validation.ts` for exact request shapes.

## Security model

- **Writes:** single `WINGS_WEB_API_KEY` shared with the Hermes host. Constant-time comparison. Defaults to 401 on misconfiguration (refuses all writes if env var missing — never allows by default).
- **Reads (dashboard pages + GET endpoints):** open in v0. Auth.js or Clerk wraps the dashboard before Phase 2 (Asset Class 2 paper trading).
- **DB credentials:** marked sensitive in Vercel; never logged.
