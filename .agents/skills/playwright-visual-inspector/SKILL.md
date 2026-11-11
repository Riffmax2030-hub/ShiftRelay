---
name: playwright-visual-inspector
description: Automated headless Chromium/Edge visual screenshot & UI inspection pipeline using Playwright. Use before and after every UI change so the engineering and design team can visually see every page and dashboard (Worker, Supervisor Dual-Mode, Executive, and Sign-In).
---

# Playwright Visual Screenshot & UI Inspector

## Workflow
1. Run `node scripts/capture-visuals.mjs` to capture full-page and viewport PNG screenshots of all active ShiftRelay dashboards (`http://localhost:4000`).
2. Screenshots are saved to `visuals/` in the workspace and copied to the conversation artifact directory so agents and the Executive Director can inspect them directly via `read_file` or markdown image carousels.
