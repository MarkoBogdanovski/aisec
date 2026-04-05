# Supabase Setup

This backend can run against either a plain PostgreSQL database or Supabase Postgres.

## Environment

Set `DATABASE_PROVIDER=supabase` in `.env`.

Runtime connection resolution:

1. `SUPABASE_DATABASE_URL`
2. `DATABASE_URL`

Direct Prisma CLI connection resolution:

1. `SUPABASE_DIRECT_URL`
2. `DATABASE_DIRECT_URL`
3. `SUPABASE_DATABASE_URL`
4. `DATABASE_URL`

This lets you use:

- Supabase pooled connection for runtime
- Supabase direct connection for Prisma CLI operations

## Recommended Supabase Values

- `SUPABASE_DATABASE_URL`
  Use the Supabase pooler connection string for app runtime.
- `SUPABASE_DIRECT_URL`
  Use the direct Postgres connection string for `prisma db push`, migrations, and schema diff operations.

## Export Schema For Supabase

Generate the SQL file:

```bash
npm run supabase:schema:export
```

This writes:

```text
supabase/schema.sql
```

You can paste or import that SQL in the Supabase SQL editor.

## Apply Schema Directly

If your `SUPABASE_DIRECT_URL` is configured, you can also push the Prisma schema directly:

```bash
npm run prisma:push
```
