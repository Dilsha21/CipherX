# Database — shared Neon Postgres

The system uses **one shared Neon Postgres project** (free tier, serverless)
rather than a separate database per service. To keep that safe with five
people working independently, **each service owns its own Postgres schema**
and its own migration history — nobody edits another service's tables.

| Service | Postgres schema | Migrations owned by |
|---|---|---|
| `auth-core` | `auth_core` | Member A |
| `biometric-factor` | `biometric_factor` | Member B |
| `voice-otp-factor` | `voice_otp_factor` | Member C |
| `security-admin` | `security_admin` | Member E |
| `frontend` | *(none — it never talks to the DB directly)* | — |

Rule: your migrations only ever `CREATE`/`ALTER` objects inside your own
schema. If you think you need a table in someone else's schema, that's a
sign the API contract needs an endpoint instead — ask them, don't reach into
their tables directly.

## Getting credentials

The Neon project itself is created and owned by whoever set up the project
(ask in the group chat if you don't have credentials yet). You'll be given
two connection strings — **never commit either of these**, they go in your
local `.env` only (already gitignored):

```
DATABASE_URL=postgres://...neon.tech/<db>?sslmode=require          # pooled, use this for the running app
DIRECT_DATABASE_URL=postgres://...neon.tech/<db>?sslmode=require   # unpooled, use this for running migrations
```

Neon's pooled (PgBouncer) connection is fine for normal app queries, but
migration tools that run DDL in a single session are more reliable against
the **direct** connection — that's why there are two.

## Migration tool: node-pg-migrate

Every backend service (`auth-core`, `biometric-factor`, `voice-otp-factor`,
`security-admin`) has the same setup: a `migrations/` folder, and three npm
scripts.

```
cd <your-service>
npm install
cp .env.example .env        # fill in DIRECT_DATABASE_URL at minimum
npm run migrate:create add-something-table
# edit the generated migrations/<timestamp>_add-something-table.js
npm run migrate:up          # applies your pending migrations
npm run migrate:down        # rolls back the last one, if you need to
```

Each service's migrations run against **its own schema only** (configured
in that service's `.pgmigraterc`) and track their own history — Postgres
schemas are isolated, so running `auth-core`'s migrations never touches
`biometric-factor`'s tables, even though they're in the same database.

## Current status

- `auth-core` has real migrations (`auth_core.users`, `auth_core.challenges`)
  matching its existing in-memory data model — see
  `auth-core/migrations/`. The app code still reads/writes the in-memory
  stores; wiring it to actually query Postgres is a follow-up once
  `DATABASE_URL` is available to everyone. Running the migration now is
  still useful — it lets you sanity-check your Neon credentials work.
- `biometric-factor`, `voice-otp-factor`, `security-admin` have the tooling
  wired up but an empty `migrations/` folder — add your first migration
  when you get to persistence for your module.
