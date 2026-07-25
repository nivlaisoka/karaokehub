# Karaoke Hub — Project Log

## Overview
Karaoke party app where hosts create rooms, guests queue songs from YouTube. Runs on http://50.0.0.20:3001.
Repo: https://github.com/nivlaisoka/karaokehub (main branch)

## Architecture
- **Backend**: Express + Socket.IO on port 3001, serves client static files
- **Client**: React + Vite + Tailwind, built with `npx vite build`
- **Server start**: `systemctl restart agz-videoke`
- **Client rebuild**: `cd /root/karaokehub/client && npx vite build`
- **Server logs**: `journalctl -u agz-videoke -n 30`
- **Systemd service**: `/etc/systemd/system/agz-videoke.service`

## Critical Decisions

### Search — Custom YouTube HTML Scraper (current)
File: `server/src/index.ts` — `searchYouTube()`
- Fetches `https://www.youtube.com/results?search_query=...` with browser User-Agent
- Extracts `ytInitialData` JSON from HTML via regex
- Parses videoRenderer entries for title, artist, duration, videoId
- Returns max 15 results
- No API key needed, no quota, no subscription, 0 dependencies

### Playback — yt-dlp Direct URL Proxy (current)
File: `server/src/index.ts` — `GET /api/video/url/:videoId`
File: `client/src/components/VideoPlayer.tsx`
- Installed: `pip3 install --break-system-packages yt-dlp`, `apt install ffmpeg`
- Backend runs `yt-dlp -f "best[height<=720][ext=mp4]/best[height<=720]" --get-url` to get YouTube CDN stream URL
- Cached in memory for 1 hour
- Frontend uses native `<video>` tag, fetches stream URL from backend
- Works for ALL videos regardless of embed restrictions (black screen fix)
- Zero quota, zero API calls, unlimited

### Fallback filtering — YouTube Data API (supplemental)
File: `server/src/index.ts` — `filterEmbeddable()`
- Uses API key: `AIzaSyCaAMuSunruC6zCXAv8kgVAHE8WH1w3BGk` (free, 10k/day quota)
- Filters non-embeddable videos from search results
- Not strictly needed anymore since VideoPlayer bypasses embed restrictions

## Previous Attempts (abandoned)
| Approach | Reason abandoned |
|----------|-----------------|
| **yt-search** npm package | Fragile parser, needed patching (trim error, item errors) |
| **@distube/ytdl-core** | Decipher errors on this server architecture |
| **Piped API** / **Invidious** | Network blocks, unreliable instances |
| **Vercel deployment** | WebSocket + mixed content unsolvable on free plan |

## Room & Socket.IO
- Rooms stored in-memory on server (maps of id/code, queue, guests, settings)
- Guests can add/vote songs, host controls playback
- No database — everything lost on server restart

## Removed Features
- Popout player button (redundant with VideoPlayer)
- Muted retry mechanism (VideoPlayer handles autoplay natively)

## Common Commands
```bash
systemctl restart agz-videoke    # Restart server
journalctl -u agz-videoke -n 30 # Check logs
cd /root/karaokehub/client && npx vite build  # Rebuild frontend
cd /root/karaokehub && npm run dev  # Dev mode
```
