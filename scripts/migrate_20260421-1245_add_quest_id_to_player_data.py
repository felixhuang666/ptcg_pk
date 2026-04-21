import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

async def migrate():
    from supabase import create_async_client
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")

    if not supabase_url or not supabase_key:
        print("Missing Supabase credentials in .env")
        return

    print("Please run the following SQL in your Supabase SQL Editor:")
    sql = """
ALTER TABLE public.game_player_data ADD COLUMN IF NOT EXISTS quest_id text null;
    """
    print(sql)

    print("Migration script executed.")

if __name__ == "__main__":
    asyncio.run(migrate())
