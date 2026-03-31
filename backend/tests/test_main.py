import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app
import uuid
import os
import json

@pytest.fixture
def test_user_data():
    return {
        "id": "tester",
        "email": "tester@example.com",
        "name": "Tester",
        "picture": "",
        "created_at": "2023-01-01T00:00:00.000000"
    }

@pytest.mark.asyncio
async def test_get_current_user_unauthorized():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] == False

@pytest.mark.asyncio
async def test_get_current_user_authorized(test_user_data):
    session_id = str(uuid.uuid4())
    # Create test session file
    os.makedirs("users", exist_ok=True)
    with open(f"users/{session_id}.json", "w") as f:
        json.dump({"oauth_data": test_user_data, "user": test_user_data}, f)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        ac.cookies.set("session_id", session_id)
        response = await ac.get("/api/auth/me")

    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] == True
    assert data["user"]["id"] == "tester"

    # Clean up
    if os.path.exists(f"users/{session_id}.json"):
        os.remove(f"users/{session_id}.json")

@pytest.mark.asyncio
async def test_logout():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        ac.cookies.set("session_id", "dummy")
        response = await ac.post("/api/auth/logout")

    assert response.status_code == 200
    assert "session_id" in response.cookies or response.cookies.get("session_id") is None
