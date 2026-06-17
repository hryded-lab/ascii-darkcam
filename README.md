# Darkroom

Real-time ASCII camera that runs entirely in the browser. Works on desktop and mobile.

## Features

- 10 filters plus a custom glyph mode: Classic, Matrix, True Color, Blocks, Braille, Contour, Neon, Thermal, Amber CRT, Ink.
- Per-frame auto-levels and color washes so output stays readable in any lighting.
- Hand-gesture framing via MediaPipe: make a rectangle with two hands to apply a filter inside it. Pointer/touch brush as a fallback.
- Two portal modes: ASCII over live video, or live video inside an ASCII frame.
- Adjustable density, brightness, contrast, invert, and edge detection.
- Export to PNG, plain ASCII text, or WebM. Recent shots are saved locally in IndexedDB.

No backend and no uploads. The camera feed never leaves the device.

## Stack

Vite, React, TypeScript, Tailwind, Zustand, and @mediapipe/tasks-vision.

## Development

```bash
npm install
npm run dev      # http://localhost:5173 (camera requires localhost or https)
npm run build    # type-check and production build to dist/
npm run preview  # serve the build
```

## Deploy

Import the repo in Vercel. It auto-detects Vite (build `npm run build`, output `dist/`).
HTTPS is provided automatically, which the camera API requires.

## How it works

`src/ascii/engine.ts` downscales each frame to a small grid, maps per-cell luminance to a
character ramp, and paints glyphs to a canvas. A shared `MaskField` (`src/ascii/mask.ts`)
drives both the brush and the hand-tracked region, so the portal modes are per-cell alpha
compositing over the source video.
