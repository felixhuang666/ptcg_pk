import os
import asyncio
from dotenv import load_dotenv

# Ensure the parent directory is in sys.path if needed, or rely on python -m scripts.migrate...
load_dotenv()

async def migrate():
    from supabase import create_async_client
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")

    if not supabase_url or not supabase_key:
        print("Missing Supabase credentials in .env")
        return

    client = await create_async_client(supabase_url, supabase_key)

    # Execute raw SQL or use rpc if raw SQL isn't exposed.
    # Supabase python client doesn't expose a direct raw sql method, we can try to call a standard rpc or just print instructions if the user needs to run it in SQL editor.
    # Alternatively, create a REST api call to postgres API if available.

    print("Please run the following SQL in your Supabase SQL Editor:")
    sql = """
create table if not exists public.game_player_data (
  id text not null,
  name text not null,
  map_id text null,
  pos_x integer null,
  pos_y integer null,
  constraint game_player_data_pkey primary key (id)
) TABLESPACE pg_default;
    """
    print(sql)

    print("Migration script executed.")

if __name__ == "__main__":
    asyncio.run(migrate())
