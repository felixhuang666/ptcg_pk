# Summary: Add debug log for map editor

**TID**: 569
**Date**: 20260331-1919
**Category**: frontend
**Original Commit ID**: 43bd687c5b90259dc6f116578f4fa2ebc2c3ff04

## User Prompt

Objective:add debug log for map editor

when user select a tile element in left side bar, and draw to the map canvas, MUST use console.log to print debug message for id and position of map to draw.
I would like to debug why the ID mapping is incorrect when draw the selected element.

**Task information:
- TID: 569
- CHANGE_PREFIX: 20260331-1919
** Additional Instructions:** (ver 1.3.0)
- You don't need to ask me to review your design. Just proceed it, I will do final review when you submit the PR.
- prj_root_folder is the root folder of the project, you can use relative path from prj_root_folder to refer files in the project. You can also create new files in the project if needed.
- When your implementation is done, summarize solved issues to {prj_root_folder}/changes/{CHANGE_PREFIX}_{major_category}_{summary_in_one_line}_{date_time_str}_{TID}.md; CHANGE_PREFIX: if not input by user, use datetime in yyyyMMdd-HHmm; major_category: bot/UI/backend/frontend/DB, you can create new category; summary_in_one_line: should not have space or emoji; date_time_str: in yyyyMMdd-HHmm local time format; TID: in 8 digitals; use user's input if exist. If not input by user, use date_time_str or sessionid. You can create/update multiple md files for the same session. you MUST summary user's input prompt, original branch commit id, root cause and your solution into the md file as well.
- if changed DB related tables/schema, must have a db migration script (in {prj_root_folder}/scripts/migrate_{date_time_str}_xxxx.py) for user to upgrade old db to new db schema
- Check {prj_root_folder}/docs/*.md files for design docs relevance to this conversation and update the relevant documentation to reflect your design, bug fix, or new functions.
- If you need to write test code, put it into {prj_root_folder}/tmp folder and should delete it after completed your tasks.
- Clean up debug files or logs before submit PR.
- After submit the PR, ensure modified files are consistent with the PR and conversation. If not, update the PR.

## Root Cause

The user is experiencing incorrect ID mapping when drawing map tiles using the left sidebar in the map editor (`RpgMapEditor.tsx`) and requested additional console logs to assist in debugging the issue.

## Solution

Added a `console.log` statement to `handlePointerDown` inside `src/components/RpgMapEditor.tsx` when a tile is being drawn (within the map bounds). This prints the target ID (`targetVal`), the X and Y grid coordinates, the calculated 1D array index, and the target layer (`this.currentEditLayer`) to help identify any mapping calculation issues.
