import os
import asyncio
from supabase import create_async_client
from dotenv import load_dotenv

async def migrate():
    # Ensure environment variables are loaded from .env
    load_dotenv()

    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")

    if not supabase_url or not supabase_key:
        print("Error: SUPABASE_URL or SUPABASE_KEY not set in environment.")
        return

    client = await create_async_client(supabase_url, supabase_key)

    try:
        # Check if table exists by trying to select from it
        res = await client.table('game_npcs').select('id').limit(1).execute()
        print("Table 'game_npcs' exists.")
    except Exception as e:
        print(f"Table 'game_npcs' might not exist or error occurred: {e}")
        print("If table does not exist, please run the following SQL in Supabase SQL Editor:")
        print('''
CREATE TABLE public.game_npcs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    x FLOAT NOT NULL,
    y FLOAT NOT NULL,
    role_walk_sprite TEXT NOT NULL,
    role_atk_sprite TEXT NOT NULL,
    map_id TEXT NOT NULL,
    dialog TEXT
);
''')

    # Try to insert default data
    try:
        default_data = {
            "id": "npc-1",
            "name": "村長",
            "x": 200,
            "y": 200,
            "role_walk_sprite": "yo.png",
            "role_atk_sprite": "yo_atk.png",
            "map_id": "main_200",
            "dialog": "歡迎來到這個世界！"
        }
        res = await client.table('game_npcs').upsert(default_data).execute()
        print("Successfully upserted default data into 'game_npcs'.")
        print(res.data)
    except Exception as e:
        print(f"Failed to insert default data into 'game_npcs': {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
