---
name: lucide-svg-symbol-system
description: Zero-emoji, precision geometric SVG symbol system based on the open-source Lucide / Feather 24x24 architectural grid. Use whenever building or upgrading UI components, badges, buttons, logos, or navigation docks to eliminate generic Unicode emojis and AI-handwritten curves.
---

# Lucide Geometric SVG Symbol System (`window.SRSymbols`)

## Core Rules
1. **Zero Generic Emojis**: Never use Unicode emojis (`⚡`, `🔒`, `📍`, `📷`, `⚠️`, `📄`, `📊`, `📋`, `🪪`, `🟢`, `🟡`, `🔴`) in production UI templates.
2. **Zero Hand-Drawn / Organic Bezier Clutter**: All brand marks and icons must use strict mathematical geometry (true circles, octagons, 45°/90° vectors, and uniform `2px` or `2.2px` stroke weights on a `24x24` viewBox).
3. **Use `window.SRSymbols.<name>(size, color)`**: Call the global symbol registry in `lucide-symbols.js` for consistent, accessible inline SVGs across all dashboards.
