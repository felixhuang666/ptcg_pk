import os
import asyncio
from supabase import create_async_client

async def migrate():
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")

    if not supabase_url or not supabase_key:
        print("Error: SUPABASE_URL or SUPABASE_KEY not set in environment.")
        return

    client = await create_async_client(supabase_url, supabase_key)

    try:
        # Check if table exists by trying to select from it
        res = await client.table('game_roles').select('id').limit(1).execute()
        print("Table 'game_roles' exists.")
    except Exception as e:
        print(f"Table 'game_roles' might not exist or error occurred: {e}")
        # Supabase Python client doesn't directly support creating tables via DDL yet.
        # This normally requires executing raw SQL. We can try RPC if available, or just instruct the user.
        print("If table does not exist, please run the following SQL in Supabase SQL Editor:")
        print('''
CREATE TABLE public.game_roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role_walk_sprite TEXT NOT NULL,
    role_atk_sprite TEXT NOT NULL
);
''')

    # Try to insert default data
    try:
        default_data = {
            "id": "1",
            "name": "魔女",
            "role_walk_sprite": "yo.png",
            "role_atk_sprite": "yo_atk.png"
        }
        res = await client.table('game_roles').upsert(default_data).execute()
        print("Successfully upserted default data into 'game_roles'.")
        print(res.data)
    except Exception as e:
        print(f"Failed to insert default data into 'game_roles': {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
