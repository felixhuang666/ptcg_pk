import os
import asyncio
from supabase import create_async_client
from dotenv import load_dotenv

# Ensure the parent directory is in sys.path if needed, or rely on python -m scripts.migrate...
load_dotenv()

async def migrate():
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")

    if not supabase_url or not supabase_key:
        print(f"SUPABASE_URL: {supabase_url}")
        print(f"SUPABASE_SERVICE_ROLE_KEY: {supabase_key}")
        print("Supabase URL or Key not found. Cannot run migration.")
        return

    print("Connecting to Supabase...")

    print("WARNING: python-supabase does not support raw DDL commands directly.")
    print("Please run the following SQL command in your Supabase SQL Editor:")
    print("-" * 50)
    print("ALTER TABLE public.game_scene")
    print("ADD COLUMN IF NOT EXISTS scene_entities JSONB DEFAULT '{}'::jsonb,")
    print("ADD COLUMN IF NOT EXISTS layers JSONB DEFAULT '[]'::jsonb;")
    print("-" * 50)
    print("The backend currently handles missing columns by silently dropping them")
    print("from the API payload and falling back to memory/local storage.")
    print("To persist `scene_entities` and `layers` properties to Supabase,")
    print("the above SQL migration must be executed in your Supabase console.")

if __name__ == "__main__":
    asyncio.run(migrate())
