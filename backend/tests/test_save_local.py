import pytest
import os
import json
from httpx import AsyncClient, ASGITransport
from backend.main import app

@pytest.mark.asyncio
async def test_save_local_map():
    test_map_id = "test_map_1234"
    test_map_name = "Test Map"
    test_map_data = {
        "width": 10,
        "height": 10,
        "tiles": [0] * 100,
        "map_meta": {
            "tilesets": [{
                "name": "test_tileset",
                "total_tiles": 10
            }]
        }
    }

    payload = {
        "scene": None,
        "maps": [{
            "id": test_map_id,
            "name": test_map_name,
            "map_data": test_map_data
        }],
        "game_obj_templates": []
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Save map locally
        response = await ac.post("/api/save_local", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["saved_maps"] == 1

        # Verify files were created
        paths = ["dist/assets", "public/assets"]
        for p in paths:
            map_file = os.path.join(p, "maps", f"{test_map_id}.json")
            assert os.path.exists(map_file)

            # Note: /api/save_local currently saves the wrapper object in the file
            # to match the payload. Let's verify what got saved.
            with open(map_file, "r") as f:
                saved_map = json.load(f)
                assert saved_map["id"] == test_map_id
                assert "map_data" in saved_map

            map_meta_file = os.path.join(p, "map_meta", f"{test_map_id}.json")
            assert os.path.exists(map_meta_file)
            with open(map_meta_file, "r") as f:
                saved_map_meta = json.load(f)
                assert saved_map_meta["tilesets"][0]["name"] == "test_tileset"

        # Verify map can be retrieved via /api/map
        response_get = await ac.get(f"/api/map?id={test_map_id}")
        assert response_get.status_code == 200
        get_data = response_get.json()
        assert get_data["id"] == test_map_id
        assert get_data["map_data"]["map_meta"]["tilesets"][0]["name"] == "test_tileset"

        # Cleanup
        for p in paths:
            map_file = os.path.join(p, "maps", f"{test_map_id}.json")
            if os.path.exists(map_file):
                os.remove(map_file)
            map_meta_file = os.path.join(p, "map_meta", f"{test_map_id}.json")
            if os.path.exists(map_meta_file):
                os.remove(map_meta_file)
