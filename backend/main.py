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

in_memory_maps = {
    "main_200": {
        "id": "main_200",
        "name": "World Map",
        "map_data": {
            "width": 200,
            "height": 200,
            "tiles": [2] * (200 * 200), # 2 = grass
            "objects": [-1] * (200 * 200) # -1 = empty
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
    from .socket_app import sio
    # Support old payload for legacy clients
    await sio.emit("map_updated", map_data)
    return {"success": True, "id": map_id, "name": map_name}

import noise
import uuid

@app.post("/api/map/generate")
async def generate_map(request: Request):
    global in_memory_maps
    data = await request.json()
    width = data.get("width", 200)
    height = data.get("height", 200)
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
    map_data = {
        "width": width,
        "height": height,
        "tiles": tiles,
        "objects": objects
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
            if res.data and len(res.data) > 0:
                return res.data
    except Exception as e:
        print(f"Supabase warning (fetching roles): {e}")

    # Default role if table doesn't exist or is empty
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

# Catch-all route to serve index.html for React Router
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    if os.path.exists("dist/index.html"):
        return FileResponse("dist/index.html")
    return {"message": "Frontend not built yet. Please run `make build`."}