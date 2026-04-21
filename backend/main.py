import os
import json
import uuid
import httpx
import asyncio
from fastapi import FastAPI, Request, HTTPException, Response, Depends
from fastapi.responses import RedirectResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from .socket_app import sio, game_loop

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load game data from Supabase
    from backend.game.data import load_game_data_from_supabase
    await load_game_data_from_supabase()

    # Load NPCs into cache
    try:
        from supabase import create_async_client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")
        if supabase_url and supabase_key:
            client = await create_async_client(supabase_url, supabase_key)
            res = await client.table('game_npcs').select('*').execute()
            if res.data:
                from backend.socket_app import rpg_npcs
                for npc in res.data:
                    rpg_npcs[npc['id']] = npc
    except Exception as e:
        print(f"Failed to load NPCs on startup: {e}")

    # Startup: Create game loop task
    loop_task = asyncio.create_task(game_loop())
    yield
    # Shutdown: Cancel game loop
    loop_task.cancel()

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(lifespan=lifespan)

# Mount Socket.IO to FastAPI app
import socketio
app.mount('/socket.io', socketio.ASGIApp(sio))

# Mount static files
if os.path.exists("dist"):
    app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")

# Google OAuth setup
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
APP_BACKEND_PORT = os.environ.get("APP_BACKEND_PORT", "5000")
APP_URL = os.environ.get("APP_URL", f"http://localhost:{APP_BACKEND_PORT}")

REDIRECT_URI = f"{APP_URL}/auth/callback"

USERS_DIR = "users"
os.makedirs(USERS_DIR, exist_ok=True)

# Helper to save user data
def save_user_data(user_id: str, data: dict):
    filepath = os.path.join(USERS_DIR, f"{user_id}.json")
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def get_user_data(user_id: str) -> dict:
    filepath = os.path.join(USERS_DIR, f"{user_id}.json")
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

@app.get("/auth/login")
async def login():
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google Client ID not configured")

    auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        "response_type=code&"
        f"client_id={GOOGLE_CLIENT_ID}&"
        f"redirect_uri={REDIRECT_URI}&"
        "scope=openid%20email%20profile&"
        "prompt=select_account"
    )
    return RedirectResponse(auth_url)

@app.get("/auth/callback")
async def auth_callback(code: str, response: Response):
    async with httpx.AsyncClient() as client:
        # Exchange code for token
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )

        if token_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange token")

        token_data = token_res.json()
        access_token = token_data.get("access_token")

        # Get user info
        user_info_res = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )

        if user_info_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get user info")

        user_info = user_info_res.json()
        user_id = user_info.get("id")

        # Save user data
        existing_data = get_user_data(user_id)
        if not existing_data:
            existing_data = {
                "oauth_data": user_info,
                "team_data": {},
                "game_data": {}
            }
        else:
            existing_data["oauth_data"] = user_info

        save_user_data(user_id, existing_data)

        # Redirect back to frontend
        redirect_res = RedirectResponse(url="/")

        # Set a simple cookie session (In production use proper session management)
        redirect_res.set_cookie(key="session_id", value=user_id, httponly=True, samesite="lax")
        return redirect_res

@app.get("/api/user/location")
async def get_user_location(request: Request):
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        from supabase import create_async_client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")
        if supabase_url and supabase_key:
            client = await create_async_client(supabase_url, supabase_key)
            res = await client.table('game_player_data').select('*').eq('id', session_id).limit(1).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
    except Exception as e:
        print(f"Supabase warning (fetching user location): {e}")

    return {"id": session_id, "quest_id": None, "map_id": None, "pos_x": None, "pos_y": None}

@app.post("/api/user/location")
async def update_user_location(request: Request):
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    data = await request.json()
    quest_id = data.get("quest_id")
    map_id = data.get("map_id")
    pos_x = data.get("pos_x")
    pos_y = data.get("pos_y")

    user_data = get_user_data(session_id)
    name = "Player"
    if user_data and "profile" in user_data and "nickname" in user_data["profile"]:
        name = user_data["profile"]["nickname"]
    elif user_data and "oauth_data" in user_data and "name" in user_data["oauth_data"]:
        name = user_data["oauth_data"]["name"]

    try:
        from supabase import create_async_client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")
        if supabase_url and supabase_key:
            client = await create_async_client(supabase_url, supabase_key)
            payload = {
                'id': session_id,
                'name': name,
                'map_id': map_id,
                'pos_x': pos_x,
                'pos_y': pos_y
            }
            if quest_id is not None:
                payload['quest_id'] = quest_id
            await client.table('game_player_data').upsert(payload).execute()
            return {"success": True, "data": payload}
    except Exception as e:
        print(f"Supabase warning (saving user location): {e}")
        return {"success": False, "error": str(e)}

    return {"success": False, "error": "Supabase not configured"}

@app.get("/api/auth/me")
async def get_current_user(request: Request):
    session_id = request.cookies.get("session_id")
    if not session_id:
        return {"authenticated": False}

    user_data = get_user_data(session_id)
    if not user_data or "oauth_data" not in user_data:
        return {"authenticated": False}

    return {
        "authenticated": True,
        "user": user_data["oauth_data"],
        "profile": user_data.get("profile", {})
    }

@app.put("/api/user/profile")
async def update_user_profile(request: Request):
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_data = get_user_data(session_id)
    if not user_data:
        raise HTTPException(status_code=401, detail="User not found")

    body = await request.json()
    if "profile" not in user_data:
        user_data["profile"] = {}

    if "nickname" in body:
        user_data["profile"]["nickname"] = body["nickname"]

    save_user_data(session_id, user_data)

    return {"success": True, "profile": user_data["profile"]}

