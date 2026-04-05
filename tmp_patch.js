const fs = require('fs');

let fileContent = fs.readFileSync('src/components/RpgSceneEditor.tsx', 'utf8');

const helperFunc = `function getParsedMapList(mapListRaw: any): any[] {
  let list = mapListRaw;
  if (typeof list === 'string') {
    try { list = JSON.parse(list); } catch (e) { list = []; }
  }
  return Array.isArray(list) ? list : [];
}

export default function RpgSceneEditor`;

fileContent = fileContent.replace('export default function RpgSceneEditor', helperFunc);

fileContent = fileContent.replace(
`    let mapList = sceneData.map_list;
    if (typeof mapList === 'string') {
      try {
        mapList = JSON.parse(mapList);
      } catch (e) {
        console.error('Failed to parse map_list', e);
        mapList = [];
      }
    }

    if (!Array.isArray(mapList)) {
      console.warn('map_list is not an array', mapList);
      return;
    }`,
`    const mapList = getParsedMapList(sceneData.map_list);`
);

const onDropReplace = `                let currentList = sceneData.map_list;
                if (typeof currentList === 'string') {
                  try { currentList = JSON.parse(currentList); } catch (e) { currentList = []; }
                }
                if (!Array.isArray(currentList)) {
                  currentList = [];
                }`;
fileContent = fileContent.replace(onDropReplace, `                const currentList = getParsedMapList(sceneData.map_list);`);


const onUpdateXReplace = `                          let currentList = sceneData.map_list;
                          if (typeof currentList === 'string') {
                            try { currentList = JSON.parse(currentList); } catch (e) { currentList = []; }
                          }
                          if (!Array.isArray(currentList)) currentList = [];`;
fileContent = fileContent.replace(onUpdateXReplace, `                          const currentList = getParsedMapList(sceneData.map_list);`);


const onUpdateYReplace = `                          let currentList = sceneData.map_list;
                          if (typeof currentList === 'string') {
                            try { currentList = JSON.parse(currentList); } catch (e) { currentList = []; }
                          }
                          if (!Array.isArray(currentList)) currentList = [];`;
fileContent = fileContent.replace(onUpdateYReplace, `                          const currentList = getParsedMapList(sceneData.map_list);`);


const onRemoveReplace = `                        let currentList = sceneData.map_list;
                        if (typeof currentList === 'string') {
                          try { currentList = JSON.parse(currentList); } catch (e) { currentList = []; }
                        }
                        if (!Array.isArray(currentList)) currentList = [];`;
fileContent = fileContent.replace(onRemoveReplace, `                        const currentList = getParsedMapList(sceneData.map_list);`);

fs.writeFileSync('src/components/RpgSceneEditor.tsx', fileContent);
