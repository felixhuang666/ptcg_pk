const fs = require('fs');
let content = fs.readFileSync('src/components/RpgSceneEditor.tsx', 'utf8');

const search = `        const rect = this.add.rectangle(pxX + pxW/2, pxY + pxH/2, pxW, pxH, 0xff8800, 0.2);
        rect.setStrokeStyle(2, 0xff8800);
        rect.setInteractive({ draggable: true });
        rect.setDepth(200);

        const labelText = this.add.text(pxX + 5, pxY + 5, obj.template_id, { color: '#ffffff', fontSize: '12px', wordWrap: { width: pxW - 10 } });
        labelText.setDepth(200);

        rect.on('pointerdown', (pointer: any) => {
          if (pointer.leftButtonDown()) {
            this.onSelect({ type: 'game_object', ...obj });
          }
        });

        rect.on('drag', (pointer: any, dragX: number, dragY: number) => {
          rect.x = dragX;
          rect.y = dragY;
          labelText.x = dragX - pxW/2 + 5;
          labelText.y = dragY - pxH/2 + 5;
        });

        rect.on('dragend', () => {
          const newLeftX = rect.x - pxW/2;
          const newTopY = rect.y - pxH/2;
          const snappedGridX = Math.round(newLeftX / 32);
          const snappedGridY = Math.round(newTopY / 32);

          const snappedPxX = snappedGridX * 32;
          const snappedPxY = snappedGridY * 32;
          rect.x = snappedPxX + pxW/2;
          rect.y = snappedPxY + pxH/2;
          labelText.x = snappedPxX + 5;
          labelText.y = snappedPxY + 5;

          if (this.onUpdateGameObjectOffset && (snappedGridX !== startGridX || snappedGridY !== startGridY)) {
            this.onUpdateGameObjectOffset(obj.id, snappedGridX, snappedGridY);
          }
        });

        this.mapsContainer.add([rect, labelText]);`;

const replace = `        let tplDefaultImg = undefined;
        let tplCurrent = undefined;
        if (!obj.container_override) {
           tplCurrent = gameObjectTemplates.find(t => t.id === obj.template_id);
           if (tplCurrent && tplCurrent.default_image) {
               tplDefaultImg = tplCurrent.default_image;
           }
        } else {
           tplCurrent = gameObjectTemplates.find(t => t.id === obj.template_id);
           if (tplCurrent && tplCurrent.default_image) {
               tplDefaultImg = tplCurrent.default_image;
           }
        }

        let renderObj: any;
        if (tplDefaultImg) {
           renderObj = this.add.image(pxX + pxW/2, pxY + pxH/2, \`game_obj_img_\${tplDefaultImg}\`);
           renderObj.setDisplaySize(pxW, pxH);
           renderObj.setInteractive({ draggable: true });
           renderObj.setDepth(200);

           if (!this.textures.exists(\`game_obj_img_\${tplDefaultImg}\`)) {
               this.load.image(\`game_obj_img_\${tplDefaultImg}\`, \`/assets/game_obj_img/\${tplDefaultImg}\`);
               this.load.once(\`filecomplete-image-game_obj_img_\${tplDefaultImg}\`, () => {
                   if (renderObj.active) {
                       renderObj.setTexture(\`game_obj_img_\${tplDefaultImg}\`);
                   }
               });
               this.load.start();
           }
        } else {
           renderObj = this.add.rectangle(pxX + pxW/2, pxY + pxH/2, pxW, pxH, 0xff8800, 0.2);
           renderObj.setStrokeStyle(2, 0xff8800);
           renderObj.setInteractive({ draggable: true });
           renderObj.setDepth(200);
        }

        const labelText = this.add.text(pxX + 5, pxY + pxH/2 - 5, obj.template_id, { color: '#ffffff', fontSize: '12px', wordWrap: { width: pxW - 10 }, backgroundColor: '#000000aa' });
        labelText.setDepth(200);

        renderObj.on('pointerdown', (pointer: any) => {
          if (pointer.leftButtonDown()) {
            this.onSelect({ type: 'game_object', ...obj });
          }
        });

        renderObj.on('drag', (pointer: any, dragX: number, dragY: number) => {
          renderObj.x = dragX;
          renderObj.y = dragY;
          labelText.x = dragX - pxW/2 + 5;
          labelText.y = dragY - pxH/2 + 5;
        });

        renderObj.on('dragend', () => {
          const newLeftX = renderObj.x - pxW/2;
          const newTopY = renderObj.y - pxH/2;
          const snappedGridX = Math.round(newLeftX / 32);
          const snappedGridY = Math.round(newTopY / 32);

          const snappedPxX = snappedGridX * 32;
          const snappedPxY = snappedGridY * 32;
          renderObj.x = snappedPxX + pxW/2;
          renderObj.y = snappedPxY + pxH/2;
          labelText.x = snappedPxX + 5;
          labelText.y = snappedPxY + pxH/2 - 5;

          if (this.onUpdateGameObjectOffset && (snappedGridX !== startGridX || snappedGridY !== startGridY)) {
            this.onUpdateGameObjectOffset(obj.id, snappedGridX, snappedGridY);
          }
        });

        this.mapsContainer.add([renderObj, labelText]);`;

if (content.includes(search)) {
   fs.writeFileSync('src/components/RpgSceneEditor.tsx', content.replace(search, replace));
   console.log('Patch success');
} else {
   console.log('Search text not found');
}
