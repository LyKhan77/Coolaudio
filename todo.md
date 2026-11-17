# todo.md

## Protocol (read first)

This file is the single source of truth for what is happening in the repo.

1. **Overwrite this whole file** whenever you start a new task. Do not append a second task below an old one. The previous task's result belongs in the "Last completed" line, nothing more.
2. Update it at every step change: tick a step, add a blocker, change the status. Edit the file immediately, not at the end.
3. Be explicit: name real files, real commands, and what you actually verified. No vague entries like "improve UI".
4. Before your final reply, make sure `Status`, the steps, and `Updated` are correct.
5. Keep the "Backlog" section in sync with decisions. Move an item into "Current task" when you start it.
6. Do not put backticks inside a shell heredoc or `node -e` string when writing this file; use the Write tool.

## Current task

- **Task:** Initialize git, update `.gitignore` (ignore `temp/`, `.playwright-mcp/`, `.vercel`, etc.), push to `https://github.com/LyKhan77/Coolaudio.git`, and deploy to Vercel with domain `coolaudio.vercel.app`
- **Status:** done
- **Updated:** 2026-11-17
- **Last completed:** GitHub push + Vercel production deploy. `https://github.com/LyKhan77/Coolaudio.git` (`main`, 80 tracked files; `temp/`, `node_modules/`, `dist/`, `public/ffmpeg/`, `.playwright-mcp/` excluded via `.gitignore`). Deployed to `https://coolaudio.vercel.app` (Vercel project `coolaudio`, `dpl_5no23kUX7g4Li92LCh279aJoTvpQ`, `READY`): verified HTTP 200 on `/`, `/sw.js` (`no-cache, no-store, must-revalidate`), `/manifest.webmanifest` (`no-cache`), and `/ffmpeg/ffmpeg-core.wasm` (`32232419` bytes, `application/wasm`, `max-age=31536000, immutable`).

### Steps

- [x] Update `.gitignore` to exclude `temp/`, `.playwright-mcp/`, `.vercel`, `*.log`, `.env*`, `Thumbs.db`
- [x] Initialize git repo, verify staged files (no `temp/`, `node_modules/`, `dist/`, `public/ffmpeg/`, `.playwright-mcp/`), commit, and push to `https://github.com/LyKhan77/Coolaudio.git`
- [x] Create/link Vercel project `coolaudio` and deploy production build (`coolaudio.vercel.app`)
- [x] Verify live `https://coolaudio.vercel.app` (HTTP 200, `sw.js` `no-cache`, `ffmpeg-core.wasm` `application/wasm` + `immutable`) and update `todo.md` (`Status: done`)

### Open follow-ups

- User mobile test on real iOS Safari / Android Chrome against live `https://coolaudio.vercel.app` (GIF progress, memory limits, Wake Lock, offline PWA install & 31 MB wasm cache persistence).
- Remaining open follow-ups: 2-column queue buttons on phones, revoking finished batch outputs to save memory, per-clip start time for batch GIF, calibrating 200/500 MB and 250 MB limits, Web Share API for iOS Photos, Compress quality toggle / two-pass.

## Backlog (recommended order)

1. ~~Compress to target size (MB)~~ (done and fixed)
2. ~~Video to GIF / WebP~~ (done; 2-pass GIF + informative progress added)
3. ~~Mobile pass~~ (done, real-device check pending)
4. ~~Batch convert~~ (done)
5. ~~PWA / offline cache~~ (done, desktop E2E verified; real-phone test pending)
6. ~~Hosting & deploy (Vercel)~~ (done: `https://coolaudio.vercel.app`)
7. **MCP for AI agents.** Local stdio package using native ffmpeg only; not a hosted server. Lowest priority.

## Decisions

- No YouTube/Spotify link input: legal risk for a public site, and it needs a backend that breaks the no-upload promise.
- Keep the single-threaded core by default; multi-thread core only if COOP/COEP is available on the host.
- Compress uses `ultrafast` for speed; revisit if quality complaints appear.
- Touch detection uses the `(pointer: coarse)` media query as a proxy for phones and tablets.
- Batch: 2 parallel workers on desktop, 1 on touch devices; `fflate` approved for ZIP.
- PWA SW uses separate cache buckets (`coolaudio-shell-<hash>`, `coolaudio-ffmpeg-v0.12.6`, `coolaudio-fonts-v1`) with `{ ignoreVary: true }`.
- GIF uses 2-pass `palettegen` (`fast_bilinear`) → `paletteuse` (`lanczos`) with `6–45%` / `45–98%` stage progress and heartbeat while `palettegen` runs.
- Hosting choice: Vercel (`https://coolaudio.vercel.app`).
