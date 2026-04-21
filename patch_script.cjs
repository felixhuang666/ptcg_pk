const fs = require('fs');

let content = fs.readFileSync('src/components/GameObjectTemplateCreator.tsx', 'utf8');

content = content.replace(
  'default_controller: string;',
  'default_controller: string;\n  default_image?: string;'
);

content = content.replace(
  '  const [template, setTemplate] = useState<TemplateData | null>(null);',
  '  const [template, setTemplate] = useState<TemplateData | null>(null);\n\n  const [availableImages, setAvailableImages] = useState<string[]>([]);\n\n  useEffect(() => {\n    fetch(\'/api/game_obj_img\')\n      .then(res => res.json())\n      .then(data => setAvailableImages(data || [\'object_default.jpg\']))\n      .catch(() => setAvailableImages([\'object_default.jpg\']));\n  }, []);'
);

content = content.replace(
  'default_controller: \'StaticNpcController\'\n    };',
  'default_controller: \'StaticNpcController\',\n      default_image: \'object_default.jpg\'\n    };'
);

content = content.replace(
  '<label className="block text-slate-400 text-xs mb-1">Default Controller</label>\n                    <input type="text" value={template.default_controller} onChange={e => setTemplate({...template, default_controller: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm" />\n                  </div>\n                </div>',
  '<label className="block text-slate-400 text-xs mb-1">Default Controller</label>\n                    <input type="text" value={template.default_controller} onChange={e => setTemplate({...template, default_controller: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm" />\n                  </div>\n                  <div>\n                    <label className="block text-slate-400 text-xs mb-1">Default Image</label>\n                    <select \n                      value={template.default_image || \'\'} \n                      onChange={e => setTemplate({...template, default_image: e.target.value})} \n                      className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm"\n                    >\n                      <option value="">-- None --</option>\n                      {availableImages.map(img => (\n                        <option key={img} value={img}>{img}</option>\n                      ))}\n                    </select>\n                  </div>\n                </div>'
);

fs.writeFileSync('src/components/GameObjectTemplateCreator.tsx', content);
