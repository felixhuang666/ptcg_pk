import re

with open('src/components/RpgMode.tsx', 'r') as f:
    content = f.read()

# 1. Add class properties
content = content.replace(
    "public currentMapId: string = 'main_200';",
    "public currentMapId: string = 'main_200';\n      public sceneData: any = null;\n      public gameObjectTemplates: any[] = [];\n      public gameObjectSprites: Record<string, Phaser.GameObjects.Sprite | Phaser.GameObjects.Container> = {};"
)

# 2. Update create fetch logic
old_fetch = """        try {
          const res = await fetch(`/api/map?id=${this.currentMapId}`);
          if (!res.ok) throw new Error('Failed to fetch map');
          const data = await res.json();
          this.mapData = data.map_data ? data.map_data : data;
          this.upgradeMapData(this.mapData);
        } catch (err) {
          console.error('Failed to load map', err);
          this.mapData = { width: 200, height: 200, tiles: Array(200 * 200).fill(0) };
          this.upgradeMapData(this.mapData);
        }"""

new_fetch = """        try {
          const tplRes = await fetch('/api/game_obj_templates');
          if (tplRes.ok) this.gameObjectTemplates = await tplRes.json();

          let targetMapId = this.currentMapId;
          // check if it's a scene
          const sceneRes = await fetch(`/api/scene/${this.currentMapId}`);
          if (sceneRes.ok) {
             const sceneData = await sceneRes.json();
             this.sceneData = sceneData;
             const parsedList = typeof sceneData.map_list === 'string' ? JSON.parse(sceneData.map_list) : (sceneData.map_list || []);
             if (parsedList.length > 0) {
                 targetMapId = parsedList[0].map_id;
             }
          }

          const res = await fetch(`/api/map?id=${targetMapId}`);
          if (!res.ok) throw new Error('Failed to fetch map');
          const data = await res.json();
          this.mapData = data.map_data ? data.map_data : data;
          this.upgradeMapData(this.mapData);
          
          await new Promise<void>((resolve) => {
            if (!this.sceneData || !this.sceneData.scene_entities || !this.sceneData.scene_entities.game_objects) {
                resolve();
                return;
            }
            let needsLoad = false;
            this.sceneData.scene_entities.game_objects.forEach((obj: any) => {
                const tpl = this.gameObjectTemplates.find(t => t.id === obj.template_id);
                if (tpl && tpl.sprite_sheets) {
                    tpl.sprite_sheets.forEach((sheet: any) => {
                        const key = `spr_${sheet.sprite_sheet_name}`;
                        if (!this.textures.exists(key)) {
                            this.load.spritesheet(key, `/assets/players/${sheet.sprite_sheet_name}.png`, {
                                frameWidth: sheet.frame_width,
                                frameHeight: sheet.frame_height
                            });
                            needsLoad = true;
                        }
                    });
                }
            });
            if (needsLoad) {
                this.load.once('complete', () => resolve());
                this.load.start();
            } else {
                resolve();
            }
          });
        } catch (err) {
          console.error('Failed to load map or scene', err);
          this.mapData = { width: 200, height: 200, tiles: Array(200 * 200).fill(0) };
          this.upgradeMapData(this.mapData);
        }"""

content = content.replace(old_fetch, new_fetch)

with open('src/components/RpgMode.tsx', 'w') as f:
    f.write(content)
print("Updated properties and create fetch block.")
