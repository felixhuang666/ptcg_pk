import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app, in_memory_maps

@pytest.fixture(autouse=True)
def reset_in_memory_maps():
    in_memory_maps.clear()
    in_memory_maps["main_200"] = {
        "id": "main_200",
        "name": "World Map",
        "map_data": {
            "width": 40,
            "height": 40,
            "tiles": [2] * (40 * 40)
        }
    }

@pytest.mark.asyncio
async def test_get_maps_list():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/maps")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert any(d.get("id") == "main_200" for d in data)

@pytest.mark.asyncio
async def test_get_specific_map():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/map?id=main_200")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "main_200"
    assert data["name"] == "World Map"
    assert "map_data" in data
    assert data["map_data"]["width"] == 40

@pytest.mark.asyncio
async def test_save_new_map():
    new_map = {
        "id": "test_map_001",
        "name": "Test Map",
        "map_data": {
            "width": 10,
            "height": 10,
            "tiles": [48] * 100
        }
    }
    transport = ASGITransport(app=app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.post("/api/map", json=new_map)
        assert response.status_code == 200
        res_data = response.json()
        assert res_data["success"] is True
        assert res_data["id"] == "test_map_001"

        assert "test_map_001" in in_memory_maps
    finally:
        # Clean up test data
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            cleanup_resp = await ac.delete("/api/map/test_map_001")
        assert cleanup_resp.status_code == 200

@pytest.mark.asyncio
async def test_generate_map():
    gen_req = {
        "name": "Procedural Forest",
        "width": 40,
        "height": 40
    }
    transport = ASGITransport(app=app)
    gen_id = None
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.post("/api/map/generate", json=gen_req)
        assert response.status_code == 200
        res_data = response.json()
        assert res_data["success"] is True
        assert res_data["name"] == "Procedural Forest"
        assert "id" in res_data
        assert res_data["id"].startswith("gen_")
        gen_id = res_data["id"]

        map_data = res_data["map_data"]
        assert map_data["width"] == 40
        assert map_data["height"] == 40
        assert len(map_data["tiles"]) == 1600
        assert "objects" in map_data
        assert len(map_data["objects"]) == 1600
    finally:
        # Clean up dynamically generated map
        if gen_id:
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                cleanup_resp = await ac.delete(f"/api/map/{gen_id}")
            assert cleanup_resp.status_code == 200
