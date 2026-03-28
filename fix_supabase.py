import re

with open("backend/main.py", "r") as f:
    content = f.read()

# Replace table fetching to select only id, map_data instead of * ? Wait, list maps fetches 'id, name'.
# If 'name' doesn't exist, it errors out too.
# To be completely safe against unmigrated schema, let's catch the PGRST204 error specifically and retry without 'name', or just don't use 'name' in Supabase at all and only keep it in in_memory_maps for now since the prompt just asked for "rename map" functionality.
# Wait, the prompt says "If changed DB related tables/schema, must have a db migration script". We did write one. But if the user hasn't run it yet, it throws PGRST204.
# So we can just catch the exception, check if it's PGRST204 (column not found), and retry without the 'name' column!

fetch_maps = """            res = await client.table('maps').select('id, name').execute()
            if res.data is not None:
                return res.data"""

new_fetch_maps = """            try:
                res = await client.table('maps').select('id, name').execute()
                if res.data is not None:
                    return res.data
            except Exception as inner_e:
                if 'PGRST204' in str(inner_e):
                    res = await client.table('maps').select('id').execute()
                    if res.data is not None:
                        return [{"id": m["id"], "name": "Unknown"} for m in res.data]
                else:
                    raise inner_e"""
content = content.replace(fetch_maps, new_fetch_maps)


upsert_map = """            await client.table('maps').upsert({'id': map_id, 'name': map_name, 'map_data': map_data}).execute()"""

new_upsert_map = """            try:
                await client.table('maps').upsert({'id': map_id, 'name': map_name, 'map_data': map_data}).execute()
            except Exception as inner_e:
                if 'PGRST204' in str(inner_e):
                    await client.table('maps').upsert({'id': map_id, 'map_data': map_data}).execute()
                else:
                    raise inner_e"""
content = content.replace(upsert_map, new_upsert_map)


upsert_gen_map = """            await client.table('maps').upsert({'id': map_id, 'name': name, 'map_data': map_data}).execute()"""

new_upsert_gen_map = """            try:
                await client.table('maps').upsert({'id': map_id, 'name': name, 'map_data': map_data}).execute()
            except Exception as inner_e:
                if 'PGRST204' in str(inner_e):
                    await client.table('maps').upsert({'id': map_id, 'map_data': map_data}).execute()
                else:
                    raise inner_e"""
content = content.replace(upsert_gen_map, new_upsert_gen_map)


with open("backend/main.py", "w") as f:
    f.write(content)
