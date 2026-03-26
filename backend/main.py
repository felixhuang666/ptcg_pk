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
        "scope=openid%20email%20profile"
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

        # Set a simple cookie session (In production use proper session management)
        response.set_cookie(key="session_id", value=user_id, httponly=True)

        # Redirect back to frontend
        return RedirectResponse(url="/")

@app.get("/")
async def root():
    if os.path.exists("dist/index.html"):
        return FileResponse("dist/index.html")
    return {"message": "Frontend not built yet. Please run `make build`."}

# Catch-all route to serve index.html for React Router
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    if os.path.exists("dist/index.html"):
        return FileResponse("dist/index.html")
    return {"message": "Frontend not built yet. Please run `make build`."}