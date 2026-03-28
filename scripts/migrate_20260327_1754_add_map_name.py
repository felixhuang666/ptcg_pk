import asyncio
import os
from supabase import create_async_client

async def migrate():
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")
    if not supabase_url or not supabase_key:
        print("Supabase URL or Key not set. Skipping migration.")
        return

    client = await create_async_client(supabase_url, supabase_key)

    print("Database Migration Script")
    print("Please execute the following SQL in your Supabase SQL Editor:")
    print("===============================================================")
    print("ALTER TABLE maps ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'World Map';")
    print("===============================================================")

    print("Migration instruction generated successfully.")

if __name__ == "__main__":
    asyncio.run(migrate())
