# Task Summary: Use Supabase to Save Game Data

- **TID**: 517
- **CHANGE_PREFIX**: 20260323-1927
- **Date/Time**: 20260323-1927
- **Major Category**: backend
- **Summary in one line**: integrate_supabase_for_team_records
- **Original Branch Commit ID**: N/A
- **User Prompt**: Objective:use superbase to save game data. you can use tmp SUPERBASE_API_KEY=[REDACTED]

## Root Cause
The game data, particularly `teamRecords` (which are used to determine the top bosses), was previously stored entirely in-memory on the backend (`server.ts`). This meant that game data was lost upon server restart, preventing persistence of game outcomes and player statistics.

## Solution
1. Integrated `@supabase/supabase-js` into the backend (`server.ts`).
2. Configured `.env.example` with the `SUPABASE_URL` and `SUPERBASE_API_KEY`.
3. Created a new database table `team_records` and added row-level security policies to allow insertions and selections.
4. Updated the `updateTeamRecord` function in `server.ts` to asynchronously `upsert` match outcomes (`wins`, `losses`, `win_rate`, `team`, `player_name`) into the Supabase database.
5. Modified the `getTopBosses` socket endpoint to prioritize fetching the top 10 bosses directly from Supabase via `ORDER BY win_rate DESC LIMIT 10`. It retains the old logic as a fallback in case Supabase credentials are missing or the query fails.
6. Created a database migration script `scripts/migrate_20260323_1927_init_supabase.py` containing the `CREATE TABLE` and Row Level Security `CREATE POLICY` SQL instructions.
7. Updated `README.md` to document the new environment variables and Supabase setup requirements.