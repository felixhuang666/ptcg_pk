import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app, in_memory_scenes

@pytest.fixture(autouse=True)
def reset_in_memory_scenes():
    in_memory_scenes.clear()
    in_memory_scenes[999] = {
        "id": 999,
        "name": "Test Initial Scene",
        "map_list": [],
        "scene_entities": {"npcs": [], "items": [], "events": []}
    }

@pytest.mark.asyncio
async def test_get_scenes():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/scenes")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert any(d.get("id") == 999 for d in data)

@pytest.mark.asyncio
async def test_get_specific_scene():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/scene/999")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 999
    assert data["name"] == "Test Initial Scene"

@pytest.mark.asyncio
async def test_create_and_delete_scene():
    new_scene = {
        "name": "New Test Scene",
        "map_list": [],
        "scene_entities": {"npcs": [], "items": [], "events": []}
    }
    transport = ASGITransport(app=app)
    scene_id = None
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.post("/api/scene", json=new_scene)
        assert response.status_code == 200
        res_data = response.json()
        assert res_data["success"] is True
        assert "scene" in res_data
        scene_id = res_data["scene"]["id"]
        assert res_data["scene"]["name"] == "New Test Scene"
        assert scene_id in in_memory_scenes
    finally:
        if scene_id is not None:
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                cleanup_resp = await ac.delete(f"/api/scene/{scene_id}")
            assert cleanup_resp.status_code == 200
            assert scene_id not in in_memory_scenes

@pytest.mark.asyncio
async def test_update_scene():
    update_data = {
        "name": "Updated Test Scene"
    }
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.put("/api/scene/999", json=update_data)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True
    assert res_data["scene"]["name"] == "Updated Test Scene"
    assert in_memory_scenes[999]["name"] == "Updated Test Scene"
