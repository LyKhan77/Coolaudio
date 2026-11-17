# Coolaudio · Local MP4 & MP3 Studio

Created by **Lee Khan**. A 100% client-side media studio built with **React**, **TypeScript**, **Tailwind CSS**, and **FFmpeg.wasm**. All video/audio trimming, transcoding, and ID3v2.3 tagging run locally in the browser—zero server uploads required.

## Tools Included

- **MP4 → MP3**: Extract MP3 audio from `.mp4`, `.m4v`, and `.mov` with trim controls, bitrate selection (`128 / 192 / 320 kbps`), and ID3v2.3 tags.
- **Trim MP4**: Cut `.mp4` / `.m4v` / `.mov` clips with either instant **Fast Copy** (`-c copy`) or **Accurate** (H.264 + AAC re-encode) mode.
- **Compress MP4**: Shrink a video to a target size in MB (presets 8 / 10 / 25 / 50 or custom) with H.264 + AAC. The result is approximate and usually lands at or under the target.
- **Video → GIF**: Turn a short clip (up to 30 s, default 15 s) into an animated **GIF** or **WebP** with selectable fps (`10 / 12 / 15`) and width (`320 / 480 / 640 px`, never upscaled).
- **Trim MP3**: Cut `.mp3` audio tracks with scrub preview, bitrate control, and ID3v2.3 metadata editing.
- **Audio → MP3**: Convert `.wav`, `.m4a`, `.ogg`, `.opus`, `.flac`, `.aac`, and `.webm` audio files into `.mp3`.

## Batch Convert

MP4 → MP3, Compress MP4, Video → GIF, and Audio → MP3 accept several files at once (up to 20). Pick or drop multiple files to open the batch queue:

- One shared set of settings for every file; the ID3 title comes from each file name.
- Each file shows its status, progress, and size before and after. Failed files can be retried and any file can be removed.
- Up to 2 files run in parallel on desktop (1 on phones and for files over 250 MB); each worker has its own FFmpeg instance.
- Download files one by one or **Download all (ZIP)**. Cancel stops the running files and puts them back in the queue.
- Trim MP4 and Trim MP3 stay single-file because they need a per-file time range.

## Creator

- **Lee Khan** — Founder & Creator. Built with a focus on privacy, client-side WebAssembly power, and Neo-Brutalist minimalist aesthetics.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons
- **Media Engine**: `@ffmpeg/ffmpeg` + `@ffmpeg/core` (WebAssembly, single-threaded)
- **Testing**: Vitest + React Testing Library

## Local Development

```bash
npm install
npm run dev
```

`npm install` automatically runs `scripts/copy-ffmpeg.mjs` via `postinstall` to copy `ffmpeg-core.js` and `ffmpeg-core.wasm` into `public/ffmpeg/`. `vite.config.ts` configures `host: true` and port `5155` for both `npm run dev` and `npm run preview`.

## Build & Test

```bash
npm test
npm run build
```

## Deploy (Vercel)

[`vercel.json`](vercel.json) is configured for Vercel static hosting (`dist/`):

- `npm ci` runs `postinstall` (`scripts/copy-ffmpeg.mjs`), then `npm run build` produces `dist/` including the 32.2 MB `ffmpeg-core.wasm`.
- `/sw.js` and `/manifest.webmanifest` are served with `Cache-Control: no-cache` so PWA updates take effect immediately.
- `/assets/*` and `/ffmpeg/*` (with `Content-Type: application/wasm` for `.wasm`) are served with `Cache-Control: public, max-age=31536000, immutable`.

## Offline & PWA

Coolaudio can be installed as a Progressive Web App and works offline after the first visit:

- `public/manifest.webmanifest`, `public/icon-192.png`, and `public/icon-512.png` provide install metadata and icons (`scripts/generate-icons.mjs`).
- `public/sw.js` (versioned at build time by `vite.config.ts`) caches the app shell (`coolaudio-shell-<hash>`), fonts (`coolaudio-fonts-v1`), and the 31 MB FFmpeg core (`coolaudio-ffmpeg-v0.12.6`) in separate cache buckets so UI updates do not re-download the core.
- New app versions wait until confirmed via the **UPDATE READY** banner (`RELOAD NOW` / `LATER`), disabled while a conversion is running.

## Roadmap

PWA offline cache is implemented. Next priorities (hosting, real-device verification, optional local MCP) live in [`todo.md`](todo.md).

## Known Limits

- Everything runs in the browser's memory (roughly 3-4x the input file size), so very large files can fail, especially on phones.
- The FFmpeg core is single-threaded and about 31 MB, so first load and re-encoding are slow on mobile. On iOS Safari, tight storage quotas may also prevent or evict large offline caches.
- Keep the tab open and in the foreground while a job runs. The app asks the browser to keep the screen awake during a job (Screen Wake Lock, where supported).
- A warning appears for files over about 200 MB on touch devices and 500 MB on desktop. If the browser runs out of memory, the app shows a clear message and restarts the engine.

Details for contributors and AI agents are in [`AGENTS.md`](AGENTS.md).

## Responsible Use

Process only files you own or have the right to use. Link ripping from streaming services (YouTube, Spotify, etc.) is intentionally not supported.
