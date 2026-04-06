import asyncio
import os
from supabase import create_async_client

async def main():
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")
    if supabase_url and supabase_key:
        client = await create_async_client(supabase_url, supabase_key)
        try:
            res = await client.table('game_scene').select('*').limit(1).execute()
            print("Columns:", res.data[0].keys() if res.data else "No data")
        except Exception as e:
            print(e)

asyncio.run(main())