@app.post("/api/auth/logout")
async def logout(response: Response):
    response.delete_cookie("session_id", samesite="lax")
    return {"success": True}

@app.get("/")
async def root():
    if os.path.exists("dist/index.html"):
        return FileResponse("dist/index.html")
    return {"message": "Frontend not built yet. Please run `make build`."}

quest_id_counter = 1
in_memory_quests = {}

in_memory_scenes = {
    1: {
        "id": 1,
        "name": "Scene 1",
        "map_list": [
            {
                "instance_id": "inst_1",
                "map_id": "main_200",
                "layer_id": "layer1",
                "offset_position": {"x": 0, "y": 0},
                "map_size": {"width": 40, "height": 40}
            }
        ],
        "scene_entities": {
            "layers": [
                {"id": "layer1", "name": "Layer 1"}
            ]
        }
    }
}
scene_id_counter = 2

in_memory_maps = {
    "main_200": {
        "id": "main_200",
        "name": "World Map",
        "map_data": {
            "width": 40,
            "height": 40,
            "layers": {
                "base": [2] * (40 * 40)
            },
            "tiles": [2] * (40 * 40), # 2 = grass
            "objects": [-1] * (40 * 40), # -1 = empty
            "map_meta": {
                "tilesets": [{
                    "firstgid": 1,
                    "name": "main_20x10",
                    "image_source": "main_20x10.png",
                    "columns": 20,
                    "tilewidth": 32,
                    "tileheight": 32,
                    "total_tiles": 200
                }]
            }
        }
    }
}
@app.get("/api/game_obj_templates")
async def list_game_obj_templates():
    templates = []
    seen = set()

    # Try local json
    paths = ["dist/assets/game_obj_templates", "public/assets/game_obj_templates"]
    for p in paths:
        if os.path.exists(p):
            for filename in os.listdir(p):
                if filename.endswith(".json") and filename not in seen:
                    filepath = os.path.join(p, filename)
                    try:
                        with open(filepath, "r", encoding="utf-8") as f:
                            template_data = json.load(f)
                            templates.append(template_data)
                            seen.add(filename)
                    except Exception as e:
                        print(f"Error reading local template {filename}: {e}")

    return templates


@app.get("/api/maps")
async def list_maps():
    maps = []
    # 1. Try Supabase
    try:
        from supabase import create_async_client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")
        if supabase_url and supabase_key:
            client = await create_async_client(supabase_url, supabase_key)
            try:
                res = await client.table('maps').select('id, name').execute()
                if res.data is not None:
                    for m in res.data:
                        m["source_type"] = "DB"
                    maps.extend(res.data)
            except Exception as inner_e:
                if 'PGRST204' in str(inner_e):
                    res = await client.table('maps').select('id').execute()
                    if res.data is not None:
                        maps.extend([{"id": m["id"], "name": "Unknown", "source_type": "DB"} for m in res.data])
                else:
                    raise inner_e
    except Exception as e:
        print(f"Supabase warning (fetching maps): {e}")

    # 2. Add in-memory
    existing_ids = {m["id"] for m in maps}
    for k, v in in_memory_maps.items():
        if k not in existing_ids:
            maps.append({"id": k, "name": v.get("name", k), "source_type": "memory"})
            existing_ids.add(k)

    # 3. Add local json from dist/assets/maps and public/assets/maps
    paths = ["dist/assets/maps", "public/assets/maps"]
    for p in paths:
        if os.path.exists(p):
            for filename in os.listdir(p):
                if filename.endswith(".json"):
                    map_id = filename[:-5]
                    if map_id not in existing_ids:
                        try:
                            with open(os.path.join(p, filename), "r", encoding="utf-8") as f:
                                map_data = json.load(f)
                                maps.append({"id": map_id, "name": map_data.get("name", map_id), "source_type": "local-asset"})
                                existing_ids.add(map_id)
                        except Exception as e:
                            print(f"Error reading local map {filename}: {e}")

    return maps

@app.get("/api/map")
async def get_map(id: str = "main_200"):
    # 1. Try Supabase
    try:
        from supabase import create_async_client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")
        if supabase_url and supabase_key:
            client = await create_async_client(supabase_url, supabase_key)
            res = await client.table('maps').select('*').eq('id', id).limit(1).execute()
            if res.data and len(res.data) > 0:
                map_obj = res.data[0]
                return {
                    "id": map_obj.get("id"),
                    "name": map_obj.get("name", id),
                    "map_data": map_obj.get("map_data")
                }
    except Exception as e:
        print(f"Supabase warning (fetching map): {e}")

    # 2. Try in-memory
    if id in in_memory_maps:
        return in_memory_maps[id]

    # 3. Try local json
    paths = ["dist/assets/maps", "public/assets/maps"]
    for p in paths:
        filepath = os.path.join(p, f"{id}.json")
        if os.path.exists(filepath):
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    map_obj = json.load(f)
                    return {
                        "id": map_obj.get("id", id),
                        "name": map_obj.get("name", id),
                        "map_data": map_obj.get("map_data", map_obj) # Fallback if structure differs
                    }
            except Exception as e:
                print(f"Error reading local map {id}.json: {e}")

    return in_memory_maps.get("main_200")

