# Asset credits

Every third-party asset here is **CC0 (public domain)**. No attribution is required, but we credit the creators with thanks anyway.
The designer models in `public/models/designer/` are the exception: original work, listed in the first row (details in the CREDITS.md next to them).

| Folder | Source | License |
|---|---|---|
| `../models/designer/*.glb` | Original models built in Blender for this project's sister app and reused here; no outside models or textures | Project-owned |
| `furniture-kenney`, `food-kenney`, `street-kenney` | Kenney — Furniture Kit, Food Kit, Retro Urban Kit (kenney.nl) | CC0 |
| `furniture-kaykit`, `restaurant-kaykit` | Kay Lousberg — KayKit Furniture Bits, Restaurant Bits | CC0 |
| `street-misc/umbrella-closed.glb`, `present.glb`, `streetlight-kay.glb` | Poly Pizza (CC0 entries only) | CC0 |
| `fx/clownfish.glb`, `fx/fish.glb` | Quaternius | CC0 |
| `textures/*`, `hdri/*` | Poly Haven — asphalt_02, dark_wooden_planks, grey_plaster_02, brown_floor_tiles, kloppenheim_04 | CC0 |

Characters, the neon sign, the chalkboard and the code-built stand-ins for the designer models are built in code (`src/world`).
Re-download the CC0 packs with `bash scripts/fetch-assets.sh public/assets` (the designer models are committed, not fetched).
