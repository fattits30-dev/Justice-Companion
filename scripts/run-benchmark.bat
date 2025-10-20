@echo off
set JUSTICE_DB_PATH=./justice.db
pnpm tsx scripts/benchmark-database-queries.ts %*