@app.post("/api/map")
async def save_map(request: Request):
    global in_memory_maps
    data = await request.json()
    # Support old payload format (just map_data directly)
    if "tiles" in data and "id" not in data:
        map_id = "main_200"
        map_name = "World Map"
        map_data = data
    else:
        map_id = data.get("id", "main_200")
        map_name = data.get("name", "World Map")
        map_data = data.get("map_data")

    try:
        from supabase import create_async_client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")
        if supabase_url and supabase_key:
            client = await create_async_client(supabase_url, supabase_key)
            try:
                await client.table('maps').upsert({'id': map_id, 'name': map_name, 'map_data': map_data}).execute()
            except Exception as inner_e:
                if 'PGRST204' in str(inner_e):
                    await client.table('maps').upsert({'id': map_id, 'map_data': map_data}).execute()
                else:
                    raise inner_e
    except Exception as e:
        print(f"Supabase warning (saving map): {e}")

    in_memory_maps[map_id] = {
        "id": map_id,
        "name": map_name,
        "map_data": map_data
    }

    # Save map_meta to file if it exists
    if map_data and "map_meta" in map_data:
        try:
            safe_id = os.path.basename(map_id)
            import re
            safe_id = re.sub(r'[^a-zA-Z0-9_\-]', '', safe_id)
            paths = ["dist/assets/map_meta", "public/assets/map_meta"]
            for base_dir in paths:
                if not os.path.exists(base_dir):
                    os.makedirs(base_dir, exist_ok=True)
                json_path = os.path.join(base_dir, f"{safe_id}.json")
                with open(json_path, "w", encoding="utf-8") as f:
                    json.dump(map_data["map_meta"], f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Error saving map_meta for {map_id}: {e}")

    from .socket_app import sio
    # Send the updated payload with map_id
    await sio.emit("map_updated_v2", {"map_id": map_id, "map_data": map_data})
    # Support old payload for legacy clients
    await sio.emit("map_updated", map_data)
    return {"success": True, "id": map_id, "name": map_name}

import noise
import uuid

@app.post("/api/map/generate")
async def generate_map(request: Request):
    global in_memory_maps
    data = await request.json()
    width = data.get("width", 40)
    height = data.get("height", 40)
    name = data.get("name", "Generated Map")

    scale = 20.0
    octaves = 4
    persistence = 0.5
    lacunarity = 2.0
    seed = int(uuid.uuid4().hex[:8], 16) % 100000

    import random
    tiles = []
    objects = []
    for y in range(height):
        for x in range(width):
            val = noise.pnoise2(x/scale, y/scale, octaves=octaves, persistence=persistence, lacunarity=lacunarity, repeatx=width, repeaty=height, base=seed)
            obj_val = -1

            # Ground layer
            if val < -0.1:
                tiles.append(48) # Water
            elif val > 0.15:
                tiles.append(101) # Dirt Base Dark
            else:
                tiles.append(2) # Grass

            # Object layer (spawn rocks, plants, bushes based on high frequency noise and thresholds)
            if val > 0.2:
                # Sparse rocks on dirt/mountains
                if random.random() < 0.1:
                    obj_val = random.choice([92, 93, 94]) # Rocks
            elif -0.1 <= val <= 0.15:
                # Nature objects on grass
                if random.random() < 0.05:
                    obj_val = random.choice([96, 97, 98, 99]) # Grass tufts, plants, bushes

            objects.append(obj_val)

    map_id = f"gen_{uuid.uuid4().hex[:8]}"
    block_width = data.get("block_width", 32)
    block_height = data.get("block_height", 32)
    map_data = {
        "width": width,
        "height": height,
        "block_width": block_width,
        "block_height": block_height,
        "tiles": tiles,
        "objects": objects,
        "map_meta": {
            "tilesets": [{
                "firstgid": 1,
                "name": "main_20x10",
                "image_source": "main_20x10.png",
                "columns": 20,
                "tilewidth": 32,
                "tileheight": 32,
                "total_tiles": 200
            }]
        }
    }

    try:
        from supabase import create_async_client
        import os
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")
        if supabase_url and supabase_key:
            client = await create_async_client(supabase_url, supabase_key)
            try:
                await client.table('maps').upsert({'id': map_id, 'name': name, 'map_data': map_data}).execute()
            except Exception as inner_e:
                if 'PGRST204' in str(inner_e):
                    await client.table('maps').upsert({'id': map_id, 'map_data': map_data}).execute()
                else:
                    raise inner_e
    except Exception as e:
        print(f"Supabase warning (generating map): {e}")

    in_memory_maps[map_id] = {
        "id": map_id,
        "name": name,
        "map_data": map_data
    }

    from .socket_app import sio
    await sio.emit("map_updated_v2", {"map_id": map_id, "map_data": map_data})
    # legacy
    await sio.emit("map_updated", map_data)

    return {"success": True, "id": map_id, "name": name, "map_data": map_data}


@app.get("/api/roles")
async def get_roles():
    try:
        from supabase import create_async_client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")
        if supabase_url and supabase_key:
            client = await create_async_client(supabase_url, supabase_key)
            res = await client.table('game_roles').select('*').execute()
            print(res)
            if res.data and len(res.data) > 0:
                return res.data
    except Exception as e:
        print(f"Supabase warning (fetching roles): {e}")

    # Default role if table doesn't exist or is empty
    print("Using default role")
    return [
        {
            "id": "1",
            "name": "魔女",
            "role_walk_sprite": "yo.png",
            "role_atk_sprite": "yo_atk.png"
        }
    ]

@app.get("/api/npcs")
async def get_npcs():
    try:
        from supabase import create_async_client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")
        if supabase_url and supabase_key:
            client = await create_async_client(supabase_url, supabase_key)
            res = await client.table('game_npcs').select('*').execute()
            if res.data is not None:
                return res.data
    except Exception as e:
        print(f"Supabase warning (fetching npcs): {e}")

    # Fallback to empty list or in-memory if needed
    return []

@app.post("/api/npc")
async def create_npc(request: Request):
    npc_data = await request.json()
    if 'id' not in npc_data:
        npc_data['id'] = f"npc-{uuid.uuid4().hex[:7]}"

    try:
        from supabase import create_async_client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")
        if supabase_url and supabase_key:
            client = await create_async_client(supabase_url, supabase_key)
            await client.table('game_npcs').insert(npc_data).execute()
    except Exception as e:
        print(f"Supabase warning (creating npc): {e}")
        return {"success": False, "error": str(e)}

    from .socket_app import sio, rpg_npcs
    rpg_npcs[npc_data['id']] = npc_data
    # Emit to all players in RPG mode
    await sio.emit("npc_created", npc_data)
    return {"success": True, "npc": npc_data}

@app.put("/api/npc/{npc_id}")
async def update_npc(npc_id: str, request: Request):
    npc_data = await request.json()
    try:
        from supabase import create_async_client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")
        if supabase_url and supabase_key:
            client = await create_async_client(supabase_url, supabase_key)
            await client.table('game_npcs').update(npc_data).eq('id', npc_id).execute()
    except Exception as e:
        print(f"Supabase warning (updating npc): {e}")
        return {"success": False, "error": str(e)}

    from .socket_app import sio, rpg_npcs
    if npc_id in rpg_npcs:
        rpg_npcs[npc_id].update(npc_data)
    else:
        rpg_npcs[npc_id] = npc_data

    await sio.emit("npc_updated", npc_data)
    return {"success": True, "npc": npc_data}

@app.delete("/api/npc/{npc_id}")
async def delete_npc(npc_id: str):
    success = False

    from .socket_app import sio, rpg_npcs
    if npc_id in rpg_npcs:
        del rpg_npcs[npc_id]
        success = True

    try:
        from supabase import create_async_client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")
        if supabase_url and supabase_key:
            client = await create_async_client(supabase_url, supabase_key)
            await client.table('game_npcs').delete().eq('id', npc_id).execute()
            success = True
    except Exception as e:
        print(f"Supabase warning (deleting npc): {e}")

    # Delete local files
    import re
    import os
    safe_id = os.path.basename(str(npc_id))
    safe_id = re.sub(r'[^a-zA-Z0-9_\-]', '', safe_id)

    paths = ["dist/assets/game_npcs", "public/assets/game_npcs"]
    for p in paths:
        file_path = os.path.join(p, f"{safe_id}.json")
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                success = True
            except Exception as e:
                print(f"Error deleting local npc file {file_path}: {e}")

    if success:
        await sio.emit("npc_deleted", {"id": npc_id})
        return {"success": True}
    return {"success": False, "error": "NPC not found"}

@app.get("/api/scenes")
async def get_scenes():
    scenes = []
    try:
        from supabase import create_async_client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")
        if supabase_url and supabase_key:
            client = await create_async_client(supabase_url, supabase_key)
            res = await client.table('game_scene').select('id, name').execute()
            if res.data is not None:
                for s in res.data:
                    s["source_type"] = "DB"
                scenes.extend(res.data)
    except Exception as e:
        print(f"Supabase warning (fetching scenes): {e}")

    existing_ids = {str(s["id"]) for s in scenes}

    for k, v in in_memory_scenes.items():
        if str(k) not in existing_ids:
            scenes.append({"id": k, "name": v.get("name", f"Scene {k}"), "source_type": "memory"})
            existing_ids.add(str(k))

    paths = ["dist/assets/game_scene", "public/assets/game_scene"]
    for p in paths:
        if os.path.exists(p):
            for filename in os.listdir(p):
                if filename.endswith(".json"):
                    scene_id = filename[:-5]
                    if str(scene_id) not in existing_ids:
                        try:
                            with open(os.path.join(p, filename), "r", encoding="utf-8") as f:
                                scene_data = json.load(f)
                                scenes.append({"id": scene_id, "name": scene_data.get("name", f"Scene {scene_id}"), "source_type": "local-asset"})
                                existing_ids.add(str(scene_id))
                        except Exception as e:
                            print(f"Error reading local scene {filename}: {e}")

    return scenes

@app.get("/api/scene/{scene_id}")
async def get_scene(scene_id: str):
    # Support both int and str IDs
    scene_id_int = None
    try:
        scene_id_int = int(scene_id)
    except ValueError:
        pass

    try:
        from supabase import create_async_client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")
        if supabase_url and supabase_key:
            client = await create_async_client(supabase_url, supabase_key)
            res = await client.table('game_scene').select('*').eq('id', scene_id).execute()
            if not res.data and scene_id_int is not None:
                 res = await client.table('game_scene').select('*').eq('id', scene_id_int).execute()

            if res.data and len(res.data) > 0:
                scene_data = res.data[0]
                if scene_data.get('scene_entities'):
                    if 'layers' in scene_data['scene_entities']:
                        scene_data['layers'] = scene_data['scene_entities'].pop('layers')
                    if 'map_list' in scene_data['scene_entities']:
                        scene_data['map_list'] = scene_data['scene_entities'].pop('map_list')
                return scene_data
    except Exception as e:
        print(f"Supabase warning (fetching scene): {e}")

    if scene_id in in_memory_scenes:
        scene_data = in_memory_scenes[scene_id].copy()
        if scene_data.get('scene_entities'):
            if 'layers' in scene_data['scene_entities']:
                scene_data['layers'] = scene_data['scene_entities'].pop('layers')
            if 'map_list' in scene_data['scene_entities']:
                scene_data['map_list'] = scene_data['scene_entities'].pop('map_list')
        return scene_data
    elif scene_id_int is not None and scene_id_int in in_memory_scenes:
        scene_data = in_memory_scenes[scene_id_int].copy()
        if scene_data.get('scene_entities'):
            if 'layers' in scene_data['scene_entities']:
                scene_data['layers'] = scene_data['scene_entities'].pop('layers')
            if 'map_list' in scene_data['scene_entities']:
                scene_data['map_list'] = scene_data['scene_entities'].pop('map_list')
        return scene_data

    # Try local json
    paths = ["dist/assets/game_scene", "public/assets/game_scene"]
    for p in paths:
        filepath = os.path.join(p, f"{scene_id}.json")
        if os.path.exists(filepath):
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    scene_data = json.load(f)
                    if scene_data.get('scene_entities'):
                        if 'layers' in scene_data['scene_entities']:
                            scene_data['layers'] = scene_data['scene_entities'].pop('layers')
                        if 'map_list' in scene_data['scene_entities']:
                            scene_data['map_list'] = scene_data['scene_entities'].pop('map_list')
                    return scene_data
            except Exception as e:
                print(f"Error reading local scene {scene_id}.json: {e}")

    raise HTTPException(status_code=404, detail="Scene not found")

@app.post("/api/scene")
async def create_scene(request: Request):
    global scene_id_counter, in_memory_scenes
    scene_data = await request.json()
    try:
        from supabase import create_async_client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")
        if supabase_url and supabase_key:
            client = await create_async_client(supabase_url, supabase_key)
            payload = scene_data.copy()
            dropped_fields = {}

            # Robust fallback for missing columns in Supabase
            while True:
                try:
                    res = await client.table('game_scene').insert(payload).execute()
                    if res.data and len(res.data) > 0:
                        created_data = res.data[0]
                        # Merge back any dropped fields into the returned object so they stay in memory
                        created_data.update(dropped_fields)
                        if created_data.get('scene_entities'):
                            if 'layers' in created_data['scene_entities']:
                                created_data['layers'] = created_data['scene_entities'].pop('layers')
                            if 'map_list' in created_data['scene_entities']:
                                created_data['map_list'] = created_data['scene_entities'].pop('map_list')
                        in_memory_scenes[created_data['id']] = created_data
                        return {"success": True, "scene": created_data}
                    break
                except Exception as inner_e:
                    err_str = str(inner_e)
                    if 'PGRST204' in err_str:
                        import re
                        match = re.search(r"Could not find the '(.*?)' column", err_str)
                        if match:
                            missing_col = match.group(1)
                            if missing_col in payload:
                                dropped_fields[missing_col] = payload.pop(missing_col)

                                # Special fallback: if 'layers' is missing, try stuffing it into 'scene_entities' first
                                if missing_col == 'layers' and 'scene_entities' in payload:
                                    if not isinstance(payload['scene_entities'], dict):
                                        payload['scene_entities'] = {}
                                    payload['scene_entities']['layers'] = dropped_fields['layers']
                                continue
                    raise inner_e
    except Exception as e:
        print(f"Supabase warning (creating scene): {e}")

    scene_data['id'] = scene_id_counter
    scene_id_counter += 1
    in_memory_scenes[scene_data['id']] = scene_data
    return {"success": True, "scene": scene_data}

@app.put("/api/scene/{scene_id}")
async def update_scene(scene_id: int, request: Request):
    global in_memory_scenes
    scene_data = await request.json()
    # Ensure ID is not updated
    if 'id' in scene_data:
        del scene_data['id']
    if 'created_at' in scene_data:
        del scene_data['created_at']

    try:
        from supabase import create_async_client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")
        if supabase_url and supabase_key:
            client = await create_async_client(supabase_url, supabase_key)
            payload = scene_data.copy()
            dropped_fields = {}

            while True:
                try:
                    res = await client.table('game_scene').update(payload).eq('id', scene_id).execute()
                    if res.data and len(res.data) > 0:
                        updated_data = res.data[0]
                        updated_data.update(dropped_fields)
                        if updated_data.get('scene_entities'):
                            if 'layers' in updated_data['scene_entities']:
                                updated_data['layers'] = updated_data['scene_entities'].pop('layers')
                            if 'map_list' in updated_data['scene_entities']:
                                updated_data['map_list'] = updated_data['scene_entities'].pop('map_list')
                        in_memory_scenes[scene_id] = updated_data
                        return {"success": True, "scene": updated_data}
                    break
                except Exception as inner_e:
                    err_str = str(inner_e)
                    if 'PGRST204' in err_str:
                        import re
                        match = re.search(r"Could not find the '(.*?)' column", err_str)
                        if match:
                            missing_col = match.group(1)
                            if missing_col in payload:
                                dropped_fields[missing_col] = payload.pop(missing_col)
                                if missing_col == 'layers' and 'scene_entities' in payload:
                                    if not isinstance(payload['scene_entities'], dict):
                                        payload['scene_entities'] = {}
                                    payload['scene_entities']['layers'] = dropped_fields['layers']
                                continue
                    raise inner_e
    except Exception as e:
        print(f"Supabase warning (updating scene): {e}")

    if scene_id in in_memory_scenes:
        in_memory_scenes[scene_id].update(scene_data)
        return {"success": True, "scene": in_memory_scenes[scene_id]}
    return {"success": False, "error": "Scene not found"}

@app.delete("/api/scene/{scene_id}")
async def delete_scene(scene_id: str):
    global in_memory_scenes
    success = False

    scene_id_int = None
    try:
        scene_id_int = int(scene_id)
    except ValueError:
        pass

    try:
        from supabase import create_async_client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")
        if supabase_url and supabase_key:
            client = await create_async_client(supabase_url, supabase_key)
            res = await client.table('game_scene').delete().eq('id', scene_id).execute()
            if not res.data and scene_id_int is not None:
                await client.table('game_scene').delete().eq('id', scene_id_int).execute()
            success = True
    except Exception as e:
        print(f"Supabase warning (deleting scene): {e}")

    if scene_id in in_memory_scenes:
        del in_memory_scenes[scene_id]
        success = True
    elif scene_id_int is not None and scene_id_int in in_memory_scenes:
        del in_memory_scenes[scene_id_int]
        success = True

    # local files
    import re
    safe_id = os.path.basename(str(scene_id))
    safe_id = re.sub(r'[^a-zA-Z0-9_\-]', '', safe_id)

    paths = ["dist/assets/game_scene", "public/assets/game_scene"]
    for p in paths:
        file_path = os.path.join(p, f"{safe_id}.json")
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                success = True
            except Exception as e:
                print(f"Error deleting local scene file {file_path}: {e}")

    if success:
        return {"success": True}
    return {"success": False, "error": "Scene not found"}

@app.delete("/api/map/{map_id}")
async def delete_map(map_id: str):
    global in_memory_maps
    success = False

    if map_id in in_memory_maps:
        del in_memory_maps[map_id]
        success = True

    try:
        from supabase import create_async_client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")
        if supabase_url and supabase_key:
            client = await create_async_client(supabase_url, supabase_key)
            await client.table('maps').delete().eq('id', map_id).execute()
            success = True
    except Exception as e:
        print(f"Supabase warning (deleting map): {e}")

    # Delete local files
    import re
    safe_id = os.path.basename(str(map_id))
    safe_id = re.sub(r'[^a-zA-Z0-9_\-]', '', safe_id)

    paths = ["dist/assets/maps", "public/assets/maps"]
    for p in paths:
        file_path = os.path.join(p, f"{safe_id}.json")
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                success = True
            except Exception as e:
                print(f"Error deleting local map file {file_path}: {e}")

    if success:
        return {"success": True}
    return {"success": False, "error": "Map not found"}

from pydantic import BaseModel
import base64

class TilesetSaveRequest(BaseModel):
    name: str
    metadata: dict
    image_base64: str

@app.post("/api/map/tileset/save")
async def save_map_tileset(req: TilesetSaveRequest):
    try:
        # Sanitize the filename to prevent path traversal vulnerabilities
        safe_name = os.path.basename(req.name)
        # Ensure it only contains safe characters (alphanumeric, underscores, hyphens)
        import re
        safe_name = re.sub(r'[^a-zA-Z0-9_\-]', '', safe_name)

        if not safe_name:
            return {"success": False, "error": "Invalid tileset name"}

        # Decode the base64 image
        if "," in req.image_base64:
            header, encoded = req.image_base64.split(",", 1)
        else:
            encoded = req.image_base64

        image_data = base64.b64decode(encoded)

        # Save to both dist and public to ensure it works in both dev and prod
        paths = ["dist/assets/map_tileset", "public/assets/map_tileset"]

        for base_dir in paths:
            if not os.path.exists(base_dir):
                os.makedirs(base_dir, exist_ok=True)

            # Save PNG
            png_path = os.path.join(base_dir, f"{safe_name}.png")
            with open(png_path, "wb") as f:
                f.write(image_data)

            # Save JSON metadata
            json_path = os.path.join(base_dir, f"{safe_name}.json")
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(req.metadata, f, ensure_ascii=False, indent=2)

        return {"success": True}
    except Exception as e:
        print(f"Error saving tileset: {e}")
        return {"success": False, "error": str(e)}

@app.get("/api/map/tilesets")
async def get_map_tilesets():
    tilesets = []
    # Production files are in dist/assets, local dev uses public/assets
    base_dir = "dist/assets/map_tileset" if os.path.exists("dist/assets/map_tileset") else "public/assets/map_tileset"
    if os.path.exists(base_dir):
        for filename in os.listdir(base_dir):
            if filename.endswith(".json"):
                filepath = os.path.join(base_dir, filename)
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        tilesets.append(data)
                except Exception as e:
                    print(f"Error reading tileset {filename}: {e}")
    return tilesets


@app.get("/api/game_obj_img")
async def list_game_obj_images():
    images = []
    base_dir = "dist/assets/game_obj_img" if os.path.exists("dist/assets/game_obj_img") else "public/assets/game_obj_img"
    if os.path.exists(base_dir):
        for filename in os.listdir(base_dir):
            if filename.endswith(".png") or filename.endswith(".jpg") or filename.endswith(".jpeg"):
                images.append(filename)
    if not images:
        # Fallback default image if directory empty or non-existent
        images = ["object_default.jpg"]
    return images




@app.get("/api/quests")
async def get_quests():
    quests = []
    try:
        if supabase_client:
            res = await client.table('game_quest').select('id, name').execute()
            if res.data:
                quests.extend(res.data)
    except Exception as e:
        print(f"Supabase warning (fetching quests): {e}")

    existing_ids = {str(q["id"]) for q in quests}

    for k, v in in_memory_quests.items():
        if str(k) not in existing_ids:
            quests.append({"id": k, "name": v.get("name", f"Quest {k}"), "source_type": "memory"})
            existing_ids.add(str(k))

    paths = ["dist/assets/game_quest", "public/assets/game_quest"]
    for p in paths:
        if os.path.exists(p):
            for filename in os.listdir(p):
                if filename.endswith(".json"):
                    quest_id = filename[:-5]
                    if str(quest_id) not in existing_ids:
                        try:
                            with open(os.path.join(p, filename), "r", encoding="utf-8") as f:
                                quest_data = json.load(f)
                                quests.append({"id": quest_id, "name": quest_data.get("name", f"Quest {quest_id}"), "source_type": "local-asset"})
                                existing_ids.add(str(quest_id))
                        except Exception as e:
                            print(f"Error reading local quest {filename}: {e}")

    return quests

@app.get("/api/quest/{quest_id}")
async def get_quest(quest_id: str):
    quest_id_int = None
    if quest_id.isdigit():
        quest_id_int = int(quest_id)

    try:
        if supabase_client:
            res = await client.table('game_quest').select('*').eq('id', quest_id).execute()
            if not res.data and quest_id_int is not None:
                 res = await client.table('game_quest').select('*').eq('id', quest_id_int).execute()
            if res.data:
                quest_data = res.data[0]
                return quest_data
    except Exception as e:
        print(f"Supabase warning (fetching quest): {e}")

    if quest_id in in_memory_quests:
        return in_memory_quests[quest_id].copy()
    elif quest_id_int is not None and quest_id_int in in_memory_quests:
        return in_memory_quests[quest_id_int].copy()

    paths = ["dist/assets/game_quest", "public/assets/game_quest"]
    for p in paths:
        filepath = os.path.join(p, f"{quest_id}.json")
        if os.path.exists(filepath):
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    quest_data = json.load(f)
                    return quest_data
            except Exception as e:
                print(f"Error reading local quest {quest_id}.json: {e}")

    raise HTTPException(status_code=404, detail="Quest not found")

@app.post("/api/quest")
async def create_quest(request: Request):
    global quest_id_counter, in_memory_quests
    try:
        quest_data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    try:
        if supabase_client:
            payload = quest_data.copy()
            if 'id' in payload:
                del payload['id']
            res = await client.table('game_quest').insert(payload).execute()
            if res.data:
                created_data = res.data[0]
                in_memory_quests[created_data['id']] = created_data
                return {"success": True, "quest": created_data}
    except Exception as e:
        print(f"Supabase warning (creating quest): {e}")

    quest_data['id'] = quest_id_counter
    quest_id_counter += 1
    in_memory_quests[quest_data['id']] = quest_data
    return {"success": True, "quest": quest_data}

@app.put("/api/quest/{quest_id}")
async def update_quest(quest_id: int, request: Request):
    global in_memory_quests
    try:
        quest_data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    if 'id' in quest_data:
        del quest_data['id']
    if 'created_at' in quest_data:
        del quest_data['created_at']

    try:
        if supabase_client:
            payload = quest_data.copy()
            res = await client.table('game_quest').update(payload).eq('id', quest_id).execute()
            if res.data:
                updated_data = res.data[0]
                in_memory_quests[quest_id] = updated_data
                return {"success": True, "quest": updated_data}
    except Exception as e:
        print(f"Supabase warning (updating quest): {e}")

    if quest_id in in_memory_quests:
        in_memory_quests[quest_id].update(quest_data)
        return {"success": True, "quest": in_memory_quests[quest_id]}

    return {"success": False, "error": "Quest not found"}

@app.delete("/api/quest/{quest_id}")
async def delete_quest(quest_id: str):
    global in_memory_quests
    quest_id_int = None
    if quest_id.isdigit():
        quest_id_int = int(quest_id)

    deleted_from_db = False
    try:
        if supabase_client:
            res = await client.table('game_quest').delete().eq('id', quest_id).execute()
            if not res.data and quest_id_int is not None:
                await client.table('game_quest').delete().eq('id', quest_id_int).execute()
            deleted_from_db = True
    except Exception as e:
        print(f"Supabase warning (deleting quest): {e}")

    if quest_id in in_memory_quests:
        del in_memory_quests[quest_id]
        deleted_from_db = True
    elif quest_id_int is not None and quest_id_int in in_memory_quests:
        del in_memory_quests[quest_id_int]
        deleted_from_db = True

    # safe path deletion
    safe_id = os.path.basename(str(quest_id))
    paths = ["dist/assets/game_quest", "public/assets/game_quest"]
    deleted_local = False
    for p in paths:
        file_path = os.path.join(p, f"{safe_id}.json")
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                deleted_local = True
            except Exception as e:
                print(f"Error deleting local quest file {file_path}: {e}")

    if deleted_from_db or deleted_local:
        return {"success": True}

    return {"success": False, "error": "Quest not found"}

@app.post("/api/save_local")

async def save_local(request: Request):
    data = await request.json()
    scene = data.get("scene")
    maps = data.get("maps", [])
    game_obj_templates = data.get("game_obj_templates", [])
    quest = data.get("quest")

    print(">>save_local", data)

    import re
    def get_safe_id(id_val):
        safe_id = os.path.basename(str(id_val))
        return re.sub(r'[^a-zA-Z0-9_\-]', '', safe_id)

    res_data = {"saved_scene": False, "saved_maps": 0, "saved_game_obj_templates": 0, "saved_quest": False}

    paths = ["dist/assets", "public/assets"]

    try:
        for p in paths:
            if not os.path.exists(p):
                os.makedirs(p, exist_ok=True)

            if quest and "id" in quest:
                quest_dir = os.path.join(p, "game_quest")
                os.makedirs(quest_dir, exist_ok=True)
                safe_id = get_safe_id(quest["id"])
                with open(os.path.join(quest_dir, f"{safe_id}.json"), "w", encoding="utf-8") as f:
                    json.dump(quest, f, ensure_ascii=False, indent=2)
                res_data["saved_quest"] = True
                # Keep memory synced
                if quest["id"] in in_memory_quests:
                    in_memory_quests[quest["id"]] = quest
                elif str(quest["id"]).isdigit() and int(quest["id"]) in in_memory_quests:
                    in_memory_quests[int(quest["id"])] = quest

            if scene and "id" in scene:
                scene_dir = os.path.join(p, "game_scene")
                os.makedirs(scene_dir, exist_ok=True)
                safe_id = get_safe_id(scene["id"])
                with open(os.path.join(scene_dir, f"{safe_id}.json"), "w", encoding="utf-8") as f:
                    # Keep layers inside scene_entities for persistence to match DB logic
                    save_scene = scene.copy()
                    if 'layers' in save_scene:
                        if not isinstance(save_scene.get('scene_entities'), dict):
                            save_scene['scene_entities'] = {}
                        save_scene['scene_entities']['layers'] = save_scene.pop('layers')
                    json.dump(save_scene, f, ensure_ascii=False, indent=2)
                res_data["saved_scene"] = True

            if maps:
                maps_dir = os.path.join(p, "maps")
                os.makedirs(maps_dir, exist_ok=True)
                saved_count = 0
                for m in maps:
                    if "id" in m:
                        safe_id = get_safe_id(m["id"])
                        map_file_path = os.path.join(maps_dir, f"{safe_id}.json")
                        with open(map_file_path, "w", encoding="utf-8") as f:
                            json.dump(m, f, ensure_ascii=False, indent=2)
                        print(f"DEBUG: Saved map_data locally to {map_file_path}")

                        # Save map_meta if present
                        map_data = m.get("map_data", {})
                        if map_data and "map_meta" in map_data:
                            try:
                                map_meta_dir = os.path.join(p, "map_meta")
                                os.makedirs(map_meta_dir, exist_ok=True)
                                meta_json_path = os.path.join(map_meta_dir, f"{safe_id}.json")
                                with open(meta_json_path, "w", encoding="utf-8") as f:
                                    json.dump(map_data["map_meta"], f, ensure_ascii=False, indent=2)
                                print(f"DEBUG: Saved map_meta locally to {meta_json_path}")
                            except Exception as meta_e:
                                print(f"Error saving map_meta for {m['id']} in save_local: {meta_e}")

                        saved_count += 1
                res_data["saved_maps"] = saved_count

            if game_obj_templates:
                templates_dir = os.path.join(p, "game_obj_templates")
                os.makedirs(templates_dir, exist_ok=True)
                saved_count = 0
                for t in game_obj_templates:
                    if "id" in t:
                        safe_id = get_safe_id(t["id"])
                        with open(os.path.join(templates_dir, f"{safe_id}.json"), "w", encoding="utf-8") as f:
                            json.dump(t, f, ensure_ascii=False, indent=2)
                        saved_count += 1
                res_data["saved_game_obj_templates"] = saved_count

        return {"success": True, "data": res_data}
    except Exception as e:
        print(f"Error saving local data: {e}")
        return {"success": False, "error": str(e)}


@app.get("/favicon.ico")
async def favicon():
    if os.path.exists("dist/favicon.ico"):
        return FileResponse("dist/favicon.ico")
    raise HTTPException(status_code=404, detail="Favicon not found")

@app.get("/auth/dev_login")
async def dev_login(response: Response):
    if os.getenv("ENABLE_DEV_LOGIN") != "true":
        raise HTTPException(status_code=403, detail="Forbidden")

    # Always completely overwrite tester data to ensure it matches expectations
    user_id = "tester"
    existing_data = {
        "oauth_data": {
            "id": "009977009977009977",
            "email": "tester@gmail.com",
            "verified_email": True,
            "name": "Tester",
            "given_name": "Tester",
            "family_name": "Tester",
            "picture": "https://lh3.googleusercontent.com/a/ACg8ocKXimISE8o1BEk19Mg5GXd0wBmzKINQdrT1HVdCEauVYKF8C6Vs=s96-c"
        },
        "team_data": {},
        "game_data": {},
        "profile": {
            "nickname": "大粒粉圓"
        }
    }
    save_user_data(user_id, existing_data)

    redirect_res = RedirectResponse(url="/")
    redirect_res.set_cookie(key="session_id", value=user_id, httponly=True, samesite="lax")
    return redirect_res

# Catch-all route to serve index.html for React Router
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    print(f"full_path: {full_path}")
    if os.path.exists("dist/index.html"):
        return FileResponse("dist/index.html")
    return {"message": "Frontend not built yet. Please run `make build`."}
