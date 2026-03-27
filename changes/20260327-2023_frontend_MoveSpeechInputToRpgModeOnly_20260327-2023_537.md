# Summary

**Problem**:
在RPG MODE下 支援網頁語音輸入
在上方工具列, 新增語音輸入功能 `<input type="text" x-webkit-speech speech />`
要先檢查是否支援, 若不支持則不顯示
只在RPG MODE下, 支援網頁語音輸入
其他模式 或是 首頁都不顯示 也不支持

**Original Branch Commit ID**: `591459b4fc9feb4bc14b5566fa79b1fa17fdecff`

**Root Cause**:
Previously, the speech input feature was placed on the main landing page `src/App.tsx` and was visible to all modes without checking browser support, which did not meet the user's specific constraint of restricting it to only the RPG mode with browser feature detection.

**Solution**:
- Removed the speech input element from the main toolbar in `src/App.tsx`.
- Added the `<input type="text" {...{'x-webkit-speech': 'true', speech: 'true'}} />` element to the top toolbar in `src/components/RpgMode.tsx`.
- Implemented a `useEffect` hook in `RpgMode` to detect browser support using `('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)` and conditionally render the input field.