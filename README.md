# Trú Mưa

A walkable 3D memory café, made by Phú for Su.

Su and Phú start on a rainy Saigon sidewalk in front of a café door. Inside the room are 27 real memories of the two of them, from the first bouquet on 13/06 to the Ecuador roses on 04/10. Walk up to one and open it to read its note.

## Flow

1. **Title.** A slow establishing shot of the café in the rain.
2. **Studio ("Hôm nay mặc gì nhỉ?").** Dress Su and Phú: dress, shirt and hair colours, the Hello Kitty bow, the firefly necklace and Phú's jacket. Choices persist across reloads.
3. **The door.** The couple spawns on the sidewalk. Walk up, open the door, step in.
4. **The room.** Walk around freely. Each memory glows until it has been opened; press `E` (or tap) to read it.

## Controls

|                               | Laptop                                 | Phone / tablet |
| ----------------------------- | -------------------------------------- | -------------- |
| Walk                          | `WASD` (Phú) · arrows (Su in 2-player) | joystick       |
| Look / zoom                   | drag · mouse wheel                     | drag           |
| Read a memory / open the door | `E` · `Enter`                          | **Tương tác**  |
| Hold hands                    | `R`                                    | **Nắm tay**    |
| Switch who leads              | `Q`                                    | **Đổi người**  |

## Stack

| Layer   | Choice                                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------------------- |
| Build   | Vite 5 + React 18 + TypeScript                                                                                |
| 3D      | three.js 0.170 via React Three Fiber, drei, postprocessing (bloom, vignette)                                  |
| Physics | Rapier (`@react-three/rapier`) kinematic character controller, so the couple slides along walls and furniture |
| State   | zustand with `persist` (looks and opened memories)                                                            |
| Tests   | Vitest (logic + content privacy guard) · Playwright (desktop + Pixel 7 flow with screenshots)                 |

```
src/
  content/memories.ts   the 27 memories (copy lives here, nowhere else)
  state/store.ts        phase, looks, seen memories (persisted)
  game/                 input actions, interactions registry, Couple (controller + camera)
  world/                World (street, facade, door, room, memory spots), Chibi, Prop, Rain, Details
  ui/Overlays.tsx       title, studio, HUD + joystick, memory card
```

## Develop

```bash
npm install
npm run dev          # http://localhost:5173
npm run verify       # typecheck, lint, format, unit tests, build
npm run test:e2e     # Playwright flow on desktop and mobile; screenshots in test-results/shots
```

Git hooks run through Husky:

| Hook       | Runs                   |
| ---------- | ---------------------- |
| pre-commit | lint-staged            |
| commit-msg | conventional commits   |
| pre-push   | typecheck + unit tests |

CI runs the same gates plus the e2e flow.

## Assets

All shipped assets are CC0. See `public/assets/CREDITS.md`, and run `bash scripts/fetch-assets.sh public/assets` to re-download them. The characters and the memory-specific props are built in code so every colour can be customized.

## Privacy

This repo is private. It never contains addresses, phone numbers or real photos, and a unit test fails the build if phone-like or address-like strings appear in the memory content.

Phu Nguyen — HCMC, VN
