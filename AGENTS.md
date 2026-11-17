# AGENTS.md

Instructions for any AI agent working in this repo. Read this file and `todo.md` before doing anything.

## Project

Coolaudio: a 100% client-side media studio (MP4/MP3 convert and trim) built with React 19, TypeScript, Vite, Tailwind v4 and `@ffmpeg/ffmpeg` (single-threaded `@ffmpeg/core` 0.12.6). No server. Files never leave the browser; this is the main selling point and must not be broken.

## Commands

```bash
npm install        # postinstall copies ffmpeg-core.{js,wasm} to public/ffmpeg/
npm run dev
npm test           # vitest run
npm run build      # tsc -b && vite build
```

## Layout

- `src/App.tsx`: page state and wiring.
- `src/hooks/useMediaProcessor.ts`: owns the FFmpeg instance, runs one job at a time.
- `src/hooks/usePwaUpdate.ts` & `src/components/UpdateBanner.tsx`: service worker registration and reload prompt when a waiting update is ready.
- `public/sw.js`, `public/manifest.webmanifest`, `vite.config.ts`, `vercel.json`: PWA offline cache (`dist/sw.js` injected at build, excluding lazy `CreatorVoxel-`), Vite `host: true` / `port: 5155` for `server` and `preview`, and Vercel headers (`no-cache` for `/sw.js`, `immutable` + `application/wasm` for `/ffmpeg/*`).
- `src/lib/ffmpegArgs.ts`: builds ffmpeg CLI args per tool. Add new tools here.
- `src/lib/toolConfig.ts`: per-tool labels, accepted formats, output type.
- `src/components/`: UI. `src/types/converter.ts`: shared types.
- Tests live in `__tests__/` folders next to the code.

## Rules

1. **todo.md protocol (mandatory).** See the "Protocol" section in `todo.md`. Overwrite it whenever you start a new task and update it at every step change. Never leave it stale. Update it before your final reply.
2. Keep changes minimal. Reuse `ffmpegArgs.ts`, `toolConfig.ts` and existing components before adding new ones. No new dependency for a few lines of code.
3. Add or update a test for new logic (arg builders, size calculations, parsers). Run `npm test` and `npm run build` before claiming done.
4. Do not add a server, upload endpoint, analytics that sends file data, or any call that sends user media off-device.
5. Do not add YouTube, Spotify or any streaming-service link ripping. Legal risk for a public deployment (ToS, copyright, DRM circumvention). Only user-supplied local files.
6. Mobile-first: every UI change must work at 360px width with touch input. No hover-only controls. Touch targets at least 44px.
7. `public/ffmpeg/` is generated; do not commit or hand-edit it. `temp/` is scratch space.

## Hard constraints (design for these)

**Memory (biggest risk, worst on mobile)**
- One file is held several times in memory: `File` -> `fetchFile` bytes -> ffmpeg MEMFS -> `readFile` bytes -> output `Blob`. Budget roughly 3-4x the input size.
- WebAssembly hard cap is about 2 GB per instance. iOS Safari kills tabs far earlier (often a few hundred MB).
- Starting guess for file-size limits: warn above 500 MB on desktop and 200 MB on mobile. These are unverified; measure on real devices and update this file.
- Free memory aggressively: delete MEMFS files after each job, revoke object URLs.

**Speed**
- The core is single-threaded WebAssembly. Re-encoding (`libx264`) is slow, especially on phones, and phones thermal-throttle on long jobs. Prefer stream copy when the tool allows it.
- A backgrounded mobile tab is throttled or killed. Use the Screen Wake Lock API while a job runs and warn users to keep the tab open.
- The core wasm is about 31 MB. `public/sw.js` caches it in `coolaudio-ffmpeg-v0.12.6` (separate from the hashed `coolaudio-shell-<hash>` cache) so app-shell updates do not evict or re-download it. Warmup on install is non-fatal for tight iOS/mobile quotas.

**Parallel / batch**
- One `FFmpeg` instance runs one job. Parallel means several instances, each with its own wasm memory plus its own copy of the input.
- Concurrency (implemented in `batchConcurrency`, `src/lib/deviceLimits.ts`): 1 on touch devices or when any file is over 250 MB, otherwise `min(2, floor(navigator.hardwareConcurrency / 2))`. The pool (`runPool`, `src/lib/batchQueue.ts`) and the batch hook (`src/hooks/useBatchProcessor.ts`) own the instances; they are terminated after each batch to free wasm memory. Max 20 files per batch; finished outputs stay in memory until cleared.
- Per-file work lives in `src/lib/runMediaJob.ts` (used by both single and batch flows). Keep its progress guard: ffmpeg.wasm emits bogus ratios from the second run on.
- `@ffmpeg/core-mt` needs `SharedArrayBuffer`, which needs COOP/COEP headers. This breaks cross-origin embeds without CORP headers and depends on the host. Not enabled by default.
- Multi-output downloads: one ZIP via `fflate` (store-only, outputs are already compressed). The File System Access API folder output is not implemented (not on iOS).

**Features**
- Target size compression: bitrate = (targetMB x 8192 / duration) - audio bitrate, minus a 3-5% margin. Result is approximate, never exact. Warn when the target is infeasible. Two-pass doubles the time.
- GIF/WebP: size grows fast. Default to at most 15 s, 480 px wide, 10-12 fps. Use 2-pass `palettegen` (`fast_bilinear`) + `paletteuse` (`lanczos`) for GIF (`buildGifPaletteArgs` / `buildGifFromPaletteArgs` in `ffmpegArgs.ts`, fast-seeking with `-ss` before `-i` and `-an`), and report stage labels + heartbeat progress via `runMediaJob.ts` because `palettegen` takes ~40-60 s in single-threaded wasm without emitting `time=` logs. `libwebp` is present in the current core.
- MCP for agents: a hosted MCP server would require uploads, which contradicts the privacy promise. Only build it as a local stdio package using native ffmpeg, or via browser-side WebMCP. Lowest priority.

**Mobile UI / platform**
- iOS downloads from blob URLs land in Files; offer the Web Share API for saving to Photos where it helps.
- `.mov` and HEVC input from iPhones may not decode in the preview `<video>` element; the preview can fail even when ffmpeg can process the file.
- `CreatorVoxel` (three.js + 1.1 MB GLB) is heavy on phones. Lazy-load it and respect `prefers-reduced-motion`.

**Legal**
- Only process files the user supplies. Keep a short "use only content you own or are licensed to use" note on the public site.
