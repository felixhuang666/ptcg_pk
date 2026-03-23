import os
import sys

# Replace with your actual Supabase project URL and service role key if not using env vars
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://your-project.supabase.co")
SUPABASE_KEY = os.environ.get("SUPERBASE_API_KEY", "")

if not SUPABASE_KEY:
    print("Error: SUPERBASE_API_KEY environment variable is missing.")
    sys.exit(1)

print("This is a migration script to add user teams table.")

SQL_MIGRATION = """
-- Create user_teams table for syncing teams
CREATE TABLE IF NOT EXISTS user_teams (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dices JSONB NOT NULL,
    monsters JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE user_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read/write for own user" ON "public"."user_teams" AS PERMISSIVE FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
"""

print("\n--- SQL MIGRATION SCRIPT ---")
print(SQL_MIGRATION)
print("----------------------------\n")

print("Migration completed or SQL provided. Please run this SQL in your Supabase SQL Editor.")
