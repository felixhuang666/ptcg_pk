import re

with open("src/components/RpgMode.tsx", "r") as f:
    content = f.read()

# The settings modal closes but the UI doesn't seem to render the Top Toolbar because it's behind other things or misaligned.
# Wait, the Top Toolbar is rendered when `mode === 'edit'` but inside `RpgMode`.
# Let's check `mode` state change in `RpgMode`.
# "切換至地圖編輯器" changes `setMode('edit')`.

# Let's make sure the Top Toolbar is visible:
content = content.replace("z-[2000] relative", "z-[5000] relative")

with open("src/components/RpgMode.tsx", "w") as f:
    f.write(content)
