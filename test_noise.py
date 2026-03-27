import noise

def generate_map(width, height):
    scale = 100.0
    octaves = 6
    persistence = 0.5
    lacunarity = 2.0

    map_data = []
    for y in range(height):
        for x in range(width):
            val = noise.pnoise2(x/scale, y/scale, octaves=octaves, persistence=persistence, lacunarity=lacunarity, repeatx=width, repeaty=height, base=0)
            map_data.append(val)
    return map_data

print(generate_map(10, 10))
