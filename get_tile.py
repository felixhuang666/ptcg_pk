import json
with open('public/assets/map_tileset/cute_tileset.json') as f:
    data = json.load(f)
    print("Tilewidth:", data['tilewidth'])
    for tile in data['tiles']:
        if 'Water' in tile['name'] and 'Blue' in tile['name']:
            print("Water:", tile['id'], tile['name'])
        if 'Grass' in tile['name'] and 'Regular' in tile['name']:
            print("Grass:", tile['id'], tile['name'])
        if 'Mountain' in tile['name'] or 'Rock' in tile['name']:
            print("Mountain/Rock:", tile['id'], tile['name'])
