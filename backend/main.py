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

    return {"id": session_id, "map_id": None, "pos_x": None, "pos_y": None}

@app.post("/api/user/location")
async def update_user_location(request: Request):
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    data = await request.json()
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

in_memory_scenes = {}
scene_id_counter = 1

in_memory_maps = {
    "main_200": {
        "id": "main_200",
        "name": "World Map",
        "map_data": {
            "width": 40,
            "height": 40,
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

@app.get("/api/maps")
async def list_maps():
    try:
        from supabase import create_async_client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")
        if supabase_url and supabase_key:
            client = await create_async_client(supabase_url, supabase_key)
            try:
                res = await client.table('maps').select('id, name').execute()
                if res.data is not None:
                    return res.data
            except Exception as inner_e:
                if 'PGRST204' in str(inner_e):
                    res = await client.table('maps').select('id').execute()
                    if res.data is not None:
                        return [{"id": m["id"], "name": "Unknown"} for m in res.data]
                else:
                    raise inner_e
    except Exception as e:
        print(f"Supabase warning (fetching maps): {e}")
    return [{"id": k, "name": v.get("name", k)} for k, v in in_memory_maps.items()]

@app.get("/api/map")
async def get_map(id: str = "main_200"):
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
    if id in in_memory_maps:
        return in_memory_maps[id]
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
    try:
        from supabase import create_async_client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")
        if supabase_url and supabase_key:
            client = await create_async_client(supabase_url, supabase_key)
            await client.table('game_npcs').delete().eq('id', npc_id).execute()
    except Exception as e:
        print(f"Supabase warning (deleting npc): {e}")
        return {"success": False, "error": str(e)}

    from .socket_app import sio, rpg_npcs
    if npc_id in rpg_npcs:
        del rpg_npcs[npc_id]
    await sio.emit("npc_deleted", {"id": npc_id})
    return {"success": True}

@app.get("/api/scenes")
async def get_scenes():
    try:
        from supabase import create_async_client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")
        if supabase_url and supabase_key:
            client = await create_async_client(supabase_url, supabase_key)
            res = await client.table('game_scene').select('id, name').execute()
            if res.data is not None:
                return res.data
    except Exception as e:
        print(f"Supabase warning (fetching scenes): {e}")
    return [{"id": k, "name": v.get("name", f"Scene {k}")} for k, v in in_memory_scenes.items()]

@app.get("/api/scene/{scene_id}")
async def get_scene(scene_id: int):
    try:
        from supabase import create_async_client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")
        if supabase_url and supabase_key:
            client = await create_async_client(supabase_url, supabase_key)
            res = await client.table('game_scene').select('*').eq('id', scene_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
    except Exception as e:
        print(f"Supabase warning (fetching scene): {e}")
    if scene_id in in_memory_scenes:
        return in_memory_scenes[scene_id]
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
            res = await client.table('game_scene').insert(scene_data).execute()
            if res.data and len(res.data) > 0:
                created_data = res.data[0]
                in_memory_scenes[created_data['id']] = created_data
                return {"success": True, "scene": created_data}
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
            res = await client.table('game_scene').update(scene_data).eq('id', scene_id).execute()
            if res.data and len(res.data) > 0:
                updated_data = res.data[0]
                in_memory_scenes[scene_id] = updated_data
                return {"success": True, "scene": updated_data}
    except Exception as e:
        print(f"Supabase warning (updating scene): {e}")

    if scene_id in in_memory_scenes:
        in_memory_scenes[scene_id].update(scene_data)
        return {"success": True, "scene": in_memory_scenes[scene_id]}
    return {"success": False, "error": "Scene not found"}

@app.delete("/api/scene/{scene_id}")
async def delete_scene(scene_id: int):
    global in_memory_scenes
    success = False
    try:
        from supabase import create_async_client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")
        if supabase_url and supabase_key:
            client = await create_async_client(supabase_url, supabase_key)
            await client.table('game_scene').delete().eq('id', scene_id).execute()
            success = True
    except Exception as e:
        print(f"Supabase warning (deleting scene): {e}")

    if scene_id in in_memory_scenes:
        del in_memory_scenes[scene_id]
        success = True

    if success:
        return {"success": True}
    return {"success": False, "error": "Scene not found"}

@app.delete("/api/map/{map_id}")
async def delete_map(map_id: str):
    global in_memory_maps
    if map_id in in_memory_maps:
        del in_memory_maps[map_id]

    try:
        from supabase import create_async_client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")
        if supabase_url and supabase_key:
            client = await create_async_client(supabase_url, supabase_key)
            await client.table('maps').delete().eq('id', map_id).execute()
    except Exception as e:
        print(f"Supabase warning (deleting map): {e}")
        return {"success": False, "error": str(e)}

    return {"success": True}

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
