import pytest
import httpx

@pytest.mark.asyncio
async def test_real_get_maps_list():
    async with httpx.AsyncClient() as ac:
        response = await ac.get("http://localhost:5000/api/maps")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

@pytest.mark.asyncio
async def test_real_generate_map():
    gen_req = {
        "name": "Procedural Forest",
        "width": 20,
        "height": 20
    }
    async with httpx.AsyncClient() as ac:
        response = await ac.post("http://localhost:5000/api/map/generate", json=gen_req)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True
    assert "id" in res_data
