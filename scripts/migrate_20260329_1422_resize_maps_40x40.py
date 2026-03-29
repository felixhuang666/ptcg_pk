import asyncio
import os
from supabase import create_async_client
from dotenv import load_dotenv

async def migrate():
    load_dotenv()

    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")

    if not supabase_url or not supabase_key:
        print("Supabase URL or Key not set. Skipping migration.")
        return

    client = await create_async_client(supabase_url, supabase_key)
    print("Fetching maps...")

    res = await client.table('maps').select('*').execute()

    if res.data:
        for map_doc in res.data:
            map_data = map_doc.get("map_data", {})
            if map_data.get("width") != 40 or map_data.get("height") != 40:
                print(f"Migrating map {map_doc['id']} from {map_data.get('width')}x{map_data.get('height')} to 40x40")
                old_w = map_data.get("width", 200)
                old_h = map_data.get("height", 200)
                old_tiles = map_data.get("tiles", [])
                old_objects = map_data.get("objects", [])

                new_w, new_h = 40, 40
                new_tiles = [2] * (new_w * new_h)
                new_objects = [-1] * (new_w * new_h)

                for y in range(min(old_h, new_h)):
                    for x in range(min(old_w, new_w)):
                        if y * old_w + x < len(old_tiles):
                            new_tiles[y * new_w + x] = old_tiles[y * old_w + x]
                        if old_objects and y * old_w + x < len(old_objects):
                            new_objects[y * new_w + x] = old_objects[y * old_w + x] if old_objects[y * old_w + x] is not None else -1

                map_data["width"] = new_w
                map_data["height"] = new_h
                map_data["tiles"] = new_tiles
                map_data["objects"] = new_objects

                await client.table('maps').update({"map_data": map_data}).eq("id", map_doc["id"]).execute()
                print(f"Successfully migrated map {map_doc['id']}")

    print("Migration finished.")

if __name__ == "__main__":
    asyncio.run(migrate())
