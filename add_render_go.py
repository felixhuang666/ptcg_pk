import re

with open('src/components/RpgMode.tsx', 'r') as f:
    content = f.read()

# Inject this.renderGameObjects() to the end of setupLayers
content = content.replace(
    "          this.topLayer = createLayer('topLayer', 10, false);\n        };",
    "          this.topLayer = createLayer('topLayer', 10, false);\n          this.renderGameObjects();\n        };"
)

# Define renderGameObjects after renderMap
method_code = """
      renderGameObjects() {
        if (!this.sceneData || !this.sceneData.scene_entities || !this.sceneData.scene_entities.game_objects) return;

        // Clear existing objects
        Object.values(this.gameObjectSprites).forEach(sprite => sprite.destroy());
        this.gameObjectSprites = {};

        this.sceneData.scene_entities.game_objects.forEach((obj: any) => {
          const tpl = this.gameObjectTemplates.find(t => t.id === obj.template_id);
          if (!tpl) return;

          const px = (obj.position?.x || 0) * 32;
          const py = (obj.position?.y || 0) * 32;

          let targetState = obj.default_state_override;
          if (!targetState && tpl.sprite_sheets && tpl.sprite_sheets.length > 0) {
             targetState = tpl.sprite_sheets[0].state;
          }

          let sheetMeta = tpl.sprite_sheets?.find((s:any) => s.state === targetState);
          if (!sheetMeta && tpl.sprite_sheets && tpl.sprite_sheets.length > 0) {
             sheetMeta = tpl.sprite_sheets[0];
          }

          if (sheetMeta) {
              const key = `spr_${sheetMeta.sprite_sheet_name}`;
              
              const isCollidable = tpl.collision?.enabled;
              
              let sprite;
              if (isCollidable) {
                  sprite = this.physics.add.sprite(px, py, key);
                  const body = sprite.body as Phaser.Physics.Arcade.Body;
                  body.setImmovable(true);
                  if (this.player) {
                      this.physics.add.collider(this.player, sprite);
                  }
                  if (tpl.collision.width && tpl.collision.height) {
                      body.setSize(tpl.collision.width, tpl.collision.height);
                  }
              } else {
                  sprite = this.add.sprite(px, py, key);
              }
              
              sprite.setOrigin(0, 0); // Align with grid
              sprite.setDepth(5); // Adjust depth so player can be behind or front
              
              if (obj.zoom) {
                  sprite.setScale(obj.zoom);
              }

              // Create animation on the fly if needed
              const animKey = `${key}_${targetState}`;
              if (!this.anims.exists(animKey)) {
                  this.anims.create({
                      key: animKey,
                      frames: this.anims.generateFrameNumbers(key, { start: 0, end: (sheetMeta.frame_count || 1) - 1 }),
                      frameRate: sheetMeta.frame_rate || 8,
                      repeat: -1
                  });
              }
              
              sprite.play(animKey);
              this.gameObjectSprites[obj.instance_id || Math.random().toString()] = sprite;
          }
        });
      }

      setupEditorUI() {"""

content = content.replace("      setupEditorUI() {", method_code)

with open('src/components/RpgMode.tsx', 'w') as f:
    f.write(content)
print("Injected Game Object rendering logic.")
