import os
import sys

# Replace with your actual Supabase project URL and service role key if not using env vars
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://your-project.supabase.co")
SUPABASE_KEY = os.environ.get("SUPERBASE_API_KEY", "")

if not SUPABASE_KEY:
    print("Error: SUPERBASE_API_KEY environment variable is missing.")
    sys.exit(1)

print("This is a migration script to add game data and auth features.")

SQL_MIGRATION = """
-- Create game_data table for storing monsters, skills, and settings
CREATE TABLE IF NOT EXISTS game_data (
    id TEXT PRIMARY KEY,
    monsters JSONB NOT NULL,
    skills JSONB NOT NULL,
    settings JSONB NOT NULL
);

ALTER TABLE game_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON "public"."game_data" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Enable all access for authenticated users" ON "public"."game_data" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
"""

print("\n--- SQL MIGRATION SCRIPT ---")
print(SQL_MIGRATION)
print("----------------------------\n")

print("Migration completed or SQL provided. Please run this SQL in your Supabase SQL Editor.")
