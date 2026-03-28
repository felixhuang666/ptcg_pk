import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app, in_memory_maps

@pytest.fixture(autouse=True)
def reset_in_memory_maps():
    in_memory_maps.clear()

@pytest.mark.asyncio
async def test_save_resized_map():
    # Simulate a map that was originally 10x10, now saved as 15x10
    resized_map = {
        "id": "test_map_resized",
        "name": "Resized Map",
        "map_data": {
            "width": 15,
            "height": 10,
            "tiles": [2] * 150,
            "objects": [-1] * 150
        }
    }
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/api/map", json=resized_map)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True

    assert "test_map_resized" in in_memory_maps
    saved_data = in_memory_maps["test_map_resized"]["map_data"]
    assert saved_data["width"] == 15
    assert len(saved_data["tiles"]) == 150
