---
name: cache-bust-utf8-pitfall
description: How to bump the ?v=N cache-bust version without corrupting Cyrillic HTML
metadata:
  type: feedback
---

`index.html`, `privacy.html`, `product.html` are UTF-8 (no BOM) and full of Cyrillic. The mandatory `?v=N` cache-bust bump (see CLAUDE.md) is a frequent edit — do it with a UTF-8-explicit tool: the Edit tool, or Python (`io.open(f, encoding='utf-8')` read + write). 

**Do NOT** use PowerShell 5.1 `Get-Content`/`Set-Content` for this: `Get-Content` without `-Encoding` reads UTF-8 as the ANSI codepage and mangles every Cyrillic character into mojibake (`Поток` → `РџРѕС‚РѕРє`); `Set-Content -Encoding utf8` then also adds a BOM. This silently corrupts all on-page text.

**Why:** the bump touches files where the bytes that matter (Cyrillic) are exactly the bytes PS 5.1's default encoding misreads.

**How to apply:** bump versions via Edit/Python only. If corruption already happened and the file's sole intended change was the version bump, `git restore <file>` then redo the bump UTF-8-safely. Related: [[user-workflow]].
