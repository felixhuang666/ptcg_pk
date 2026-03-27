# Summary

**Problem**:
支援網頁語音輸入
在上方工具列, 新增語音輸入功能
`<input type="text" x-webkit-speech speech />`

**Original Branch Commit ID**: `591459b4fc9feb4bc14b5566fa79b1fa17fdecff`

**Root Cause**:
The app did not have a speech input field in the top toolbar to support voice input capabilities for users.

**Solution**:
Added `<input type="text" {...{'x-webkit-speech': 'true', speech: 'true'}} />` to the top right toolbar in `src/App.tsx`, providing a functional web speech input field to meet the user's requested specification.