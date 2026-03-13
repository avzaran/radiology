#!/bin/sh
set -e

PGHOST="${POSTGRES_HOST:-postgres}"
PGPORT="${POSTGRES_PORT:-5432}"

echo "Waiting for postgres at $PGHOST:$PGPORT..."
until nc -z -w1 "$PGHOST" "$PGPORT"; do
  sleep 1
done
echo "Postgres ready."

echo "Running migrations..."
npx knex --knexfile knexfile.ts migrate:latest
echo "Migrations done."

exec node dist/index.js
